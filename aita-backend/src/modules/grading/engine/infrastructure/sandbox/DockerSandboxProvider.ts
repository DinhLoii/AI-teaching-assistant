// @ts-nocheck
import { ISandboxProvider } from '../../core/contracts/ISandboxProvider';
import { assertSandboxExecution } from '../../config/sandbox-policy.js';
import { ExecutionContext } from '../../core/domain/execution/ExecutionContext';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import * as path from 'path';
import * as fs from 'fs';

export class DockerSandboxProvider implements ISandboxProvider {
    private containers: Map<string, StartedTestContainer> = new Map();

    public async buildAndStartAsync(config: { sourcePath: string, port?: number, env?: Record<string, string> }): Promise<ExecutionContext> {
        assertSandboxExecution();
        console.log(`[DockerSandboxProvider] Building container from ${config.sourcePath}...`);
        
        try {
            const dockerfilePath = path.join(config.sourcePath, 'Dockerfile');
            if (!fs.existsSync(dockerfilePath)) {
                console.log(`[DockerSandboxProvider] No Dockerfile found in ${config.sourcePath}. Auto-detecting project type...`);
                const allFiles = fs.readdirSync(config.sourcePath);
                const csprojFiles = allFiles.filter(f => f.endsWith('.csproj'));
                const cppFiles = allFiles.filter(f => /\.(cpp|cc|cxx)$/i.test(f));
                const cFiles = allFiles.filter(f => /\.c$/i.test(f));
                const javaFiles = allFiles.filter(f => /\.java$/i.test(f));
                const pyFiles = allFiles.filter(f => /\.py$/i.test(f));

                let defaultDockerfile = '';

                if (cppFiles.length > 0 || cFiles.length > 0) {
                    console.log(`[DockerSandboxProvider] Detected C/C++ project (${cppFiles.concat(cFiles).join(', ')}).`);
                    defaultDockerfile = `FROM gcc:11
WORKDIR /app
COPY . .
RUN if [ -f "Makefile" ] || [ -f "makefile" ]; then make; else g++ -std=c++17 -O2 *.cpp -o main 2>/dev/null || gcc -O2 *.c -o main; fi
ENTRYPOINT ["./main"]
`;
                } else if (javaFiles.length > 0) {
                    console.log(`[DockerSandboxProvider] Detected Java project (${javaFiles.join(', ')}).`);
                    const mainClass = javaFiles.find(f => /main/i.test(f))?.replace('.java', '') || 'Main';
                    defaultDockerfile = `FROM openjdk:17-slim
WORKDIR /app
COPY . .
RUN javac *.java
ENTRYPOINT ["java", "${mainClass}"]
`;
                } else if (pyFiles.length > 0) {
                    console.log(`[DockerSandboxProvider] Detected Python project (${pyFiles.join(', ')}).`);
                    const mainPy = pyFiles.find(f => /main/i.test(f)) || pyFiles[0];
                    defaultDockerfile = `FROM python:3.11-slim
WORKDIR /app
COPY . .
ENTRYPOINT ["python", "${mainPy}"]
`;
                } else if (csprojFiles.length > 0) {
                    console.log(`[DockerSandboxProvider] Detected .NET 8 project (${csprojFiles[0]}).`);
                    const projName = csprojFiles[0];
                    const dllName = projName.replace('.csproj', '.dll');
                    defaultDockerfile = `FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
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
                } else {
                    throw new Error("Cannot auto-detect project type. No .cpp, .c, .java, .py, or .csproj found.");
                }

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

