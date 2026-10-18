import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { fixEsmImports } from './fix-esm-imports.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
try {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc')], { cwd: root, stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', code => code === 0 ? resolve() : reject(Error(`TypeScript build failed (${code})`)))
  })
  const count = await fixEsmImports(path.join(root, 'dist'))
  console.log(`[build] Node ESM imports ready (${count} legacy paths normalized).`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
