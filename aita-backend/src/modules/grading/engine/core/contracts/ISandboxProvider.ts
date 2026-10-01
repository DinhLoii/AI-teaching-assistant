// @ts-nocheck
import { ExecutionContext } from '../domain/execution/ExecutionContext';

export interface ISandboxProvider {
    buildAndStartAsync(config: { sourcePath: string, port?: number, env?: Record<string, string> }): Promise<ExecutionContext>;
    teardownAsync(context: ExecutionContext): Promise<void>;
}

