/** Start a standalone React UI on the container's published port. */
export function frontendRuntimePlan(pkg: any, runDir: string) {
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies }
  const scripts = pkg.scripts || {}
  const vite = !!dependencies.vite && /\bvite\b/.test(scripts.dev || scripts.start || '')
  const cra = !!dependencies['react-scripts'] && /react-scripts\s+start/.test(scripts.start || '')
  if (!dependencies.react || (!vite && !cra)) return null
  const quote = (value: string) => `'${value.replace(/'/g, `'"'"'`)}'`
  const workspace = runDir.replace(/^\/app(?=\/|$)/, '/sandbox')
  const script = vite ? (/\bvite\b/.test(scripts.dev || '') ? 'dev' : 'start') : 'start'
  return {
    image: 'node:20-alpine',
    command: `set -eu
cp -a /app /sandbox
cd ${quote(workspace)}
if [ -f package-lock.json ]; then npm ci --include=dev --no-audit --no-fund; else npm install --include=dev --no-audit --no-fund; fi
export PORT=8080 HOST=0.0.0.0 BROWSER=none NODE_ENV=development
exec npm run ${script}${vite ? ' -- --host 0.0.0.0 --port 8080 --strictPort' : ''}`,
  }
}
