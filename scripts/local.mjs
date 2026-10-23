import fs from 'node:fs/promises'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { fingerprint, buildIsCurrent, parseOptions } from './local-runtime.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontend = path.join(root, 'aita-fontend'), backend = path.join(root, 'aita-backend')
const children = new Set()
const shutdown = new AbortController()
let stopping = false

function launch(entry, args, cwd, env) {
  const child = spawn(process.execPath, [entry, ...args], { cwd, env, stdio: 'inherit', windowsHide: true })
  children.add(child)
  child.once('exit', () => children.delete(child))
  return child
}

function run(entry, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = launch(entry, args, cwd, env)
    child.once('error', reject)
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(Error(`Tiến trình kết thúc: ${code ?? signal}`)))
  })
}

async function freePort(port) {
  await new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', () => reject(Error(`Cổng ${port} đang được sử dụng. Hãy dừng phiên local trước hoặc chọn --port / --api-port khác.`)))
    probe.listen(port, '127.0.0.1', () => probe.close(resolve))
  })
}

async function ensureBuild(name, cwd, inputs, outputs, entry, args, env, settings) {
  const stamp = path.join(root, '.cache', 'local', `${name}.json`)
  const hash = await fingerprint(cwd, inputs, settings)
  if (await buildIsCurrent(stamp, hash, outputs.map(file => path.join(cwd, file)))) {
    console.log(`[local] ${name}: dùng lại bản dựng, mã nguồn không đổi.`)
    return
  }
  console.log(`[local] ${name}: đang tạo bản tối ưu; chỉ dựng lại khi mã nguồn hoặc cấu hình thay đổi.`)
  await run(entry, args, cwd, env)
  // If sources change mid-build, leave the original hash so the next run rebuilds.
  await fs.mkdir(path.dirname(stamp), { recursive: true })
  await fs.writeFile(stamp, JSON.stringify({ hash }))
}

async function waitFor(url, child, timeout = 25000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (stopping) throw Error('Phiên local đã dừng.')
    if (child.exitCode !== null || child.signalCode !== null) throw Error('Máy chủ dừng trước khi sẵn sàng.')
    try {
      const response = await fetch(url, { signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(1500)]) })
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw Error(`Máy chủ chưa sẵn sàng: ${url}`)
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  shutdown.abort()
  process.exitCode = code
  for (const child of children) child.kill('SIGTERM')
}
process.once('SIGINT', () => stop())
process.once('SIGTERM', () => stop())

async function main() {
  const { port, apiPort, buildOnly } = parseOptions(process.argv.slice(2))
  if (!buildOnly) await Promise.all([freePort(port), freePort(apiPort)])
  const next = path.join(frontend, 'node_modules', 'next', 'dist', 'bin', 'next')
  const tsc = path.join(backend, 'node_modules', 'typescript', 'bin', 'tsc')
  try { await Promise.all([fs.access(next), fs.access(tsc)]) }
  catch { throw Error('Thiếu thư viện. Chạy npm ci trong aita-fontend và aita-backend trước.') }
  const proxy = `http://127.0.0.1:${apiPort}`
  const webEnv = {
    ...process.env, NODE_ENV: 'production', AITA_LOCAL_BUILD: '1',
    API_PROXY_TARGET: proxy, NEXT_PUBLIC_API_URL: '/api', NEXT_TELEMETRY_DISABLED: '1',
  }
  // Use the existing local credentials without production-only seed/sync side effects.
  const apiEnv = {
    ...process.env, NODE_ENV: 'development', PORT: String(apiPort),
    FRONTEND_URL: `http://localhost:${port}`, CORS_ORIGIN: `http://localhost:${port}`,
    ENABLE_DEV_SEED: 'false', LOG_LEVEL: process.env.LOG_LEVEL || 'warn',
  }
  await ensureBuild('backend', backend,
    ['src', 'scripts/build.mjs', 'scripts/fix-esm-imports.mjs', 'prisma/schema.prisma', 'package.json', 'package-lock.json', 'tsconfig.json'],
    ['dist/server.js'], path.join(backend, 'scripts/build.mjs'), [], apiEnv, {})
  if (stopping) return
  await ensureBuild('frontend', frontend,
    ['src', 'public', 'package.json', 'package-lock.json', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json', 'tsconfig.local.json', '.env', '.env.local', '.env.production', '.env.production.local'],
    ['.next-local/BUILD_ID', '.next-local/server', '.next-local/routes-manifest.json'],
    next, ['build', '--webpack'], webEnv, { proxy, publicApi: '/api' })
  if (buildOnly || stopping) return
  const api = launch(path.join(backend, 'dist/server.js'), [], backend, apiEnv)
  api.once('error', error => { console.error(error.message); stop(1) })
  api.once('exit', code => { if (!stopping) stop(code || 1) })
  await waitFor(`${proxy}/api/health`, api)
  if (stopping) return
  console.log('[local] Đang kiểm tra và làm ấm kết nối cơ sở dữ liệu…')
  const readiness = await fetch(`${proxy}/api/ready`, { signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(30000)]) })
  if (!readiness.ok) throw Error('Cơ sở dữ liệu chưa sẵn sàng. Kiểm tra kết nối và migration trước khi dùng ứng dụng.')
  if (stopping) return
  const web = launch(next, ['start', '--hostname', '::', '--port', String(port)], frontend, webEnv)
  web.once('error', error => { console.error(error.message); stop(1) })
  web.once('exit', code => { if (!stopping) stop(code || 1) })
  await waitFor(`http://127.0.0.1:${port}/login`, web)
  console.log(`\n[local] Sẵn sàng: http://localhost:${port}`)
  console.log('[local] Các trang đã biên dịch sẵn. Ctrl+C để dừng cả hai máy chủ.')
  console.log('[local] Sau khi sửa code: dừng và chạy lại npm run local để cập nhật. Chế độ chỉnh sửa vẫn dùng npm run dev trong từng thư mục.')
}

main().catch(error => { if (!stopping) { console.error(`[local] ${error.message}`); stop(1) } })
