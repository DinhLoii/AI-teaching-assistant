// @ts-nocheck
import { spawn } from 'child_process';

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Wrapper around child_process.spawn that returns a promise.
 *
 * Captures stdout, stderr, and the exit code.
 * Automatically kills the child after `timeoutMs` to prevent hanging builds.
 */
export class ProcessRunner {
  /**
   * Execute a command in a given working directory with a timeout.
   */
  async run(
    command: string,
    args: string[],
    cwd: string,
    timeoutMs: number,
  ): Promise<ProcessResult> {
    return new Promise<ProcessResult>((resolve) => {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];
      let timedOut = false;
      let settled = false;

      const child = spawn(command, args, {
        cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Timeout guard
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.stdout.on('data', (data: Buffer) => {
        stdoutChunks.push(data.toString());
      });

      child.stderr.on('data', (data: Buffer) => {
        stderrChunks.push(data.toString());
      });

      const settle = (exitCode: number | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          exitCode,
          stdout: stdoutChunks.join(''),
          stderr: stderrChunks.join(''),
          timedOut,
        });
      };

      child.on('close', (code) => settle(code));
      child.on('error', () => settle(1));
    });
  }
}

