// @ts-nocheck
import Docker from 'dockerode';
import { createDockerClient } from '../sandbox/docker-client.js';
import { randomUUID } from 'node:crypto';
import { assertStdioSandboxExecution } from '../../config/sandbox-policy.js';
import { canonicalSubmissionLanguage } from '../../../../submissions/application/submission-language.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StdInOutProbeSpec, StdInOutTestCase } from '../../core/domain/rubric/EvidenceMatcher';
import { executionFailureMessage, type ExecutionObserver } from './execution-events.js';

export interface StdInOutCaseResult {
  entryFile?: string;
  isHidden?: boolean;
  caseId: string;
  passed: boolean | null;
  compilationPassed?: boolean | null;
  stderr?: string;
  input: string;
  expected: string;
  actual: string;
  timedOut: boolean;
  executionMs: number;
}

export interface StdInOutResult {
  compilationPassed?: boolean | null;
  passed: boolean;
  confidence: number;
  totalCases: number;
  passedCases: number;
  caseResults: StdInOutCaseResult[];
}

/**
 * Language detection result used to auto-detect build/run commands.
 */
interface LanguageDetection {
  language: string;
  dockerImage: string;
  buildCommand: string;
  runCommand: string;
}

/**
 * Executes algorithm/console submissions by piping stdin and comparing stdout.
 * 
 * Each test case runs in an isolated Docker container with:
 * - Hard timeout (default 5s) per case to catch infinite loops
 * - Memory limit (256MB) to catch memory leaks  
 * - Proportional scoring: passed_cases / total_cases
 */
export class StdInOutProbeEngine {
  private docker: Docker;

  constructor() {
    this.docker = createDockerClient();
  }

  public async evaluateAsync(
    submissionPath: string,
    probeSpec: StdInOutProbeSpec,
    contextHint?: string,
    onEvent?: ExecutionObserver
  ): Promise<StdInOutResult> {
    if (!probeSpec.entryFile && probeSpec.testCases.some(test => test.entryFile)) {
      const groups = new Map<string, typeof probeSpec.testCases>();
      for (const test of probeSpec.testCases) {
        const key = test.entryFile || '';
        groups.set(key, [...(groups.get(key) || []), test]);
      }
      const results: StdInOutResult[] = [];
      for (const [entryFile, testCases] of groups) {
        onEvent?.({ stage: 2, status: 'started', message: '[Chấm từng câu] ' + (entryFile || 'Chương trình') + ': ' + testCases.length + ' testcase.' });
        const result = await this.evaluateAsync(submissionPath, { ...probeSpec, entryFile: entryFile || undefined, testCases: testCases.map(test => ({...test, entryFile: undefined})) }, contextHint, onEvent);
        results.push(result);
        onEvent?.({ stage: 2, status: 'info', message: '[Kết quả từng câu] ' + (entryFile || 'Chương trình') + ': ' + result.passedCases + '/' + result.totalCases + ' testcase đạt; tỷ lệ ' + (result.totalCases ? (100 * result.passedCases / result.totalCases).toFixed(2) : '0') + '%. Biên dịch: ' + (result.compilationPassed === true ? 'thành công' : result.compilationPassed === false ? 'thất bại' : 'chưa xác minh') + '.' });
      }
      const caseResults = results.flatMap(result => result.caseResults);
      const passedCases = caseResults.filter(test => test.passed).length;
      return { caseResults, passedCases, totalCases: caseResults.length, passed: caseResults.length > 0 && passedCases === caseResults.length, confidence: caseResults.length ? passedCases / caseResults.length : 0, compilationPassed: results.some(result => result.compilationPassed === false) ? false : results.every(result => result.compilationPassed === true) ? true : null };
    }
    let executionStarted = false;
    try {
    onEvent?.({ stage: 1, status: 'started', message: '[Runner console] Đang kiểm tra cấu hình và nhận diện trình biên dịch từ bài nộp.' });
    assertStdioSandboxExecution();
    // Auto-detect language if build/run commands not specified
    const detection = await this.detectLanguage(submissionPath, probeSpec.requiredLanguage);
    const dockerImage = detection.dockerImage;
    onEvent?.({ stage: 1, status: 'info', runtime: detection.language, message: `[Runtime console] Nhận diện: ${detection.language}; yêu cầu đề: ${probeSpec.requiredLanguage || 'không chỉ định'}; image: ${dockerImage}.` });
    onEvent?.({ stage: 1, status: 'info', message: '[Docker] Đang kiểm tra kết nối Engine trên máy chạy worker.' });
    await this.docker.ping();
    onEvent?.({ stage: 1, status: 'info', message: '[Docker] Engine đã phản hồi; đang chuẩn bị image thực thi.' });

    console.log(`[StdInOutProbe] Detected: ${detection.language} | Image: ${dockerImage}`);

    // Ensure Docker image exists
    await this.pullImage(dockerImage, onEvent);
    const imageInfo = await this.docker.getImage(dockerImage).inspect();
    onEvent?.({ stage: 1, status: 'completed', message: `[Docker] Image sẵn sàng: ${dockerImage}; ID: ${imageInfo.Id}.` });

    // Students often zip several problems into one submission. Discover every
    // runnable program, try the one matching this rule's problem number first,
    // and keep the best-scoring result. A single-program submission yields one
    // candidate and behaves exactly as before.
    const candidates = this.orderCandidatesByHint(
      await this.findProgramCandidates(submissionPath, detection),
      `${contextHint || ''} ${probeSpec.description || ''}`
    ).filter(candidate => !probeSpec.entryFile || candidate.label.replace(/\\/g, '/').split('/').pop()?.toLowerCase() === probeSpec.entryFile.toLowerCase()).slice(0, 8);
    if (!candidates.length) throw new Error('Không tìm thấy file chương trình được chỉ định: ' + probeSpec.entryFile);
    onEvent?.({ stage: 2, status: 'started', message: `[Kế hoạch kiểm thử] ${probeSpec.testCases.length} testcase; ${candidates.length} chương trình ứng viên; đối chiếu output theo chế độ của từng testcase.` });
    executionStarted = true;

    let best: StdInOutResult | null = null;
    let bestLabel = '';
    for (const candidate of candidates) {
      const buildCmd = probeSpec.buildCommand || candidate.buildCommand;
      const runCmd = probeSpec.runCommand || candidate.runCommand;
      onEvent?.({ stage: 2, status: 'info', message: `[Chương trình] ${candidate.label}; thư mục tương đối: ${candidate.projectDir}; build: ${buildCmd || '(không có bước biên dịch)'}; chạy: ${runCmd}.` });
      console.log(`[StdInOutProbe] Trying program "${candidate.label}" | Build: ${buildCmd} | Run: ${runCmd}`);

      const caseResults: StdInOutCaseResult[] = [];
      for (const testCase of probeSpec.testCases) {
        onEvent?.({ stage: 2, status: 'info', message: `[Test ${testCase.id}] ${testCase.isHidden ? 'Test ẩn' : 'Công khai'}; giới hạn chạy ${testCase.timeoutMs || 5000} ms; so khớp ${testCase.comparisonMode || 'chuẩn hóa'}; đang chuẩn bị thực thi.` });
        const result = await this.runTestCase(
          submissionPath,
          candidate.projectDir,
          testCase,
          buildCmd,
          runCmd,
          dockerImage,
          onEvent
        );
        result.entryFile = candidate.label;
        caseResults.push(result);
        onEvent?.({ stage: 2, status: result.passed === true ? 'info' : 'warning', message: `[Test ${testCase.id}] ${result.passed === null ? 'CHƯA CHẠY (biên dịch hoặc khởi động chưa hoàn tất)' : result.passed ? 'PASS' : 'FAIL'}; biên dịch: ${result.compilationPassed === true ? 'thành công' : result.compilationPassed === false ? 'thất bại' : 'không có kết quả riêng'}; ${result.executionMs} ms${result.timedOut ? '; vượt thời gian' : ''}.` });
        if (result.compilationPassed === false && result.stderr) onEvent?.({ stage: 2, status: 'warning', message: `[Chẩn đoán biên dịch ${testCase.id}] ${result.stderr.slice(0, 1200)}` });
        console.log(`[StdInOutProbe] Case ${testCase.id}: ${result.passed ? '✓ PASS' : '✗ FAIL'} (${result.executionMs}ms)${result.timedOut ? ' [TIMEOUT]' : ''}`);
      }

      const passedCases = caseResults.filter(r => r.passed).length;
      const totalCases = caseResults.length;
      const result: StdInOutResult = {
        compilationPassed: caseResults.some(r => r.compilationPassed === false) ? false : caseResults.some(r => r.compilationPassed === true) ? true : null,
        passed: totalCases > 0 && passedCases === totalCases,
        confidence: totalCases > 0 ? passedCases / totalCases : 0,
        totalCases,
        passedCases,
        caseResults
      };

      if (!best || result.passedCases > best.passedCases) { best = result; bestLabel = candidate.label; }
      if (result.passed) break; // all cases passed — no need to try other programs
    }

    const finalResult = best || { passed: false, confidence: 0, totalCases: 0, passedCases: 0, caseResults: [] };
    const executed = finalResult.caseResults.filter(test => typeof test.passed === 'boolean').length;
    onEvent?.({ stage: 2, status: finalResult.passed ? 'completed' : 'warning', message: `[Tổng kết testcase] Chương trình được chọn: ${bestLabel || '(không có)'}; ${finalResult.passedCases}/${executed} test đã chạy đạt yêu cầu; ${finalResult.totalCases - executed} test chưa chạy. Kết quả được lưu cùng báo cáo.` });
    return finalResult;
    } catch (error) {
      onEvent?.({ stage: executionStarted ? 2 : 1, status: 'failed', message: `[Runner] ${executionFailureMessage(error)}` });
      if (!executionStarted) onEvent?.({ stage: 2, status: 'skipped', message: '[Testcase] Không chạy vì môi trường thực thi chưa sẵn sàng. Không tạo kết quả Pass/Fail.' });
      throw error;
    }
  }

  /**
   * Discovers every runnable program inside the submission so multi-problem
   * zips (Problem1/, Problem2/, Cau1.py, Cau2.py, ...) can be graded per rule.
   */
  private async findProgramCandidates(
    submissionPath: string,
    detection: LanguageDetection
  ): Promise<Array<{ projectDir: string; buildCommand: string; runCommand: string; label: string }>> {
    const files = await this.listFilesRecursive(submissionPath);
    const rel = (f: string) => path.relative(submissionPath, f).replace(/\\/g, '/');
    const dirOf = (f: string) => {
      const d = path.dirname(rel(f));
      return d === '' || d === '.' ? '.' : d;
    };
    const candidates: Array<{ projectDir: string; buildCommand: string; runCommand: string; label: string }> = [];

    switch (detection.language) {
      case 'csharp': {
        for (const f of files.filter(f => f.endsWith('.csproj'))) {
          candidates.push({ projectDir: dirOf(f), buildCommand: detection.buildCommand, runCommand: detection.runCommand, label: rel(f) });
        }
        break;
      }
      case 'java': {
        const hasBuildTool = files.some(f => f.endsWith('pom.xml') || f.endsWith('build.gradle') || f.endsWith('build.gradle.kts'));
        if (!hasBuildTool) {
          for (const f of files.filter(f => f.endsWith('.java'))) {
            const content = await fs.readFile(f, 'utf8');
            if (content.includes('public static void main')) {
              candidates.push({
                projectDir: dirOf(f),
                buildCommand: detection.buildCommand,
                runCommand: `java -cp . ${path.basename(f, '.java')}`,
                label: rel(f)
              });
            }
          }
        }
        break;
      }
      case 'python': {
        for (const f of files.filter(f => f.endsWith('.py'))) {
          candidates.push({ projectDir: dirOf(f), buildCommand: '', runCommand: `python ${path.basename(f)}`, label: rel(f) });
        }
        break;
      }
      case 'c':
      case 'cpp': {
        for (const f of files.filter(f => detection.language === 'cpp' ? /\.(cpp|cc|cxx)$/.test(f.toLowerCase()) || f.endsWith('.C') : f.endsWith('.c'))) {
          const content = await fs.readFile(f, 'utf8');
          if (/\bmain\s*\(/.test(content)) {
            const base = path.basename(f);
            candidates.push({
              projectDir: dirOf(f),
              buildCommand: detection.language === 'c'
                ? `gcc -o solution '${base.replace(/'/g, "'\\''")}' -O2 -lm`
                : `g++ -o solution '${base.replace(/'/g, "'\\''")}' -std=c++17 -O2`,
              runCommand: './solution',
              label: rel(f)
            });
          }
        }
        break;
      }
      case 'nodejs': {
        for (const f of files.filter(f => f.endsWith('.js'))) {
          candidates.push({ projectDir: dirOf(f), buildCommand: '', runCommand: `node ${path.basename(f)}`, label: rel(f) });
        }
        break;
      }
    }

    if (candidates.length === 0) {
      const projectDir = await this.findProjectDir(submissionPath, detection.language);
      candidates.push({ projectDir, buildCommand: detection.buildCommand, runCommand: detection.runCommand, label: 'whole submission' });
    }
    return candidates;
  }

  /**
   * Orders program candidates so the one matching the rule's problem number
   * ("Problem 2", "Câu 2", "Bài 2", "Task B"...) is tried first.
   */
  private orderCandidatesByHint(
    candidates: Array<{ projectDir: string; buildCommand: string; runCommand: string; label: string }>,
    hint: string
  ): Array<{ projectDir: string; buildCommand: string; runCommand: string; label: string }> {
    const numMatch = hint.match(/(?:problem|c[aâ]u|b[aà]i|task|part|exercise|ex|p|q)\s*#?\s*(\d+)/i)
      || hint.match(/(\d+)/);
    if (!numMatch) return candidates;
    const n = numMatch[1];

    const score = (label: string) => {
      const l = label.toLowerCase();
      // "problem2", "cau_2", "bai 2", "p2", "q2", "2.py", "ex2/"...
      if (new RegExp(`(?:problem|cau|bai|task|part|exercise|ex|p|q)[ _-]?${n}(?:[^0-9]|$)`).test(l)) return 2;
      if (new RegExp(`(?:^|[^0-9])${n}(?:[^0-9]|$)`).test(l)) return 1;
      return 0;
    };
    return candidates
      .map((c, i) => ({ c, i, s: score(c.label) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map(x => x.c);
  }

  /**
   * Run a single test case in an isolated Docker container.
   */
  private async runTestCase(
    submissionPath: string,
    projectDir: string,
    testCase: StdInOutTestCase,
    buildCmd: string,
    runCmd: string,
    dockerImage: string,
    onEvent?: ExecutionObserver
  ): Promise<StdInOutCaseResult> {
    const timeoutMs = testCase.timeoutMs || 5000;
    const startTime = Date.now();
    const buildMarker = `__AITA_BUILD_${randomUUID()}__`;

    // Normalize input to handle both legacy literal '\\n' and real newlines, and escape single quotes for bash
    const encodedInput = Buffer.from(testCase.input.replace(/\r\n/g, '\n') + '\n').toString('base64');

    // Build the full command:
    // 1. Copy ALL source to writable /sandbox (some languages need to compile)
    // 2. cd into the project subdirectory (if nested)
    // 3. Build (if needed)
    // 4. Pipe stdin and run
    const setupCmd = projectDir === '.'
      ? `cp -R /app/. /sandbox/ && cd /sandbox`
      : `cp -R /app/. /sandbox/ && cd '/sandbox/${projectDir.replace(/'/g, "'\\''")}'`;
    const pipeCmd = `printf '%s' '${encodedInput}' | base64 -d | timeout ${Math.ceil(timeoutMs / 1000)} ${runCmd}`;
    const fullCmd = buildCmd
      ? `${setupCmd} && { ${buildCmd}; } >/tmp/aita-build.log 2>&1; build_status=$?; if [ "$build_status" -ne 0 ]; then cat /tmp/aita-build.log >&2; exit 45; fi; printf '${buildMarker}\\n' >&2; ${pipeCmd}`
      : `${setupCmd} && ${pipeCmd}`;

    const hostPath = submissionPath.replace(/\\/g, '/');

    let container: Docker.Container | null = null;
    let systemTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      container = await this.docker.createContainer({
        Image: dockerImage,
        Cmd: ["sh", "-c", fullCmd],
        WorkingDir: "/sandbox",
        User: '65534:65534',
        Env: ['HOME=/tmp', 'DOTNET_CLI_HOME=/tmp', 'DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1'],
        HostConfig: {
          Binds: [`${hostPath}:/app:ro`],
          Memory: 256 * 1024 * 1024, // 256MB
          CpuShares: 512,
          NetworkMode: "none",
          CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'], PidsLimit: 64,
          NanoCpus: 1000000000, ReadonlyRootfs: true,
          Tmpfs: { '/sandbox': 'rw,exec,nosuid,size=134217728,mode=1777', '/tmp': 'rw,nosuid,size=67108864,mode=1777' }
        },
        AttachStdout: true,
        AttachStderr: true,
      });

      if (onEvent) {
        const actualConfig = await container.inspect();
        const limits = actualConfig.HostConfig;
        onEvent({ stage: 1, status: 'info', message: `[Container ${testCase.id}] Đã tạo ${container.id}; image ${dockerImage}; RAM ${limits.Memory / 1024 / 1024} MiB; CPU ${limits.NanoCpus / 1e9} core; tối đa ${limits.PidsLimit} PID; mạng: ${limits.NetworkMode}; root chỉ đọc: ${limits.ReadonlyRootfs ? 'có' : 'không'}; nguồn chỉ đọc: ${limits.Binds?.some(bind => bind.endsWith(':/app:ro')) ? 'có' : 'không'}; user ${actualConfig.Config.User}.` });
      }

      await container.start();
      onEvent?.({ stage: 2, status: 'info', message: `[Thực thi ${testCase.id}] Container đã khởi động; ${buildCmd ? 'biên dịch rồi ' : ''}chạy chương trình với stdin đã cấu hình.` });

      // Wait for completion with timeout
      const waitPromise = container.wait();
      // System Timeout: Give plenty of time (20s) for compilation/docker overhead.
      // The actual execution timeout is handled by the `timeout` bash command inside the container.
      const timeoutPromise = new Promise<{ StatusCode: number }>((_, reject) =>
        systemTimer = setTimeout(() => reject(new Error('SYSTEM_TIMEOUT')), timeoutMs + 20000)
      );

      let statusCode = -1;
      let timedOut = false;
      let systemError = false;
      try {
        const result = await Promise.race([waitPromise, timeoutPromise]);
        statusCode = result.StatusCode;
        // 124 is the standard exit code for the 'timeout' command in bash/alpine
        if (statusCode === 124) {
          timedOut = true;
        }
      } catch (e: any) {
        if (e.message === 'SYSTEM_TIMEOUT') {
          // The container hung during setup or build, far exceeding expected overhead
          systemError = true;
        }
      }

      // Capture stdout and stderr
      let stdout = '';
      let stderr = '';
      if (!timedOut) {
        try {
          const logs = await container.logs({ stdout: true, stderr: true, timestamps: false });
          const data = Buffer.isBuffer(logs) ? logs : Buffer.from(logs);
          let offset = 0;
          while (offset + 8 <= data.length) {
            const length = data.readUInt32BE(offset + 4);
            const chunk = data.subarray(offset + 8, offset + 8 + length).toString('utf8');
            if (data[offset] === 1) stdout += chunk;
            else if (data[offset] === 2) stderr += chunk;
            offset += 8 + length;
          }
        } catch (e: any) {
          console.error('[StdInOutProbeEngine] Error fetching logs:', e);
        }
      }

      const executionMs = Date.now() - startTime;
      const actual = stdout.trim();
      const expected = testCase.expectedOutput.trim();
      const compilationPassed = buildCmd ? (stderr.includes(buildMarker) ? true : systemError ? null : false) : null;
      const exact = (value: string) => value.replace(/\r\n/g, '\n').replace(/\n$/, '');
      const passed = buildCmd && compilationPassed !== true ? null : statusCode === 0 && !timedOut && !systemError && (testCase.comparisonMode === 'exact' ? exact(stdout) === exact(testCase.expectedOutput) : this.compareOutput(actual, expected));

      let actualOutputStr = actual;
      if (timedOut) {
          actualOutputStr = '[TIMEOUT - possible infinite loop]';
      } else if (systemError) {
          actualOutputStr = '[SYSTEM TIMEOUT - build or startup took too long]';
      }

      return {
        isHidden: testCase.isHidden === true,
        compilationPassed, stderr: stderr.replace(buildMarker, '').trim().slice(0, 8000),
        caseId: testCase.id,
        passed,
        input: testCase.input.trim(),
        expected,
        actual: actualOutputStr,
        timedOut: timedOut || systemError,
        executionMs
      };
    } catch (error: any) {
      throw new Error(`STDIO_RUNNER_ERROR: ${error.message}`);
    } finally {
      if (systemTimer) clearTimeout(systemTimer);
      if (container) {
        try {
          await container.remove({ force: true });
          onEvent?.({ stage: 1, status: 'info', message: `[Dọn dẹp ${testCase.id}] Đã xóa container ${container.id} của testcase.` });
        } catch (e) {
          onEvent?.({ stage: 1, status: 'warning', message: `[Dọn dẹp ${testCase.id}] Chưa xác nhận xóa được container ${container.id}; cần kiểm tra Docker Engine.` });
        }
      }
    }
  }

  /**
   * Compare actual vs expected output with whitespace normalization.
   * - Trims leading/trailing whitespace
   * - Normalizes line endings (\r\n → \n)
   * - Compares line-by-line first; falls back to a judge-style token
   *   comparison (whitespace-insensitive, numeric-aware) so spacing or
   *   line-wrap differences don't fail a correct answer.
   */
  private compareOutput(actual: string, expected: string): boolean {
    const norm = (s: string) => s.replace(/\r\n/g, '\n').trim();
    const a = norm(actual);
    const e = norm(expected);

    const actualLines = a.split('\n').map(l => l.trim());
    const expectedLines = e.split('\n').map(l => l.trim());
    if (actualLines.length === expectedLines.length
        && actualLines.every((line, i) => line === expectedLines[i])) {
      return true;
    }

    const tokens = (s: string) => s.split(/\s+/).filter(Boolean);
    const actualTokens = tokens(a);
    const expectedTokens = tokens(e);
    if (actualTokens.length !== expectedTokens.length) return false;
    return actualTokens.every((t, i) => {
      if (t === expectedTokens[i]) return true;
      const na = Number(t);
      const ne = Number(expectedTokens[i]);
      if (Number.isFinite(na) && Number.isFinite(ne)) {
        return Math.abs(na - ne) <= 1e-6 * Math.max(1, Math.abs(ne));
      }
      return false;
    });
  }

  /**
   * Properly demultiplex Docker's log stream instead of regex-stripping bytes.
   * Each frame is [type, 0, 0, 0, size(uint32 BE)] + payload; the size bytes are
   * often printable characters (any output >= 32 bytes), so stripping control
   * characters leaks junk into the captured output and corrupts the comparison.
   * Only stdout frames (type 1) are kept — stderr noise must not fail a case.
   */
  private demuxDockerLogs(raw: Buffer): string {
    let out = '';
    let i = 0;
    while (i + 8 <= raw.length) {
      const type = raw[i];
      const size = raw.readUInt32BE(i + 4);
      if (type !== 0 && type !== 1 && type !== 2) break; // not a framed stream
      if (type === 1) out += raw.subarray(i + 8, i + 8 + size).toString('utf-8');
      i += 8 + size;
    }
    // Fallback for TTY/raw streams that carry no frame headers
    if (out === '' && raw.length > 0 && raw[0] !== 0 && raw[0] !== 1 && raw[0] !== 2) {
      return raw.toString('utf-8');
    }
    return out;
  }

  /**
   * Auto-detect programming language from file extensions in submission.
   */
  private async detectLanguage(submissionPath: string, requiredLanguage?: string): Promise<LanguageDetection> {
    const declared = canonicalSubmissionLanguage(requiredLanguage);
    const allowedExtensions: Record<string, string[]> = { C: ['.c'], 'C++': ['.cpp', '.cc', '.cxx', '.C'], Java: ['.java'], Python: ['.py'], 'C#': ['.cs', '.csproj'], Kotlin: ['.kt'], Go: ['.go'], Rust: ['.rs'], JavaScript: ['.js', '.jsx'], TypeScript: ['.ts', '.tsx'] };
    const projectFiles: Record<string, string[]> = { Java: ['pom.xml', 'build.gradle', 'build.gradle.kts'], Go: ['go.mod'], Rust: ['Cargo.toml'] };
    const files = (await this.listFilesRecursive(submissionPath)).filter(file => !declared || !allowedExtensions[declared] || allowedExtensions[declared].includes(file.endsWith('.C') ? '.C' : path.extname(file).toLowerCase()) || (projectFiles[declared] || []).includes(path.basename(file)));
    const extensions = files.map(f => path.extname(f).toLowerCase());

    // Check for .csproj (C#)
    if (files.some(f => f.endsWith('.csproj'))) {
      return {
        language: 'csharp',
        dockerImage: 'mcr.microsoft.com/dotnet/sdk:8.0',
        buildCommand: 'dotnet build -c Release --nologo -v q',
        runCommand: 'dotnet run --no-build -c Release --nologo'
      };
    }

    // Check for pom.xml (Java Maven)
    if (files.some(f => f.endsWith('pom.xml'))) {
      return {
        language: 'java',
        dockerImage: 'maven:3.9-eclipse-temurin-21',
        buildCommand: 'mvn compile -q',
        runCommand: 'java -cp target/classes Main'
      };
    }
    // Check for build.gradle (Java Gradle)
    if (files.some(f => f.endsWith('build.gradle') || f.endsWith('build.gradle.kts'))) {
      return {
        language: 'java',
        dockerImage: 'gradle:8-jdk21',
        buildCommand: 'gradle build -q',
        runCommand: 'java -cp build/classes/java/main Main'
      };
    }
    // Check for standalone Java files
    if (files.some(f => f.endsWith('.java'))) {
      const javaFiles = files.filter(f => f.endsWith('.java'));
      let mainFile = javaFiles.find(f => path.basename(f).toLowerCase() === 'main.java' || path.basename(f).toLowerCase() === 'program.java');
      
      if (!mainFile) {
        for (const file of javaFiles) {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes('public static void main')) {
            mainFile = file;
            break;
          }
        }
      }
      
      if (!mainFile) mainFile = javaFiles[0];

      const className = path.basename(mainFile, '.java');
      return {
        language: 'java',
        dockerImage: 'eclipse-temurin:21',
        buildCommand: `find . -name "*.java" > sources.txt && javac -d . @sources.txt`,
        runCommand: `java -cp . ${className}`
      };
    }

    // Check for Kotlin (.kt)
    if (extensions.includes('.kt')) {
      const mainFile = files.find(f => f.endsWith('.kt')) || 'Main.kt';
      const baseName = path.basename(mainFile, '.kt');
      return {
        language: 'kotlin',
        dockerImage: 'zenika/kotlin:1.9',
        buildCommand: `kotlinc ${path.basename(mainFile)} -include-runtime -d solution.jar`,
        runCommand: 'java -jar solution.jar'
      };
    }

    // Check for Go (.go)
    if (extensions.includes('.go') || files.some(f => f.endsWith('go.mod'))) {
      return {
        language: 'golang',
        dockerImage: 'golang:1.22-alpine',
        buildCommand: 'go build -o solution .',
        runCommand: './solution'
      };
    }

    // Check for Rust (.rs)
    if (extensions.includes('.rs') || files.some(f => f.endsWith('Cargo.toml'))) {
      return {
        language: 'rust',
        dockerImage: 'rust:1.78-slim',
        buildCommand: files.some(f => f.endsWith('Cargo.toml'))
          ? 'cargo build --release 2>/dev/null && cp target/release/* ./solution 2>/dev/null || true'
          : 'rustc -o solution main.rs',
        runCommand: files.some(f => f.endsWith('Cargo.toml'))
          ? 'cargo run --release --quiet'
          : './solution'
      };
    }

    // Check for Python
    if (extensions.includes('.py')) {
      const pyFiles = files.filter(f => f.endsWith('.py'));
      let mainFile = pyFiles.find(f => f.endsWith('main.py')) || 'main.py';
      
      // Look for if __name__ == "__main__"
      for (const file of pyFiles) {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes('__name__') && content.includes('__main__')) {
              mainFile = file;
              break;
          }
      }

      return {
        language: 'python',
        dockerImage: 'python:3.12-slim',
        buildCommand: '',
        runCommand: `python ${path.basename(mainFile)}`
      };
    }

    // Check for Ruby (.rb)
    if (extensions.includes('.rb')) {
      const mainFile = files.find(f => f.endsWith('main.rb')) || files.find(f => f.endsWith('.rb')) || 'main.rb';
      return {
        language: 'ruby',
        dockerImage: 'ruby:3.3-slim',
        buildCommand: '',
        runCommand: `ruby ${path.basename(mainFile)}`
      };
    }

    // Check for PHP (.php)
    if (extensions.includes('.php')) {
      const mainFile = files.find(f => f.endsWith('main.php')) || files.find(f => f.endsWith('index.php')) || files.find(f => f.endsWith('.php')) || 'main.php';
      return {
        language: 'php',
        dockerImage: 'php:8.3-cli',
        buildCommand: '',
        runCommand: `php ${path.basename(mainFile)}`
      };
    }

    // Check for C++ (.cpp, .cc, .cxx)
    if (extensions.some(e => ['.cpp', '.cc', '.cxx', '.c'].includes(e))) {
      const isC = declared !== 'C++' && extensions.includes('.c') && !extensions.some(e => ['.cpp', '.cc', '.cxx'].includes(e));
      return {
        language: isC ? 'c' : 'cpp',
        dockerImage: 'gcc:13',
        buildCommand: isC
          ? `gcc -o solution $(find . -name "*.c") -O2 -lm`
          : `g++ -o solution $(find . -name "*.cpp" -o -name "*.cc" -o -name "*.cxx" -o -name "*.c") -std=c++17 -O2`,
        runCommand: './solution'
      };
    }

    // Check for Node.js (JavaScript)
    if (files.some(f => f.endsWith('package.json')) || extensions.includes('.js')) {
      const mainFile = files.find(f => f.endsWith('index.js')) || files.find(f => f.endsWith('.js')) || 'index.js';
      return {
        language: 'nodejs',
        dockerImage: 'node:20-slim',
        buildCommand: '',
        runCommand: `node ${path.basename(mainFile)}`
      };
    }

    // Check for TypeScript (.ts) — separate from JS to handle compilation
    if (extensions.includes('.ts')) {
      const mainFile = files.find(f => f.endsWith('index.ts')) || files.find(f => f.endsWith('.ts')) || 'index.ts';
      return {
        language: 'typescript',
        dockerImage: 'node:20-slim',
        buildCommand: 'npx -y typescript tsc --esModuleInterop --outDir ./dist *.ts',
        runCommand: `node dist/${path.basename(mainFile, '.ts')}.js`
      };
    }

    // Default fallback — assume C# console app
    return {
      language: 'csharp',
      dockerImage: 'mcr.microsoft.com/dotnet/sdk:8.0',
      buildCommand: 'dotnet build -c Release --nologo -v q',
      runCommand: 'dotnet run --no-build -c Release --nologo'
    };
  }

  /**
   * Find the project subdirectory relative to submission root.
   */
  private async findProjectDir(submissionPath: string, language: string): Promise<string> {
    const files = await this.listFilesRecursive(submissionPath);
    let targetFile: string | undefined;

    switch (language) {
      case 'csharp':
        targetFile = files.find(f => f.endsWith('.csproj'));
        break;
      case 'nodejs':
      case 'typescript':
        targetFile = files.find(f => f.endsWith('package.json')) || files.find(f => f.endsWith('index.js')) || files.find(f => f.endsWith('index.ts')) || files.find(f => f.endsWith('.js')) || files.find(f => f.endsWith('.ts'));
        break;
      case 'python':
        targetFile = files.find(f => f.endsWith('main.py')) || files.find(f => f.endsWith('.py'));
        break;
      case 'java':
        targetFile = files.find(f => f.endsWith('pom.xml')) || files.find(f => f.endsWith('build.gradle')) || files.find(f => f.endsWith('.java'));
        break;
      case 'kotlin':
        targetFile = files.find(f => f.endsWith('.kt'));
        break;
      case 'golang':
        targetFile = files.find(f => f.endsWith('go.mod')) || files.find(f => f.endsWith('.go'));
        break;
      case 'rust':
        targetFile = files.find(f => f.endsWith('Cargo.toml')) || files.find(f => f.endsWith('.rs'));
        break;
      case 'ruby':
        targetFile = files.find(f => f.endsWith('.rb'));
        break;
      case 'php':
        targetFile = files.find(f => f.endsWith('.php'));
        break;
      case 'c':
      case 'cpp':
        targetFile = files.find(f => /\.(cpp|cc|cxx|c)$/.test(f));
        break;
    }

    if (targetFile) {
      const rel = path.relative(submissionPath, path.dirname(targetFile));
      return rel ? rel.replace(/\\/g, '/') : '.';
    }
    
    return '.';
  }

  private async listFilesRecursive(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['bin', 'obj', 'node_modules', '.git', '__pycache__'].includes(entry.name)) continue;
        results.push(...await this.listFilesRecursive(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }

  private async pullImage(imageName: string, onEvent?: ExecutionObserver): Promise<void> {
    const docker = this.docker;
    try {
      await docker.getImage(imageName).inspect();
      onEvent?.({ stage: 1, status: 'info', message: `[Docker image] Đã tìm thấy ${imageName} trên worker; sử dụng image cục bộ.` });
      return;
    } catch (error: any) {
      if (error.statusCode !== 404) throw error;
    }
    onEvent?.({ stage: 1, status: 'info', message: `[Docker image] Worker chưa có ${imageName}; đang tải image từ registry.` });
    return new Promise((resolve, reject) => {
      docker.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream,
          (err: any) => err ? reject(err) : resolve(),
          () => {} // onProgress — silent
        );
      });
    });
  }
}

