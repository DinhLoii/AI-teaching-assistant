import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { parse } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const loadConfig = require('next/dist/server/config').default
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')
const { proxyRequest } = require('next/dist/server/lib/router-utils/proxy-request')

test('upload proxy accepts a response beyond the previous 30-second cutoff', { skip: process.env.TEST_UPLOAD_PROXY !== 'true', timeout: 45000 }, async () => {
  const config = await loadConfig(PHASE_DEVELOPMENT_SERVER, process.cwd())
  assert.equal(config.experimental.proxyTimeout, 120000)
  const timers = new Set()
  let received = ''
  const api = http.createServer(async (req, res) => {
    for await (const part of req) received += part
    const timer = setTimeout(() => { timers.delete(timer); res.writeHead(201, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ accepted: true })) }, 31000)
    timers.add(timer)
  })
  const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) })
  await listen(api)
  const proxy = http.createServer((req, res) => {
    void proxyRequest(req, res, parse(`http://127.0.0.1:${api.address().port}/api/submissions`, true), undefined, undefined, config.experimental.proxyTimeout).catch(() => {})
  })
  try {
    await listen(proxy)
    const result = await fetch(`http://127.0.0.1:${proxy.address().port}/api/submissions`, { method: 'POST', body: 'fixture-upload', signal: AbortSignal.timeout(40000) })
    assert.equal(result.status, 201)
    assert.deepEqual(await result.json(), { accepted: true })
    assert.equal(received, 'fixture-upload')
  } finally {
    for (const timer of timers) clearTimeout(timer)
    await close(proxy)
    await close(api)
  }
})
