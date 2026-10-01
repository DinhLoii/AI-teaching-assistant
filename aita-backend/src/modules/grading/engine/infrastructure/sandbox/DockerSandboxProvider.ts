// @ts-nocheck
import { ISandboxProvider } from '../../core/contracts/ISandboxProvider';
import { ExecutionContext } from '../../core/domain/execution/ExecutionContext';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import * as path from 'path';
import * as fs from 'fs';

export class DockerSandboxProvider implements ISandboxProvider {
    private containers: Map<string, StartedTestContainer> = new Map();

    public async buildAndStartAsync(config: { sourcePath: string, port?: number, env?: Record<string, string> }): Promise<ExecutionContext> {
        console.log(`[DockerSandboxProvider] Building container from ${config.sourcePath}...`);
        
        try {
            const dockerfilePath = path.join(config.sourcePath, 'Dockerfile');
            if (!fs.existsSync(dockerfilePath)) {
                console.log(`[DockerSandboxProvider] No Dockerfile found in ${config.sourcePath}. Generating dynamic one for .NET 8...`);
                const csprojFiles = fs.readdirSync(config.sourcePath).filter(f => f.endsWith('.csproj'));
                if (csprojFiles.length === 0) throw new Error("No .csproj found. Cannot detect project type dynamically.");
                
                const projName = csprojFiles[0];
                const dllName = projName.replace('.csproj', '.dll');
                
                const defaultDockerfile = `
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "${dllName}"]
`;
                fs.writeFileSync(dockerfilePath, defaultDockerfile);
            }

            // Build the image from the student's Dockerfile
            let containerBuilder = await GenericContainer.fromDockerfile(config.sourcePath).build();
                
            const targetPort = config.port || 8080;

            console.log(`[DockerSandboxProvider] Starting container on port ${targetPort}...`);
            
            containerBuilder = containerBuilder
                .withExposedPorts(targetPort)
                // Wait for the container to start listening on the port
                .withWaitStrategy(Wait.forListeningPorts());

            if (config.env) {
                containerBuilder = containerBuilder.withEnvironment(config.env);
            }

            const startedContainer = await containerBuilder.start();
            
            const host = startedContainer.getHost();
            const mappedPort = startedContainer.getMappedPort(targetPort);
            const containerId = startedContainer.getId();
            
            this.containers.set(containerId, startedContainer);

            console.log(`[DockerSandboxProvider] Container running at http://${host}:${mappedPort}`);

            return {
                submissionId: path.basename(config.sourcePath),
                apiUrl: `http://${host}:${mappedPort}`,
                sandboxWorkspacePath: config.sourcePath,
                artifacts: [],
                containerId
            };
        } catch (error) {
            console.error('[DockerSandboxProvider] Sandbox failure:', error);
            throw error;
        }
    }

    public async teardownAsync(context: ExecutionContext): Promise<void> {
        if (context.containerId) {
            const container = this.containers.get(context.containerId);
            if (container) {
                console.log(`[DockerSandboxProvider] Stopping container ${context.containerId}...`);
                await container.stop();
                this.containers.delete(context.containerId);
            }
        }
    }
}

