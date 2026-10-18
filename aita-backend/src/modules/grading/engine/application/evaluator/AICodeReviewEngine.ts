// @ts-nocheck
import OpenAI from 'openai';
import { config } from '../../config';
import { AiClientManager } from '../../infrastructure/ai/AiClientManager';
import * as crypto from 'crypto';
import { resolveCodeReviewResult } from './source-evidence.js';

export interface ProjectSourceSnapshot {
  projectType: string;
  files: Array<{
    relativePath: string;
    content: string;
  }>;
}

export interface CodeReviewResult {
  passed: boolean;
  confidence: number;
  reasoning: string;
  /** 0.0 to 1.0 — proportion of sub-requirements met (e.g. 3/4 APIs = 0.75) */
  percentageComplete: number;
  relevantSnippets?: Array<{
    codeSnippet: string;
    filePath: string;
    explanation: string;
  }>;
  relevantFiles: string[];
}

/**
 * Per-language file scoring weights for intelligent file selection.
 * These boost high-value files to the top of the context window.
 */
const LANGUAGE_SCORING: Record<string, Array<{ pattern: string, score: number }>> = {
  dart: [
    { pattern: 'main.dart', score: 20 },
    { pattern: 'viewmodel', score: 15 }, { pattern: 'view_model', score: 15 },
    { pattern: 'repository', score: 15 },
    { pattern: 'service', score: 10 }, { pattern: 'api_service', score: 15 },
    { pattern: 'screen', score: 10 }, { pattern: 'widget', score: 5 },
    { pattern: 'model', score: 10 },
    { pattern: 'pubspec.yaml', score: 20 },
    { pattern: 'bloc', score: 15 }, { pattern: 'cubit', score: 15 },
    { pattern: 'provider', score: 10 },
  ],
  csharp: [
    { pattern: 'program.cs', score: 20 }, { pattern: 'startup.cs', score: 20 },
    { pattern: 'dbcontext', score: 20 }, { pattern: 'context', score: 10 },
    { pattern: 'controller', score: 15 },
    { pattern: 'service', score: 10 }, { pattern: 'repository', score: 10 },
    { pattern: '.csproj', score: 15 },
    { pattern: '.razor', score: 5 },
  ],
  java: [
    { pattern: 'solution', score: 25 }, { pattern: 'main', score: 15 }, { pattern: 'application', score: 15 },
    { pattern: 'q1', score: 20 }, { pattern: 'q2', score: 20 }, { pattern: 'q3', score: 20 }, { pattern: 'q4', score: 20 }, { pattern: 'q5', score: 20 },
    { pattern: 'q6', score: 20 }, { pattern: 'q7', score: 20 }, { pattern: 'q8', score: 20 }, { pattern: 'q9', score: 20 }, { pattern: 'q10', score: 20 },
    { pattern: 'controller', score: 15 }, { pattern: 'restcontroller', score: 15 },
    { pattern: 'service', score: 15 }, { pattern: 'serviceimpl', score: 15 },
    { pattern: 'repository', score: 15 }, { pattern: 'dao', score: 15 },
    { pattern: 'entity', score: 10 }, { pattern: 'model', score: 10 },
    { pattern: 'dto', score: 8 }, { pattern: 'mapper', score: 5 },
    { pattern: 'pom.xml', score: 20 }, { pattern: 'build.gradle', score: 20 },
    { pattern: 'application.properties', score: 10 }, { pattern: 'application.yml', score: 10 },
  ],
  kotlin: [
    { pattern: 'mainactivity', score: 20 }, { pattern: 'application', score: 15 },
    { pattern: 'viewmodel', score: 15 }, { pattern: 'repository', score: 15 },
    { pattern: 'fragment', score: 10 }, { pattern: 'adapter', score: 8 },
    { pattern: 'build.gradle', score: 20 },
  ],
  python: [
    { pattern: 'main.py', score: 20 }, { pattern: 'app.py', score: 20 },
    { pattern: 'views.py', score: 15 }, { pattern: 'urls.py', score: 15 },
    { pattern: 'models.py', score: 15 }, { pattern: 'serializers.py', score: 10 },
    { pattern: 'settings.py', score: 10 },
    { pattern: 'requirements.txt', score: 15 }, { pattern: 'pyproject.toml', score: 15 },
  ],
  golang: [
    { pattern: 'main.go', score: 20 },
    { pattern: 'handler', score: 15 }, { pattern: 'router', score: 15 },
    { pattern: 'service', score: 10 }, { pattern: 'repository', score: 10 },
    { pattern: 'go.mod', score: 20 },
  ],
  rust: [
    { pattern: 'main.rs', score: 20 }, { pattern: 'lib.rs', score: 15 },
    { pattern: 'handler', score: 10 }, { pattern: 'model', score: 10 },
    { pattern: 'cargo.toml', score: 20 },
  ],
  typescript: [
    { pattern: 'index.ts', score: 15 }, { pattern: 'app.ts', score: 15 },
    { pattern: 'controller', score: 15 }, { pattern: 'service', score: 10 },
    { pattern: 'route', score: 10 }, { pattern: 'middleware', score: 8 },
    { pattern: 'package.json', score: 20 }, { pattern: 'tsconfig', score: 5 },
  ],
  javascript: [
    { pattern: 'index.js', score: 15 }, { pattern: 'app.js', score: 15 },
    { pattern: 'server.js', score: 15 },
    { pattern: 'controller', score: 12 }, { pattern: 'route', score: 10 },
    { pattern: 'package.json', score: 20 },
  ],
  php: [
    { pattern: 'index.php', score: 15 }, { pattern: 'controller', score: 15 },
    { pattern: 'model', score: 10 }, { pattern: 'route', score: 10 },
    { pattern: 'composer.json', score: 20 },
  ],
  ruby: [
    { pattern: 'application_controller', score: 15 }, { pattern: 'controller', score: 12 },
    { pattern: 'model', score: 10 }, { pattern: 'route', score: 10 },
    { pattern: 'gemfile', score: 20 },
  ],
  cpp: [
    { pattern: 'main.cpp', score: 20 }, { pattern: 'main.c', score: 20 },
    { pattern: '.h', score: 5 }, { pattern: 'makefile', score: 15 },
    { pattern: 'cmakelists', score: 15 },
  ],
};

export class AICodeReviewEngine {
  constructor() {
    // Client initialized via AiClientManager
  }

  public async evaluateAsync(
    snapshot: ProjectSourceSnapshot,
    semanticDescription: string,
    ruleTitle: string,
    crashLogs?: string,
    runtimeTestSummary?: string
  ): Promise<CodeReviewResult> {
    if (!snapshot.files || snapshot.files.length === 0) {
      return {
        passed: false,
        confidence: 1.0,
        percentageComplete: 0.0,
        reasoning: "Hệ thống không tìm thấy bất kỳ mã nguồn nào để chấm điểm. Vui lòng kiểm tra lại cấu trúc thư mục nộp bài (thiếu thư mục lib, src...).",
        relevantFiles: []
      };
    }

    const relevantFiles = this.selectRelevantFiles(snapshot.files, semanticDescription);
    const maxContextLengths = [80000, 40000, 20000];
    let attempt = 0;
    let lastError: any = null;

    for (const MAX_CONTEXT_LENGTH of maxContextLengths) {
      attempt++;
      let filesContext = "";

      for (const f of relevantFiles) {
        const numberedSource = f.content.split(/\r?\n/).map((line, index) => `[L${index + 1}] ${line}`).join("\n");
        const fileStr = `// FILE: ${f.relativePath}\n${numberedSource}\n\n---\n\n`;
        if (filesContext.length + fileStr.length > MAX_CONTEXT_LENGTH) {
          if (filesContext.length === 0) {
            filesContext = fileStr.substring(0, MAX_CONTEXT_LENGTH) + "\n\n... [CONTENT TRUNCATED DUE TO SIZE LIMIT]";
          } else {
            filesContext += `// [Skipped remaining files due to context size limit...]`;
          }
          break;
        }
        filesContext += fileStr;
      }

      const isArchitectural = ['architecture', 'repository', 'dependency injection', 'clean architecture', 'layered', 'mvc']
        .some(kw => (ruleTitle + ' ' + semanticDescription).toLowerCase().includes(kw));

      const isDatabase = ['database', 'entity framework', 'dbcontext', 'schema', 'tables', 'migration', 'models']
        .some(kw => (ruleTitle + ' ' + semanticDescription).toLowerCase().includes(kw));

      let scopeRule = "";
      if (isArchitectural) {
        scopeRule = `7. ARCHITECTURAL PRAGMATISM: This criterion enforces structural patterns (e.g., Repository Pattern, Dependency Injection, MVVM). Evaluate based on general adherence to the pattern. DO NOT penalize standard practices such as injecting an ApiService into a Repository, or a Repository into a ViewModel. Focus on whether the logical separation of concerns exists, not pedagogical perfection.`;
      } else if (isDatabase) {
        scopeRule = `7. DATABASE ISOLATION: This is a Database Setup/Model criterion. Focus ONLY on the persistence technology and schema required by this criterion (for example Room/SQLite, ORM entities, or SQL), constraints and relationships. Do not impose another platform or framework. DO NOT evaluate Controllers or API endpoints (like GET/POST validation) here. DO NOT penalize architectural patterns.`;
      } else {
        scopeRule = `7. API/LOGIC ISOLATION: This is a functional criterion for the submitted project platform. DO NOT penalize the code for violating architectural patterns (like using DbContext directly in controllers). Evaluate ONLY the correctness of the functional logic, requested behavior and data validation. Do not require web routes, authentication or a backend unless the criterion explicitly asks for them.`;
      }

      let crashLogsContext = "";
      if (crashLogs) {
        crashLogsContext = `
═══════════════════════════════════════
COMPILATION / RUNTIME ERROR LOGS
═══════════════════════════════════════
The student's code crashed or failed to compile with the following logs. You MUST consider this failure when assigning "percentageComplete" (e.g. if the code for this rule is the cause of the crash, or if it cannot function due to syntax errors).
${crashLogs.substring(0, 2000)} // Truncated to 2000 chars

`;
      }

      const prompt = `Evidence response attempt: ${attempt}. Use exact file paths from FILE headers and valid [Lx] line numbers. Return startLine/endLine (at most 40 lines) instead of copying source strings. If a previous response lacked evidence, correct the file/line references.
You are an academic code grader for a university-level programming assignment.

═══════════════════════════════════════
GRADING CONTEXT
═══════════════════════════════════════
Project Type: ${snapshot.projectType}
Grading Criterion: "${ruleTitle}"

STRICT INSTRUCTIONS:
1. PRECISION TARGETING: You MUST evaluate ONLY the specific subsystem, layer, or configuration requested in "Grading Criterion". DO NOT provide a general summary of the entire project.
2. CONTEXTUAL AWARENESS: You must analyze the nature of the criterion and isolate your search:
   - If it is a Configuration/Setup rule (e.g. Frontend init, Docker, CI/CD), ONLY evaluate config/manifest files (e.g., package.json, vite.config, Dockerfile). Ignore application logic.
   - If it is a Data/Schema rule, ONLY evaluate Entity/Model classes, Database Contexts, or Migrations. Ignore Controllers/Routers.
   - If it is an API/Routing rule, ONLY evaluate the Controller/Router and the immediate Service logic handling the request.
3. STRICT ISOLATION: NEVER extract code snippets from a layer that is irrelevant to the criterion. If the specific code is missing from the provided context, you MUST return an empty array for 'relevantSnippets' and set percentageComplete to 0. Do NOT substitute with generic architecture code!
4. ACCURACY: If the code is present but incomplete or fails obvious edge cases related to the criterion, reduce "percentageComplete" proportionally.
5. ANTI-HALLUCINATION: DO NOT penalize for lack of Try-Catch or Exception handling UNLESS explicitly requested. Accept soft deletes (IsDeleted flag) if requested.
${scopeRule}
═══════════════════════════════════════
YOUR TASK
═══════════════════════════════════════
${semanticDescription}
${crashLogsContext}
${runtimeTestSummary ? `VERIFIED CONSOLE TEST SUMMARY (runner evidence): ${runtimeTestSummary}\nUse this evidence only for the current rubric criterion. Do not claim tests passed contrary to these results; do not add extra criteria or a second score budget.` : ''}
═══════════════════════════════════════
SOURCE CODE TO EVALUATE
═══════════════════════════════════════

${filesContext}

═══════════════════════════════════════
OUTPUT FORMAT — Return ONLY valid JSON:
{
  "passed": true | false,
  "confidence": 0.0 to 1.0,
  "percentageComplete": <a number from 0.0 to 1.0 proportional to fulfilled requirements>,
  "reasoning": "one paragraph explaining what you found and your conclusion",
  "relevantSnippets": [
    {
      "startLine": 1,
      "endLine": 15,
      "filePath": "relative path to the file containing this snippet",
      "explanation": "CRITICAL: Must match the code exactly. NEVER extract valid code and then falsely claim the feature doesn't exist!"
    }
  ],
  "relevantFiles": ["file paths that were decisive"]
}
STRICT RULES:
1. If the criterion requires multiple elements (e.g., GET, POST, PUT, DELETE APIs), you MUST extract multiple snippets in the 'relevantSnippets' array to prove each element exists. Do NOT just extract the first one you see.
2. "percentageComplete" MUST reflect how many sub-requirements are met. Example: If the criterion asks for 5 API endpoints and only 3 exist, set percentageComplete to 0.6. If everything is met, set to 1.0. If nothing is met, set to 0.0. This is CRITICAL for fair partial scoring.
3. Set "passed" to true ONLY if percentageComplete >= 0.9 (i.e., nearly all sub-requirements are met).
4. ANTI-HALLUCINATION: If you find the code, acknowledge it. Do NOT say a method is missing if you just extracted it.
5. PRESERVE FORMATTING: You MUST escape all line breaks as \\n and quotes as \\" inside the JSON string values. DO NOT output literal newlines inside strings. This causes JSON Parse errors!
6. CONCISENESS (CRITICAL): Your 'reasoning' MUST be strictly less than 80 words. Focus ONLY on the code logic (variables, logic, data). DO NOT describe UI elements.
7. CRITICAL: The "reasoning" and "explanation" fields MUST be written entirely in Vietnamese.
8. CRITICAL EVIDENCE REQUIREMENT: If percentageComplete > 0, you MUST ALWAYS provide at least one snippet in 'relevantSnippets'. Even if you only found partial code (like finding the UI Screen but missing the ViewModel), you MUST extract the partial code you did find as proof! Empty arrays [] are ABSOLUTELY FORBIDDEN if the score is greater than 0.`;

      try {
        const cacheKey = "code_evidence_v3_" + crypto.createHash('sha256').update(prompt).digest('hex');
        let response: any;

        const finalParsed = await AiClientManager.executeWithFallback(async (client, model) => {
          const controller = new AbortController();
          let timeoutId: ReturnType<typeof setTimeout>;
          const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => { controller.abort(); reject(new Error('AI_TIMEOUT')); }, 90000);
          });
          try {
            const result = await Promise.race([
              client.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.0,
                max_tokens: 4096,
                response_format: { type: "json_object" }
              }, { signal: controller.signal as any }),
              timeout
            ]);

            let text = (result as any).choices[0].message.content?.trim() || "{}";
            text = text.replace(/^```json/g, "").replace(/```$/g, "").trim();

            // State-machine JSON sanitizer: Robustly fix literal newlines inside JSON string values.
            try {
              let sanitizedText = "";
              let inString = false;
              let isEscaped = false;
              for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '\\') {
                  isEscaped = !isEscaped;
                  sanitizedText += char;
                } else if (char === '"' && !isEscaped) {
                  inString = !inString;
                  sanitizedText += char;
                  isEscaped = false;
                } else if (char === '\n' && inString) {
                  sanitizedText += '\\n'; // Escape literal newline
                  isEscaped = false;
                } else if (char === '\r' && inString) {
                  // Ignore carriage return inside string to prevent breaking JSON
                  isEscaped = false;
                } else {
                  sanitizedText += char;
                  isEscaped = false;
                }
              }
              text = sanitizedText;
            } catch (e) {
              // Ignore sanitizer errors
            }

            // Validate before the provider manager caches a response. Invalid evidence must be retried.
            return resolveCodeReviewResult(snapshot.files, JSON.parse(text));
          } finally {
            clearTimeout(timeoutId);
          }
        }, cacheKey);

        return resolveCodeReviewResult(snapshot.files, finalParsed);
      } catch (error: any) {
        lastError = error;
        const isTimeoutOrRateLimit = error.code === 'AI_UNAVAILABLE' || error.code === 'AI_TIMEOUT' ||
          error.message?.includes('AI_CODE_EVIDENCE_MISSING') ||
          error.message?.includes('AI_REVIEW_INVALID') ||
          error.message?.includes('AI_TIMEOUT') ||
          error.message?.includes('abort') ||
          error.status === 429 ||
          error.status === 503 ||
          error.message?.includes('fetch failed') ||
          error instanceof SyntaxError;

        if (error.status === 429 || (error.message && error.message.includes('429'))) {
          console.error(`[AICodeReviewEngine] Global rate limit (429) hit. Aborting code review for this rule to prevent nested retry floods.`);
          break;
        }

        if (isTimeoutOrRateLimit && attempt < maxContextLengths.length) {
          if (error.code === 'AI_UNAVAILABLE' || error.code === 'AI_TIMEOUT') await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
          console.warn(`[AICodeReviewEngine] Attempt ${attempt} failed (Error: ${error.message}). Retrying with reduced context (${maxContextLengths[attempt]} chars)...`);
          continue; // Retry loop
        }

        // If it's a completely different error, or we exhausted all retries, break and return failure
        break;
      }
    }

    console.error(`[AICodeReviewEngine] Failed to evaluate after ${attempt} attempts:`, lastError);
    throw new Error(`AI Code Review service failed: ${lastError?.message || lastError || "Unknown error"}`);
  }

  /**
   * Language-agnostic file relevance scoring.
   * Supports: C#, Java, Python, Dart/Flutter, JS/TS, Go, Rust, C/C++, Kotlin, PHP, Ruby.
   */
  private selectRelevantFiles(files: ProjectSourceSnapshot['files'], semanticDescription: string): ProjectSourceSnapshot['files'] {
    const keywords = semanticDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    // Detect project language from file extensions
    const language = this.detectProjectLanguage(files);

    const scoredFiles = files.map(f => {
      let score = 0;
      const filePath = f.relativePath.toLowerCase();
      const content = f.content.toLowerCase();

      // 0. Base score for actual source code files
      const sourceExts = ['.java', '.cpp', '.c', '.cs', '.py', '.js', '.ts', '.go', '.rs', '.kt', '.dart', '.rb', '.php', '.scala', '.h', '.hpp'];
      if (sourceExts.some(ext => filePath.endsWith(ext))) {
        score += 10;
      }

      // 1. Exact keyword matches in path are highly relevant
      keywords.forEach(k => {
        if (filePath.includes(k)) score += 50;
        if (content.includes(k)) score += 2;
      });

      // 2. Language-specific structural file scoring
      const langPatterns = LANGUAGE_SCORING[language] || [];
      for (const lp of langPatterns) {
        if (filePath.includes(lp.pattern.toLowerCase())) {
          score += lp.score;
        }
      }

      // 3. Universal high-value patterns (cross-language)
      if (filePath.includes('solution') || filePath.includes('algo') || filePath.includes('leetcode')) score += 20;
      if (filePath.includes('controller') || filePath.includes('handler')) score += 12;
      if (filePath.includes('service')) score += 10;
      if (filePath.includes('repository') || filePath.includes('repo')) score += 10;
      if (filePath.includes('model') || filePath.includes('entity')) score += 8;
      if (filePath.includes('view') || filePath.includes('screen') || filePath.includes('page')) score += 6;
      if (filePath.includes('package.json') || filePath.includes('vite.config') || filePath.includes('tailwind.config') || filePath.includes('tsconfig')) score += 20;

      // 4. Penalize non-source statics (universal)
      const skipPatterns = ['node_modules', '.git', 'bin/', 'obj/', 'build/', '__pycache__', '.gradle', 'wwwroot', 'dist/'];
      if (skipPatterns.some(sp => filePath.includes(sp))) score -= 200;

      const staticExts = ['.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.lock', '.class'];
      if (staticExts.some(ext => filePath.endsWith(ext))) score -= 100;

      // Allow config/manifest files but with lower priority, except high-value ones
      const configExts = ['.json', '.xml', '.yaml', '.yml', '.toml', '.properties'];
      const isConfig = configExts.some(ext => filePath.endsWith(ext));
      const isManifest = ['pubspec.yaml', 'pom.xml', 'build.gradle', 'package.json', '.csproj', 'cargo.toml', 'go.mod', 'requirements.txt', 'vite.config', 'tailwind.config']
        .some(m => filePath.includes(m.toLowerCase()));
      if (isConfig && !isManifest) score -= 20;

      return { file: f, score };
    });

    // Sort files by score descending
    let relevant = scoredFiles.filter(sf => sf.score > 0).sort((a, b) => b.score - a.score);
    // Fallback: If filtering dropped valid code files, include all non-penalized files
    if (relevant.length === 0) {
      relevant = scoredFiles.filter(sf => sf.score > -50).sort((a, b) => b.score - a.score);
    }
    return relevant.map(sf => sf.file);
  }

  /**
   * Detect the primary language of the project from file extensions.
   */
  private detectProjectLanguage(files: ProjectSourceSnapshot['files']): string {
    const extCount: Record<string, number> = {};
    for (const f of files) {
      const ext = '.' + f.relativePath.split('.').pop()?.toLowerCase();
      extCount[ext] = (extCount[ext] || 0) + 1;
    }

    // Priority-ordered language detection
    if (files.some(f => f.relativePath.endsWith('.dart'))) return 'dart';
    if (files.some(f => f.relativePath.endsWith('.cs') || f.relativePath.endsWith('.csproj'))) return 'csharp';
    if (files.some(f => f.relativePath.endsWith('.java'))) return 'java';
    if (files.some(f => f.relativePath.endsWith('.kt'))) return 'kotlin';
    if (files.some(f => f.relativePath.endsWith('.py'))) return 'python';
    if (files.some(f => f.relativePath.endsWith('.go'))) return 'golang';
    if (files.some(f => f.relativePath.endsWith('.rs'))) return 'rust';
    if (files.some(f => f.relativePath.endsWith('.rb'))) return 'ruby';
    if (files.some(f => f.relativePath.endsWith('.php'))) return 'php';
    if (files.some(f => f.relativePath.endsWith('.tsx') || f.relativePath.endsWith('.ts'))) return 'typescript';
    if (files.some(f => f.relativePath.endsWith('.jsx') || f.relativePath.endsWith('.js'))) return 'javascript';
    if (files.some(f => f.relativePath.endsWith('.cpp') || f.relativePath.endsWith('.c'))) return 'cpp';
    return 'unknown';
  }
}

