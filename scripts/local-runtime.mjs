import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function fingerprint(root, inputs, settings = {}) {
  const hash = createHash('sha256')
  hash.update(JSON.stringify({ node: process.version, ...settings }))
  async function visit(relative) {
    const file = path.join(root, relative)
    let stat
    try { stat = await fs.stat(file) } catch (error) {
      if (error.code !== 'ENOENT') throw error
      hash.update(`missing:${relative}`)
      return
    }
    if (stat.isDirectory()) {
      for (const entry of (await fs.readdir(file)).sort()) await visit(path.join(relative, entry))
    } else {
      hash.update(relative.replaceAll('\\', '/'))
      hash.update('\0')
      hash.update(await fs.readFile(file))
      hash.update('\0')
    }
  }
  for (const input of [...inputs].sort()) await visit(input)
  return hash.digest('hex')
}

export async function buildIsCurrent(stamp, hash, outputs) {
  try {
    const record = JSON.parse(await fs.readFile(stamp, 'utf8'))
    if (record.hash !== hash) return false
    await Promise.all(outputs.map(file => fs.access(file)))
    return true
  } catch { return false }
}

export function parseOptions(args) {
  const result = { port: 5194, apiPort: 3002, buildOnly: false }
  for (let index = 0; index < args.length; index++) {
    const option = args[index]
    if (option === '--build-only') result.buildOnly = true
    else if (option === '--port' || option === '--api-port') {
      const port = Number(args[++index])
      if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error(`Cổng không hợp lệ: ${option}`)
      result[option === '--port' ? 'port' : 'apiPort'] = port
    } else throw Error(`Tham số không được hỗ trợ: ${option}`)
  }
  if (result.port === result.apiPort) throw Error('Frontend và backend cần hai cổng khác nhau.')
  return result
}
