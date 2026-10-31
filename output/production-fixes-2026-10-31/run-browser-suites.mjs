import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
const run = promisify(execFile)
const cwd = path.resolve('aita-fontend')
const output = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))
const results = []
await fs.mkdir(path.join(output, 'screenshots'), { recursive: true })
for (const file of (await fs.readdir(path.join(cwd, 'tests'))).filter(f => f.endsWith('.browser.cjs')).sort()) {
  const start = Date.now()
  try {
    const result = await run(process.execPath, [path.join('tests', file)], { cwd, env: { ...process.env, TEST_BASE_URL: 'http://localhost:5174', TEST_ARTIFACT_DIR: path.join(output, 'screenshots') }, timeout: 90000, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
    await fs.writeFile(path.join(output, file + '.log'), result.stdout + result.stderr)
    results.push({ file, status: 'passed', seconds: Math.round((Date.now() - start) / 1000) })
  } catch (error) {
    await fs.writeFile(path.join(output, file + '.log'), (error.stdout || '') + (error.stderr || '') + '\n' + error.message)
    results.push({ file, status: error.killed ? 'timeout' : 'failed', seconds: Math.round((Date.now() - start) / 1000), error: String(error.stderr || error.message).slice(-900) })
  }
  await fs.writeFile(path.join(output, 'browser-suites.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results.at(-1)))
}
console.log(JSON.stringify({ total: results.length, passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status !== 'passed').length }))
