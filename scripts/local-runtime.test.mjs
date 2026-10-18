import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fingerprint, buildIsCurrent, parseOptions } from './local-runtime.mjs'

test('local build cache tracks content/configuration and requires actual output', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aita-local-test-'))
  try {
    await fs.mkdir(path.join(directory, 'src'))
    await fs.writeFile(path.join(directory, 'src', 'page.ts'), 'first')
    await fs.writeFile(path.join(directory, '.env'), 'SECRET=test-private-value')
    const inputs = ['src', '.env', 'optional-config.json']
    const hash = await fingerprint(directory, inputs, { proxy: 'http://127.0.0.1:3002' })
    assert.equal(hash, await fingerprint(directory, [...inputs].reverse(), { proxy: 'http://127.0.0.1:3002' }))
    assert.match(hash, /^[a-f0-9]{64}$/)
    const stamp = path.join(directory, 'stamp.json'), output = path.join(directory, 'BUILD_ID')
    await fs.writeFile(stamp, JSON.stringify({ hash }))
    assert.equal(await buildIsCurrent(stamp, hash, [output]), false)
    await fs.writeFile(output, 'build-1')
    assert.equal(await buildIsCurrent(stamp, hash, [output]), true)
    await fs.writeFile(path.join(directory, 'src', 'page.ts'), 'second')
    const changed = await fingerprint(directory, inputs, { proxy: 'http://127.0.0.1:3002' })
    assert.notEqual(changed, hash)
    assert.equal(await buildIsCurrent(stamp, changed, [output]), false)
    await fs.writeFile(path.join(directory, 'src', 'page.ts'), 'first')
    await fs.writeFile(path.join(directory, 'optional-config.json'), '{}')
    assert.notEqual(await fingerprint(directory, inputs, { proxy: 'http://127.0.0.1:3002' }), hash)
    assert.notEqual(await fingerprint(directory, inputs, { proxy: 'http://127.0.0.1:3003' }), hash)
    assert.equal((await fs.readFile(stamp, 'utf8')).includes('test-private-value'), false)
    await fs.writeFile(stamp, 'broken stamp')
    assert.equal(await buildIsCurrent(stamp, hash, [output]), false)
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()))
    assert.ok(path.basename(directory).startsWith('aita-local-test-'))
    await fs.rm(directory, { recursive: true, force: true })
  }
})

test('local ports are separate, configurable, and validated', () => {
  assert.deepEqual(parseOptions([]), { port: 5194, apiPort: 3002, buildOnly: false })
  assert.deepEqual(parseOptions(['--port', '5195', '--api-port', '3003', '--build-only']), { port: 5195, apiPort: 3003, buildOnly: true })
  for (const args of [['--port'], ['--port', '0'], ['--port', '65536'], ['--api-port', 'abc'], ['--port', '3002'], ['--unknown']]) {
    assert.throws(() => parseOptions(args))
  }
})
