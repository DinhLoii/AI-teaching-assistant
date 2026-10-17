import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import ts from 'typescript'

function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(`../aita-backend/src/${file}`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const record = { exports: {} }
  const require = name => {
    if (name.endsWith('/realtime-bus.js')) return { realtimeBus: { publish() {}, subscribe() {} } }
    const key = Object.keys(mocks).find(key => name.endsWith(key))
    if (!key) throw Error(`Missing mock ${name}`)
    return mocks[key]
  }
  vm.runInNewContext(`(function(require,module,exports){${code}})`, { console, Date, Buffer, process, setInterval, clearInterval, setTimeout, clearTimeout })(require, record, record.exports)
  return record.exports
}
test('analytics events are coalesced, emitted after successful mutations and never emitted for failed writes or reads', async () => {
  const events = [], invalidated = []
  const { analyticsMutationEvents } = load('shared/infrastructure/analytics-realtime.ts', {
    'sse-service.js': { sseService: { broadcastToRole: (...args) => events.push(args) } },
    'memory-cache.js': { memoryCache: { invalidatePrefix: key => invalidated.push(key) } },
  })
  const call = (method, path, status) => {
    const res = new EventEmitter(); res.statusCode = status
    analyticsMutationEvents({ method, path }, res, () => {})
    assert.equal(events.length, 0)
    res.emit('finish')
  }
  call('GET', '/api/users', 200)
  call('POST', '/api/users', 400)
  call('POST', '/api/notifications/broadcast', 200)
  assert.equal(invalidated.length, 0)
  for (let i = 0; i < 20; i++) call('PATCH', '/api/submissions/id', 200)
  await new Promise(resolve => setTimeout(resolve, 200))
  assert.equal(events.length, 1)
  assert.equal(events[0][0], 'admin')
  assert.equal(events[0][1].type, 'ANALYTICS_INVALIDATED')
  assert.equal(events[0][1].payload, undefined, 'No student/user/grade payload is broadcast')
})
test('analytics invalidation reaches only authenticated admin streams, with cleanup', () => {
  const { sseService } = load('shared/infrastructure/sse-service.ts')
  const admin = [], student = []
  const a = sseService.register('admin-1', { write: value => admin.push(value) }, 'ADMIN')
  const b = sseService.register('student-1', { write: value => student.push(value) }, 'student')
  sseService.broadcastToRole('admin', { type: 'ANALYTICS_INVALIDATED' })
  assert.equal(admin.length, 1)
  assert.equal(student.length, 0)
  a(); b()
  assert.equal(sseService.connectedCount(), 0)
})
