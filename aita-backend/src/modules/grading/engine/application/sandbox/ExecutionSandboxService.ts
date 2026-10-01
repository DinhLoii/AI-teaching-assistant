// @ts-nocheck
import * as fs from 'fs/promises';
import * as path from 'path';
import Docker from 'dockerode';
import * as net from 'net';
import { execSync } from 'child_process';
import * as os from 'os';

/**
 * Teacher-facing project category. This is what the teacher selects when creating an assignment.
 * It determines SCORING STRATEGY, not Docker provisioning.
 */
export type ProjectType = "algorithm" | "backend" | "frontend" | "fullstack" | "desktop" | "mobile" | "unity" | "database" | "unknown";

/**
 * Internal runtime stack auto-detected from the student's submitted code.
 * This determines DOCKER IMAGE + BUILD/RUN COMMANDS.
 */
export type RuntimeStack = "aspnet" | "blazor" | "nodejs" | "java" | "python" | "php" | "golang" | "dotnet_console" | "dotnet_desktop" | "unity_engine" | "fullstack_dotnet_node" | "flutter" | "unknown";

export interface SandboxHandle {
  containerId: string | null;
  baseUrl: string | null;
  additionalUrls?: string[];
  projectType: ProjectType;
  runtimeStack: RuntimeStack;
  isReady: boolean;
  /** Warnings emitted during DB injection (e.g., hardcoded connection strings patched) */
  dbWarnings?: string[];
  /** Crash logs if container exits prematurely */
  crashLogs?: string;
}

export class ExecutionSandboxService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Given a path to student source code, build and run it in an isolated Docker container.
   * Returns a handle to the running sandbox including the accessible base URL.
   */
  public async startAsync(submissionPath: string, projectType: ProjectType = "unknown"): Promise<SandboxHandle> {
    // Normalize the teacher's input to our clean ProjectType
    projectType = this.normalizeProjectType(projectType);

    // Auto-detect what runtime stack the student's code actually uses
    const runtimeStack = await this.detectRuntimeStack(submissionPath);
    console.log(`[Sandbox] ProjectType: ${projectType}, RuntimeStack: ${runtimeStack}`);

    if (!this.isServerRuntime(runtimeStack) || projectType === "desktop" || runtimeStack === "dotnet_desktop") {
      return { containerId: null, baseUrl: null, projectType, runtimeStack, isReady: false };
    }

    const hostPort = await this.getFreePort();
    const hostPort3000 = await this.getFreePort();
    const hostPort5000 = await this.getFreePort();
    const hostPort5173 = await this.getFreePort();

    try {
      let runDir = "/app";
      let fingerprintFile: string | null = null;

      switch (runtimeStack) {
        case "nodejs": fingerprintFile = await this.findFile(submissionPath, 'package.json'); break;
        case "java": fingerprintFile = await this.findFile(submissionPath, 'pom.xml') || await this.findFile(submissionPath, 'build.gradle'); break;
        case "python": fingerprintFile = await this.findFile(submissionPath, 'requirements.txt') || await this.findFile(submissionPath, 'manage.py'); break;
        case "golang": fingerprintFile = await this.findFile(submissionPath, 'go.mod'); break;
        case "php": fingerprintFile = await this.findFile(submissionPath, 'composer.json') || await this.findFile(submissionPath, 'index.php'); break;
        default: fingerprintFile = await this.findFile(submissionPath, '.csproj'); break;
      }

      if (fingerprintFile) {
        const relativeDir = path.relative(submissionPath, path.dirname(fingerprintFile));
        if (relativeDir) {
          runDir = `/app/${relativeDir.replace(/\\/g, '/')}`;
        }
      }

      const csprojPath = (["aspnet", "blazor", "dotnet_console", "dotnet_desktop", "fullstack_dotnet_node", "unknown"] as string[]).includes(runtimeStack)
        ? await this.findFile(submissionPath, '.csproj')
        : null;

      // ═══════════════════════════════════════════════════════════
      // DB INJECTION — 3-layer strategy before container starts
      // ═══════════════════════════════════════════════════════════
      const dbWarnings = await this.injectDbOverrides(submissionPath, csprojPath);
      if (dbWarnings.length > 0) {
        console.warn(`[Sandbox] DB injection warnings:\n  ${dbWarnings.join('\n  ')}`);
      }

      // ═══════════════════════════════════════════════════════════
      // DYNAMIC DOCKER PROVISIONING
      // ═══════════════════════════════════════════════════════════
      let dockerImage = "mcr.microsoft.com/dotnet/sdk:8.0";
      let cmd = ["sh", "-c", `cp -a /app /sandbox && cd "${runDir.replace('/app', '/sandbox')}" && dotnet restore && dotnet run --urls http://0.0.0.0:8080`];
      let env = [
        "ASPNETCORE_ENVIRONMENT=Sandbox",
        "DOTNET_ENVIRONMENT=Sandbox",
        "ConnectionStrings__Default=Data Source=sandbox.db",
        "ConnectionStrings__DefaultConnection=Data Source=sandbox.db",
      ];

      switch (runtimeStack) {
        case "aspnet":
        case "blazor":
        case "dotnet_console":
        case "dotnet_desktop":
          if (csprojPath) {
            try {
              const csprojContent = await fs.readFile(csprojPath, 'utf8');
              const match = csprojContent.match(/<TargetFramework>net(\d+\.\d+)<\/TargetFramework>/);
              if (match && match[1]) {
                dockerImage = `mcr.microsoft.com/dotnet/sdk:${match[1]}`;
              }
            } catch (err) { }
          }
          break;
        case "fullstack_dotnet_node":
          let dotnetVersion = "8.0";
          if (csprojPath) {
            try {
              const csprojContent = await fs.readFile(csprojPath, 'utf8');
              const match = csprojContent.match(/<TargetFramework>net(\d+\.\d+)<\/TargetFramework>/);
              if (match && match[1]) {
                dotnetVersion = match[1];
              }
            } catch (err) { }
          }

          dockerImage = `aita-fullstack-dotnet-node:${dotnetVersion}`;
          const baseDotnetImage = `mcr.microsoft.com/dotnet/sdk:${dotnetVersion}`;

          console.log(`[Sandbox] Checking if custom image ${dockerImage} exists...`);
          try {
            await this.docker.getImage(dockerImage).inspect();
            console.log(`[Sandbox] Custom image ${dockerImage} already exists.`);
          } catch (err: any) {
            if (err.statusCode === 404) {
              console.log(`[Sandbox] Custom image ${dockerImage} not found. Attempting dynamic build with fallback...`);
              let built = false;
              try {
                const dockerfileContent = `FROM ${baseDotnetImage}\nRUN apt-get update && apt-get install -y curl && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs`;
                const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-docker-'));
                await fs.writeFile(path.join(tmpDir, 'Dockerfile'), dockerfileContent);
                execSync(`docker build -t ${dockerImage} .`, { cwd: tmpDir, stdio: 'inherit', timeout: 120000 });
                console.log(`[Sandbox] Successfully built ${dockerImage}.`);
                built = true;
                await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => { });
              } catch (buildErr) {
                console.warn(`[Sandbox] Could not build custom image ${dockerImage} (${buildErr}), falling back to ${baseDotnetImage}`);
              }
              if (!built) {
                dockerImage = baseDotnetImage;
              }
            } else {
              console.warn(`[Sandbox] Docker error inspecting ${dockerImage}, falling back to ${baseDotnetImage}:`, err?.message || err);
              dockerImage = baseDotnetImage;
            }
          }

          let fsSetupScript = `cp -a /app /sandbox\n`;
          let runDirSandbox = runDir.replace('/app', '/sandbox');
          let fsRunScript = `(cd "${runDirSandbox}" && dotnet restore && dotnet run --urls http://0.0.0.0:8080 > /sandbox/backend.log 2>&1) &\n`;

          const fsPackageJsons = await this.findAllFiles(submissionPath, 'package.json');
          for (const pkgPath of fsPackageJsons) {
            const relativeDir = path.relative(submissionPath, path.dirname(pkgPath)).replace(/\\/g, '/');
            const containerDir = relativeDir ? `/sandbox/${relativeDir}` : `/sandbox`;

            fsSetupScript += `(cd "${containerDir}" && echo "[Sandbox] Starting npm install..." && (npm install --no-fund --no-audit --prefer-offline --no-progress --loglevel error || true))\n`;

            let frontendJob = `(cd "${containerDir}"`;

            try {
              const pkgContent = await fs.readFile(pkgPath, 'utf8');
              const pkg = JSON.parse(pkgContent);
              const scripts = pkg.scripts || {};
              let execCmd = "";
              if (scripts['dev']) execCmd = "npm run dev";
              else if (scripts['start']) execCmd = "npm start";

              if (execCmd) {
                frontendJob += ` && echo "[Sandbox] Starting Vite/React..." && export HOST=0.0.0.0 && export NODE_ENV=development && ${execCmd} -- --host 0.0.0.0`;
              }
            } catch (e) { }

            frontendJob += ` > /sandbox/frontend.log 2>&1) &\n`;
            fsRunScript += frontendJob;
          }

          // Daemonized container: use bash wait -n to exit immediately if ANY background service crashes
          cmd = ["bash", "-c", `${fsSetupScript}\n${fsRunScript}\nwait -n || exit $?`];
          env = [
            "ASPNETCORE_ENVIRONMENT=Sandbox",
            "DOTNET_ENVIRONMENT=Sandbox",
            "ConnectionStrings__Default=Data Source=sandbox.db",
            "ConnectionStrings__DefaultConnection=Data Source=sandbox.db"
          ];
          break;
        case "nodejs":
          dockerImage = "node:20-alpine";

          const nodeAutoPort = `
const net = require('net');
const originalListen = net.Server.prototype.listen;
let portOverridden = false;
net.Server.prototype.listen = function() {
    const args = Array.from(arguments);
    const targetPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
    if (!portOverridden) {
        if (typeof args[0] === 'number' || typeof args[0] === 'string') {
            const port = parseInt(args[0], 10);
            if (!isNaN(port) && port > 0) {
                console.log('[Sandbox Override] Intercepted net.Server.listen on port ' + port + ', forcing to process.env.PORT (' + targetPort + ') and host 0.0.0.0');
                args[0] = targetPort;
                if (typeof args[1] === 'string') {
                    args[1] = '0.0.0.0';
                } else if (typeof args[1] === 'function') {
                    args.splice(1, 0, '0.0.0.0');
                }
                portOverridden = true;
            }
        } else if (typeof args[0] === 'object' && args[0] !== null && args[0].port) {
            console.log('[Sandbox Override] Intercepted net.Server.listen on port ' + args[0].port + ', forcing to process.env.PORT (' + targetPort + ') and host 0.0.0.0');
            args[0].port = targetPort;
            args[0].host = '0.0.0.0';
            portOverridden = true;
        }
    }
    return originalListen.apply(this, args);
};
`;

          const autoPortHeredoc = `cat << 'EOF_AUTOPORT' > /sandbox/autoport.js\n${nodeAutoPort}\nEOF_AUTOPORT\n`;

          const allPackageJsons = await this.findAllFiles(submissionPath, 'package.json');

          if (allPackageJsons && allPackageJsons.length > 0) {
            let installScript = "cp -a /app /sandbox\n";
            let runScript = "";
            let portNum = 8080;

            // First, run npm install sequentially to avoid lockfile contention
            for (const pkgPath of allPackageJsons) {
              const relativeDir = path.relative(submissionPath, path.dirname(pkgPath)).replace(/\\/g, '/');
              const containerDir = relativeDir ? `/sandbox/${relativeDir}` : `/sandbox`;
              installScript += `(cd "${containerDir}" && npm install --no-fund --no-audit --prefer-offline --loglevel error) || true\n`;
            }

            for (const pkgPath of allPackageJsons) {
              const relativeDir = path.relative(submissionPath, path.dirname(pkgPath)).replace(/\\/g, '/');
              const containerDir = relativeDir ? `/sandbox/${relativeDir}` : `/sandbox`;

              let isBackend = false;
              let hasDev = false;
              let hasStart = false;
              let hasServer = false;

              try {
                const pkgContent = await fs.readFile(pkgPath, 'utf8');
                const pkg = JSON.parse(pkgContent);
                const scripts = pkg.scripts || {};
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                if (deps['express'] || deps['koa'] || deps['nestjs'] || deps['fastify'] || deps['mongoose'] || deps['sequelize']) {
                  isBackend = true;
                }

                // Fallback backend detection for missing dependencies
                if (!isBackend) {
                  const startScript = (scripts['start'] || '').toLowerCase();
                  const devScript = (scripts['dev'] || '').toLowerCase();
                  if (startScript.includes('node ') || startScript.includes('nodemon') || startScript.includes('ts-node') ||
                    devScript.includes('node ') || devScript.includes('nodemon') || devScript.includes('ts-node')) {
                    isBackend = true;
                  }
                  const dirName = path.basename(path.dirname(pkgPath)).toLowerCase();
                  if (dirName === 'backend' || dirName === 'server' || dirName === 'api') {
                    isBackend = true;
                  }
                  if (relativeDir === '' && allPackageJsons.length > 1) {
                    // If root package in a monorepo-style setup, likely backend
                    isBackend = true;
                  }
                }

                // Anti Fork-Bomb: Remove recursive install scripts
                let modified = false;
                if (pkg.scripts) {
                  const dangerousKeywords = ['npm install', 'npm i ', 'yarn ', 'pnpm '];
                  for (const scriptName of ['preinstall', 'install', 'postinstall']) {
                    if (pkg.scripts[scriptName]) {
                      const scriptStr = pkg.scripts[scriptName].toLowerCase();
                      if (dangerousKeywords.some(kw => scriptStr.includes(kw))) {
                        delete pkg.scripts[scriptName];
                        modified = true;
                        console.log(`[Sandbox] Anti-Fork-Bomb: Removed dangerous '${scriptName}' from ${pkgPath}`);
                      }
                    }
                  }
                }
                if (modified) {
                  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
                }

                hasDev = !!scripts['dev'];
                hasStart = !!scripts['start'];
                hasServer = !!scripts['server'];
              } catch (e) { }

              // Smart Port Allocation
              let currentPort = 8080;
              if (allPackageJsons.length > 1) {
                currentPort = isBackend ? 8080 : (portNum === 8080 ? 3000 : portNum);
                if (!isBackend && portNum === 8080) portNum = 3000;
                if (!isBackend) portNum++;
              }

              // Smart Command Selection
              let execCmd = "node index.js";
              if (hasStart) execCmd = "npm start";
              else if (hasDev) execCmd = "npm run dev";
              else if (hasServer) execCmd = "npm run server";
              else execCmd = "(node server.js || node src/index.js || node app.js || npx ts-node src/index.ts || npx ts-node src/server.ts)";

              runScript += `(cd "${containerDir}" && export PORT=${currentPort} && export HOST=0.0.0.0 && export NODE_OPTIONS="--require /sandbox/autoport.js" && export NODE_ENV=development && ${execCmd} --host 0.0.0.0) &\n`;
            }

            const nodeAutoInstall = `
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function findDeps(dir) {
    let deps = new Set();
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (['node_modules', '.git', 'dist', 'build'].includes(file)) continue;
                findDeps(fullPath).forEach(d => deps.add(d));
            } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const reqRegex = /require\\(['"]([^'\\.\\/][^'"]*)['"]\\)/g;
                const impRegex = /import .* from ['"]([^'\\.\\/][^'"]*)['"]/g;
                let match;
                while ((match = reqRegex.exec(content)) !== null) deps.add(match[1]);
                while ((match = impRegex.exec(content)) !== null) deps.add(match[1]);
            }
        }
    } catch(e) {}
    return deps;
}
try {
    const builtin = new Set(require('module').builtinModules);
    let deps = Array.from(findDeps('/sandbox')).filter(d => !builtin.has(d) && !d.startsWith('node:'));
    deps = deps.map(d => d.startsWith('@') ? d.split('/').slice(0,2).join('/') : d.split('/')[0]);
    deps = [...new Set(deps)];
    deps = deps.map(d => d === 'express' ? 'express@4' : d);
    if (deps.length > 0) {
        console.log('[Sandbox] Auto-installing detected dependencies: ' + deps.join(' '));
        execSync('npm install ' + deps.join(' ') + ' --no-save --no-fund --no-audit', { stdio: 'inherit', cwd: '/sandbox' });
    }
} catch (e) {
    console.error('[Sandbox] Auto-Installer Error:', e.message);
}
`;

            installScript += `
cat << 'EOF_AUTOINSTALL' > /sandbox/autoinstall.js
${nodeAutoInstall}
EOF_AUTOINSTALL
node /sandbox/autoinstall.js
`;

            runScript += `wait\n`;
            cmd = ["sh", "-c", `${installScript}\n${autoPortHeredoc}\n${runScript}`];
          } else {
            const nodeAutoInstall = `
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
function findDeps(dir) {
    let deps = new Set();
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (['node_modules', '.git', 'dist', 'build'].includes(file)) continue;
                findDeps(fullPath).forEach(d => deps.add(d));
            } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const reqRegex = /require\\(['"]([^'\\.\\/][^'"]*)['"]\\)/g;
                const impRegex = /import .* from ['"]([^'\\.\\/][^'"]*)['"]/g;
                let match;
                while ((match = reqRegex.exec(content)) !== null) deps.add(match[1]);
                while ((match = impRegex.exec(content)) !== null) deps.add(match[1]);
            }
        }
    } catch(e) {}
    return deps;
}
try {
    const builtin = new Set(require('module').builtinModules);
    let deps = Array.from(findDeps('/sandbox')).filter(d => !builtin.has(d) && !d.startsWith('node:'));
    deps = deps.map(d => d.startsWith('@') ? d.split('/').slice(0,2).join('/') : d.split('/')[0]);
    deps = [...new Set(deps)];
    deps = deps.map(d => d === 'express' ? 'express@4' : d);
    if (deps.length > 0) {
        console.log('[Sandbox] Auto-installing detected dependencies: ' + deps.join(' '));
        execSync('npm install ' + deps.join(' ') + ' --no-save --no-fund --no-audit', { stdio: 'inherit', cwd: '/sandbox' });
    }
} catch (e) {
    console.error('[Sandbox] Auto-Installer Error:', e.message);
}
`;
            const singlePackageScript = `cp -a /app /sandbox
cd "/sandbox"
npm install --prefer-offline
${autoPortHeredoc}
cat << 'EOF_AUTOINSTALL' > /sandbox/autoinstall.js
${nodeAutoInstall}
EOF_AUTOINSTALL
node /sandbox/autoinstall.js
export PORT=8080
export NODE_OPTIONS="--require /sandbox/autoport.js"
export NODE_ENV=development
(npm start || npm run dev || node server.js || node index.js || node app.js)
`;
            cmd = ["sh", "-c", singlePackageScript];
          }
          env = [];

          // Patch Hardcoded Ports before running
          await this.patchNodePorts(submissionPath);

          break;
        case "java":
          dockerImage = "maven:3.9-eclipse-temurin-21";
          cmd = ["sh", "-c", `cp -a /app /sandbox && cd "${runDir.replace('/app', '/sandbox')}" && (mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8080" || (mvn clean package -DskipTests && java -jar target/*.jar))`];
          env = ["SERVER_PORT=8080", "PORT=8080"];
          break;
        case "python":
          dockerImage = "python:3.12-slim";
          cmd = ["sh", "-c", `cp -a /app /sandbox && cd "${runDir.replace('/app', '/sandbox')}" && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi && (python manage.py runserver 0.0.0.0:8080 || uvicorn main:app --host 0.0.0.0 --port 8080 || python app.py)`];
          env = ["PORT=8080"];
          break;
        case "golang":
          dockerImage = "golang:1.22-alpine";
          cmd = ["sh", "-c", `cp -a /app /sandbox && cd "${runDir.replace('/app', '/sandbox')}" && go mod download && go run .`];
          env = ["PORT=8080"];
          break;
        case "php":
          dockerImage = "php:8.2-cli";
          cmd = ["sh", "-c", `cp -a /app /sandbox && cd "${runDir.replace('/app', '/sandbox')}" && if [ -f composer.json ]; then apt-get update && apt-get install -y unzip && curl -sS https://getcomposer.org/installer | php && php composer.phar install; fi && if [ -d public ]; then php -S 0.0.0.0:8080 -t public; else php -S 0.0.0.0:8080 -t .; fi`];
          env = ["PORT=8080"];
          break;
      }

      console.log(`[Sandbox] Checking if image ${dockerImage} exists locally...`);
      try {
        await this.docker.getImage(dockerImage).inspect();
        console.log(`[Sandbox] Image ${dockerImage} already exists. Skipping pull.`);
      } catch (err: any) {
        if (err.statusCode === 404) {
          console.log(`[Sandbox] Image ${dockerImage} not found locally. Pulling from registry (this may take a few minutes)...`);
          const pullPromise = new Promise((resolve, reject) => {
            this.docker.pull(dockerImage, (pullErr: any, stream: any) => {
              if (pullErr) return reject(pullErr);
              this.docker.modem.followProgress(stream, onFinished, onProgress);
              function onFinished(err: any, output: any) {
                if (err) reject(err);
                else resolve(output);
              }
              function onProgress(event: any) {
                // Optional: log progress
              }
            });
          });
          const pullTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Docker pull timeout (45s) exceeded for ${dockerImage}`)), 45000)
          );
          await Promise.race([pullPromise, pullTimeout]);
        } else {
          throw err;
        }
      }

      console.log(`[Sandbox] Starting container for ${runtimeStack} (${projectType}) on port ${hostPort} in ${runDir} using ${dockerImage}...`);

      const container = await this.docker.createContainer({
        Image: dockerImage,
        Cmd: cmd,
        HostConfig: {
          Binds: [
            `${submissionPath.replace(/\\/g, '/')}:/app:ro`,
            `grading_npm_cache:/root/.npm`,
            `grading_nuget_cache:/root/.nuget/packages`,
            `grading_maven_cache:/root/.m2`,
            `grading_pip_cache:/root/.cache/pip`,
            `grading_go_cache:/root/go/pkg`
          ],
          PortBindings: {
            "8080/tcp": [{ HostPort: `${hostPort}` }],
            "3000/tcp": [{ HostPort: `${hostPort3000}` }],
            "5000/tcp": [{ HostPort: `${hostPort5000}` }],
            "5173/tcp": [{ HostPort: `${hostPort5173}` }]
          },
          Memory: 1536 * 1024 * 1024, // 1.5GB
          CpuShares: 1024,
          NetworkMode: "bridge"
        },
        Env: env,
        ExposedPorts: {
          "8080/tcp": {},
          "3000/tcp": {},
          "5000/tcp": {},
          "5173/tcp": {}
        }
      });

      await container.start();
      const containerId = container.id;

      const baseUrl = `http://localhost:${hostPort}`;
      try {
        // Wait for app to be ready (300s timeout for heavy Node.js fullstack builds)
        if (this.isServerRuntime(runtimeStack)) {
          await this.waitUntilReady(container, baseUrl, 300000);
        }
      } catch (err: any) {
        console.error(`[Sandbox] Timeout/Crash waiting for ${baseUrl}. Fetching container logs...`);
        let crashLogs = "";
        try {
          const logs = await container.logs({ stdout: true, stderr: true, timestamps: false });
          crashLogs = logs.toString('utf-8');
          console.error(`[Sandbox] Container Logs:\n${crashLogs}`);
        } catch (logErr) {
          console.error(`[Sandbox] Could not fetch container logs:`, logErr);
        }
        if (err.message?.includes("prematurely") || err.message?.includes("Timeout")) {
          return {
            containerId,
            baseUrl,
            additionalUrls: [
              `http://localhost:${hostPort3000}`,
              `http://localhost:${hostPort5000}`,
              `http://localhost:${hostPort5173}`
            ],
            projectType,
            runtimeStack,
            isReady: false,
            dbWarnings,
            crashLogs: err.message + "\n\n" + crashLogs
          };
        }
        throw err;
      }

      console.log(`[Sandbox] Container ${containerId.substring(0, 8)} ready at ${baseUrl}`);
      return {
        containerId,
        baseUrl,
        additionalUrls: [
          `http://localhost:${hostPort3000}`,
          `http://localhost:${hostPort5000}`,
          `http://localhost:${hostPort5173}`
        ],
        projectType,
        runtimeStack,
        isReady: true,
        dbWarnings
      };
    } catch (error: any) {
      console.error(`[Sandbox] Failed to start sandbox:`, error);
      return {
        containerId: null,
        baseUrl: null,
        projectType,
        runtimeStack: runtimeStack || "unknown",
        isReady: false,
        crashLogs: `Sandbox could not be started: ${error?.message || String(error)}`
      };
    }
  }

  /**
   * Stop and destroy the container after grading is complete.
   */
  public async stopAsync(handle: SandboxHandle): Promise<void> {
    if (!handle.containerId) return;

    try {
      const container = this.docker.getContainer(handle.containerId);
      await container.remove({ force: true });
      console.log(`[Sandbox] Container ${handle.containerId.substring(0, 8)} stopped and destroyed.`);
    } catch (error: any) {
      // Ignore error if container already stopped/removed (404)
      if (error.statusCode !== 404) {
        console.error(`[Sandbox] Error stopping container ${handle.containerId}:`, error);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // DB INJECTION — 3-layer override strategy
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Applies 3 layers of DB override to ensure sandbox can run any student project:
   *   Layer 1: Inject appsettings.Sandbox.json (covers config-based connection strings)
   *   Layer 2: Scan for hardcoded connection strings → emit warnings
   *   Layer 3: Auto-patch hardcoded UseSqlServer/UseNpgsql → UseSqlite in temp dir
   */
  private async injectDbOverrides(submissionPath: string, csprojPath: string | null): Promise<string[]> {
    const warnings: string[] = [];
    const projectDir = csprojPath ? path.dirname(csprojPath) : submissionPath;

    // Layer 1: Inject appsettings.Sandbox.json
    await this.injectSandboxConfig(projectDir);

    // Layer 2 & 3: Scan and patch source files
    const csFiles = await this.findAllCsFiles(submissionPath);

    // First pass: find DbContext name across all files (e.g., ApplicationDbContext)
    let dbContextName: string | null = null;
    for (const filePath of csFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const match = /(AddDbContext|AddDbContextPool|AddDbContextFactory)<([A-Za-z0-9_]+)>/i.exec(content);
      if (match) {
        dbContextName = match[2];
        break;
      }
    }

    for (const filePath of csFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const patched = this.patchHardcodedDbProviders(content);

      let finalContent = patched;

      // Layer 4: Auto-inject EnsureCreated() right before app.Run() if EF Core is used
      if ((finalContent.includes('app.Run()') || finalContent.includes('app.RunAsync()')) &&
        !finalContent.includes('EnsureCreated') &&
        !finalContent.includes('Migrate')) {

        let injection = '';
        if (dbContextName) {
          injection = `
// [Sandbox Injected] Auto-create database schema
try {
    using (var scope = app.Services.CreateScope()) {
        var db = scope.ServiceProvider.GetRequiredService<${dbContextName}>();
        db.Database.EnsureCreated();
    }
} catch (System.Exception ex) {
    System.Console.WriteLine("[Sandbox] EnsureCreated failed: " + ex.Message);
}
`;
        } else {
          injection = `
// [Sandbox Injected] Auto-create database schema via Reflection
try {
    using (var scope = app.Services.CreateScope()) {
        var dbContextTypes = System.AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic)
            .SelectMany(a => { try { return a.GetTypes(); } catch { return new System.Type[0]; } })
            .Where(t => typeof(Microsoft.EntityFrameworkCore.DbContext).IsAssignableFrom(t) && !t.IsAbstract);
        foreach (var type in dbContextTypes) {
            try {
                var db = scope.ServiceProvider.GetService(type) as Microsoft.EntityFrameworkCore.DbContext;
                if (db != null) db.Database.EnsureCreated();
            } catch {}
        }
    }
} catch (System.Exception ex) {
    System.Console.WriteLine("[Sandbox] Reflection EnsureCreated failed: " + ex.Message);
}
`;
        }

        finalContent = finalContent.replace(/(app\.Run(?:Async)?\(\)\s*;)/, `${injection}\n$1`);
      }

      if (finalContent !== content) {
        warnings.push(`Patched Sandbox DB logic in ${path.basename(filePath)}`);
        await fs.writeFile(filePath, finalContent, 'utf-8');
      }
    }

    // Ensure SQLite NuGet package is available for patched code
    if (csprojPath) {
      await this.ensureSqlitePackage(csprojPath);
    }

    return warnings;
  }

  /**
   * Layer 1: Write appsettings.Sandbox.json that overrides all common connection string keys.
   * ASP.NET Core loads appsettings.{ASPNETCORE_ENVIRONMENT}.json automatically and
   * values in environment-specific files override those in the base appsettings.json.
   */
  private async injectSandboxConfig(projectDir: string): Promise<void> {
    const sandboxConfig = {
      ConnectionStrings: {
        Default: "Data Source=sandbox.db",
        DefaultConnection: "Data Source=sandbox.db",
        StudentDb: "Data Source=sandbox.db",
        AppDbContext: "Data Source=sandbox.db",
        ApplicationDbContext: "Data Source=sandbox.db",
      },
      Logging: {
        LogLevel: { Default: "Warning" }
      }
    };

    const configPath = path.join(projectDir, 'appsettings.Sandbox.json');
    await fs.writeFile(configPath, JSON.stringify(sandboxConfig, null, 2));
    console.log(`[Sandbox] Layer 1: Injected appsettings.Sandbox.json into ${path.basename(projectDir)}`);
  }

  /**
   * Patches hardcoded ports like app.listen(3000) or .listen(5000)
   * to use process.env.PORT || 3000 so that Docker can correctly map 8080.
   */
  private async patchNodePorts(submissionPath: string): Promise<void> {
    const jsFiles = await this.findAllFiles(submissionPath, '.js');
    const tsFiles = await this.findAllFiles(submissionPath, '.ts');
    const filesToPatch = [...jsFiles, ...tsFiles];

    let patchCount = 0;
    for (const file of filesToPatch) {
      if (file.includes('node_modules')) continue;
      try {
        const content = await fs.readFile(file, 'utf-8');
        let patched = content;

        // Matches: .listen(3000) or listen(5000, ...)
        const listenPattern = /\.listen\s*\(\s*([0-9]{3,5})\s*[,)]/g;
        if (listenPattern.test(patched)) {
          listenPattern.lastIndex = 0;
          patched = patched.replace(listenPattern, (match, p1) => {
            return match.replace(p1, `(process.env.PORT || ${p1})`);
          });
        }

        // Matches: const port = 3001; or let PORT = 5000;
        const portVarPattern = /(const|let|var)\s+(port|PORT)\s*=\s*([0-9]{3,5})\b/gi;
        if (portVarPattern.test(patched)) {
          portVarPattern.lastIndex = 0;
          patched = patched.replace(portVarPattern, (match, p1, p2, p3) => {
            return `${p1} ${p2} = process.env.PORT || ${p3}`;
          });
        }

        if (patched !== content) {
          await fs.writeFile(file, patched, 'utf-8');
          patchCount++;
        }
      } catch (e) { }
    }
    if (patchCount > 0) {
      console.log(`[Sandbox] Node.js Port Patching: Patched ${patchCount} hardcoded port bindings.`);
    }
  }

  /**
   * Layer 3: Replace hardcoded UseSqlServer/UseNpgsql/UseMySql calls with UseSqlite.
   * Only modifies files in the temp submission directory, never the student's original.
   * 
   * Matches patterns like:
   *   .UseSqlServer("Server=localhost;Database=StudentDb;...")
   *   .UseNpgsql("Host=localhost;...")
   *   .UseMySql("Server=...;", ServerVersion.AutoDetect(...))
   */
  private patchHardcodedDbProviders(content: string): string {
    let patched = content;

    // Pattern 1: Hardcoded string literal as the first argument
    // e.g., .UseSqlServer("Server=...") -> .UseSqlite("Data Source=sandbox.db")
    patched = patched.replace(
      /\.(UseSqlServer|UseNpgsql|UseMySql|UseOracle)\s*\(\s*"[^"]+"/g,
      '.UseSqlite("Data Source=sandbox.db"'
    );

    // Pattern 2: Variable or configuration reference
    // e.g., .UseSqlServer(builder.Configuration.GetConnectionString("..."))
    // Just swap the method name. The injected appsettings will supply the SQLite connection string.
    patched = patched.replace(
      /\.(UseSqlServer|UseNpgsql|UseMySql|UseOracle)\b/g,
      '.UseSqlite'
    );

    // Pattern 3: Patch Database.Migrate() -> Database.EnsureCreated()
    // When we swap providers (e.g. SqlServer -> SQLite), existing migration files are incompatible
    // (they contain provider-specific SQL like NVARCHAR, IDENTITY etc.). Migrate() will crash.
    // EnsureCreated() builds the schema directly from the C# model, bypassing migrations entirely.
    patched = patched.replace(
      /\.Database\s*\.\s*Migrate\s*\(\s*\)/g,
      '.Database.EnsureCreated()'
    );
    patched = patched.replace(
      /\.Database\s*\.\s*MigrateAsync\s*\(\s*\)/g,
      '.Database.EnsureCreatedAsync()'
    );

    return patched;
  }

  /**
   * Ensure the .csproj has a PackageReference for Microsoft.EntityFrameworkCore.Sqlite
   * so that the patched UseSqlite() call compiles successfully.
   */
  private async ensureSqlitePackage(csprojPath: string): Promise<void> {
    let content = await fs.readFile(csprojPath, 'utf-8');

    // ═══════════════════════════════════════════════════════════
    // SAFETY NET: Sanitize non-existent NuGet package versions
    // Students sometimes reference versions like "9.0.10" which
    // don't exist on NuGet, causing dotnet restore to abort.
    // We normalize patch versions to ".0" (e.g., 9.0.10 → 9.0.0)
    // which is guaranteed to exist for all major .NET packages.
    // ═══════════════════════════════════════════════════════════
    const versionSanitized = content.replace(
      /(<PackageReference\s+Include="[^"]*"\s+Version=")(\d+)\.(\d+)\.(\d+)(")/g,
      (match, prefix, major, minor, patch, suffix) => {
        const patchNum = parseInt(patch, 10);
        // If patch version is suspiciously high (likely non-existent), reset to 0
        if (patchNum > 5) {
          const sanitized = `${prefix}${major}.${minor}.0${suffix}`;
          console.log(`[Sandbox] Version sanitizer: ${major}.${minor}.${patch} → ${major}.${minor}.0`);
          return sanitized;
        }
        return match;
      }
    );
    if (versionSanitized !== content) {
      content = versionSanitized;
      await fs.writeFile(csprojPath, content, 'utf-8');
    }

    if (content.includes('Microsoft.EntityFrameworkCore.Sqlite')) {
      return; // Already referenced
    }

    // Detect EF Core version from existing package references
    const versionMatch = content.match(/Microsoft\.EntityFrameworkCore[^"]*"\s+Version="([^"]+)"/);
    let version = versionMatch ? versionMatch[1] : '8.0.0';

    // Ensure the detected version itself is safe (e.g., 9.0.0, not 9.0.10)
    const vParts = version.split('.');
    if (vParts.length >= 3 && parseInt(vParts[2], 10) > 5) {
      version = `${vParts[0]}.${vParts[1]}.0`;
    }

    const sqliteRef = `    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="${version}" />`;

    let patched: string;
    if (content.includes('</ItemGroup>')) {
      // Insert before first </ItemGroup>
      patched = content.replace('</ItemGroup>', `${sqliteRef}\n  </ItemGroup>`);
    } else {
      patched = content.replace('</Project>', `  <ItemGroup>\n${sqliteRef}\n  </ItemGroup>\n</Project>`);
    }

    await fs.writeFile(csprojPath, patched, 'utf-8');
    console.log(`[Sandbox] Layer 3: Added Microsoft.EntityFrameworkCore.Sqlite v${version} to ${path.basename(csprojPath)}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Utility methods
  // ═══════════════════════════════════════════════════════════════════

  private async waitUntilReady(container: any, baseUrl: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const inspect = await container.inspect();
        if (!inspect.State.Running) {
          throw new Error(`Container exited prematurely. Exit Code: ${inspect.State.ExitCode}. This usually indicates a compilation error or missing dependencies.`);
        }

        const containerIP = inspect.NetworkSettings?.IPAddress ||
          (inspect.NetworkSettings?.Networks ? (Object.values(inspect.NetworkSettings.Networks)[0] as any)?.IPAddress : null);

        const checkUrls = [baseUrl];
        if (containerIP) {
          checkUrls.unshift(`http://${containerIP}:8080`);
          checkUrls.unshift(`http://${containerIP}:3000`);
          checkUrls.unshift(`http://${containerIP}:5000`);
          checkUrls.unshift(`http://${containerIP}:5173`);
        }
        const gateway = inspect.NetworkSettings?.Networks ? (Object.values(inspect.NetworkSettings.Networks)[0] as any)?.Gateway : null;
        if (gateway) {
          const port = baseUrl.split(':').pop();
          checkUrls.push(`http://${gateway}:${port}`);
        }

        for (const url of checkUrls) {
          try {
            const response = await fetch(url);
            if (response.ok || response.status === 404) {
              return;
            }
          } catch (fetchErr) { }
        }
      } catch (e: any) {
        if (e.message?.includes('prematurely')) throw e;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Sandbox did not become ready within ${timeoutMs}ms`);
  }

  /**
   * Normalize any teacher/AI input to our clean ProjectType categories.
   * Maps legacy values like "backend", "frontend", "fullstack", "aspnet", "nodejs" etc. to clean types.
   */
  private normalizeProjectType(input: any): ProjectType {
    const t = String(input || "").toLowerCase().trim();
    if (["algorithm", "console"].includes(t)) return "algorithm";
    if (["backend", "api", "aspnet", "nodejs", "java", "python", "php", "golang"].includes(t)) return "backend";
    if (["frontend", "react", "angular", "vue", "blazor"].includes(t)) return "frontend";
    if (["fullstack", "web"].includes(t)) return "fullstack";
    if (["desktop", "wpf", "winforms", "winform"].includes(t)) return "desktop";
    if (["mobile", "maui", "xamarin", "flutter", "react-native"].includes(t)) return "mobile";
    if (["unity", "game"].includes(t)) return "unity";
    return "unknown";
  }

  private isServerRuntime(type: RuntimeStack): boolean {
    return ["aspnet", "blazor", "nodejs", "java", "python", "php", "golang", "fullstack_dotnet_node"].includes(type);
  }

  private async detectRuntimeStack(submissionPath: string): Promise<RuntimeStack> {
    try {
      // Unity detection (must come before generic C# detection)
      if (await this.findFile(submissionPath, 'ProjectSettings') ||
        await this.findFile(submissionPath, 'Assembly-CSharp.csproj') ||
        await this.findFile(submissionPath, '.unity')) return "unity_engine";

      const hasNode = await this.findFile(submissionPath, 'package.json');
      const hasCsproj = await this.findFile(submissionPath, '.csproj');

      const hasPubspec = await this.findFile(submissionPath, 'pubspec.yaml');
      if (hasPubspec) return "flutter";

      if (hasNode && hasCsproj) return "fullstack_dotnet_node";

      if (hasNode) return "nodejs";
      if (await this.findFile(submissionPath, 'pom.xml') || await this.findFile(submissionPath, 'build.gradle')) return "java";
      if (await this.findFile(submissionPath, 'requirements.txt') || await this.findFile(submissionPath, 'manage.py')) return "python";
      if (await this.findFile(submissionPath, 'go.mod')) return "golang";
      if (await this.findFile(submissionPath, 'composer.json') || await this.findFile(submissionPath, 'index.php')) return "php";

      const allCsprojs = await this.findAllFiles(submissionPath, '.csproj');
      if (allCsprojs.length > 0) {
        let hasWeb = false;
        let hasBlazor = false;
        let hasDesktop = false;
        for (const cp of allCsprojs) {
          try {
            const csprojContent = await fs.readFile(cp, 'utf-8');
            if (csprojContent.includes("Microsoft.NET.Sdk.Web")) hasWeb = true;
            if (csprojContent.includes("Microsoft.AspNetCore.Components")) hasBlazor = true;
            if (
              csprojContent.includes("<UseWPF>true</UseWPF>") ||
              csprojContent.includes("<UseWindowsForms>true</UseWindowsForms>") ||
              csprojContent.includes("-windows") ||
              csprojContent.includes("Microsoft.NET.Sdk.WindowsDesktop") ||
              csprojContent.includes("Microsoft.Maui")
            ) {
              hasDesktop = true;
            }
          } catch (e) { }
        }
        if (hasDesktop && !hasWeb) return "dotnet_desktop";
        if (hasWeb) return "aspnet";
        if (hasBlazor) return "blazor";
        if (hasDesktop) return "dotnet_desktop";
        return "dotnet_console";
      }
    } catch (e) {
      console.error(`[Sandbox] Runtime stack detection failed:`, e);
      return "unknown";
    }
  }

  private async findFile(dir: string, extensionOrName: string): Promise<string | null> {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        if (['bin', 'obj', '.git', 'node_modules'].includes(file.name)) continue;
        const found = await this.findFile(path.join(dir, file.name), extensionOrName);
        if (found) return found;
      } else if (file.name.endsWith(extensionOrName) || file.name === extensionOrName) {
        return path.join(dir, file.name);
      }
    }
    return null;
  }

  private async findAllFiles(dir: string, extensionOrName: string): Promise<string[]> {
    const results: string[] = [];
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        if (['bin', 'obj', '.git', 'node_modules', 'dist', 'build'].includes(file.name)) continue;
        results.push(...await this.findAllFiles(path.join(dir, file.name), extensionOrName));
      } else if (file.name.endsWith(extensionOrName) || file.name === extensionOrName) {
        results.push(path.join(dir, file.name));
      }
    }
    return results;
  }

  /**
   * Recursively find all .cs files, excluding bin/obj/node_modules/.git
   */
  private async findAllCsFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['bin', 'obj', 'node_modules', '.git'].includes(entry.name)) continue;
        results.push(...await this.findAllCsFiles(fullPath));
      } else if (entry.name.endsWith('.cs')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  private getFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, () => {
        const port = (srv.address() as net.AddressInfo).port;
        srv.close(() => resolve(port));
      });
      srv.on('error', reject);
    });
  }
}

