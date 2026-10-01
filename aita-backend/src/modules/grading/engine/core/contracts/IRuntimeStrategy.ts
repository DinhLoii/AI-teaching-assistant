// @ts-nocheck
import { ExecutionContext } from '../domain/execution/ExecutionContext';

export interface RuntimeConfig {
    sourcePath: string;
    env?: Record<string, string>;
}

export interface IRuntimeStrategy {
    readonly strategyId: string;
    buildAndStartAsync(config: RuntimeConfig): Promise<ExecutionContext>;
    teardownAsync(context: ExecutionContext): Promise<void>;
}

