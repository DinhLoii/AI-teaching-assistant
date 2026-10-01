// @ts-nocheck
import { IRuntimeStrategy, RuntimeConfig } from '../../core/contracts/IRuntimeStrategy';
import { ExecutionContext } from '../../core/domain/execution/ExecutionContext';
import { ISandboxProvider } from '../../core/contracts/ISandboxProvider';

export class DotnetRuntimeStrategy implements IRuntimeStrategy {
    public readonly strategyId = 'dotnet-runtime';

    constructor(private sandboxProvider: ISandboxProvider) {}

    public async buildAndStartAsync(config: RuntimeConfig): Promise<ExecutionContext> {
        console.log(`[DotnetRuntimeStrategy] Delegating build and start to DockerSandboxProvider for ${config.sourcePath}...`);
        
        // Let Docker build the provided Dockerfile and expose port 8080
        return await this.sandboxProvider.buildAndStartAsync({
            sourcePath: config.sourcePath,
            port: 8080,
            env: config.env
        });
    }

    public async teardownAsync(context: ExecutionContext): Promise<void> {
        console.log(`[DotnetRuntimeStrategy] Tearing down sandbox...`);
        await this.sandboxProvider.teardownAsync(context);
    }
}

