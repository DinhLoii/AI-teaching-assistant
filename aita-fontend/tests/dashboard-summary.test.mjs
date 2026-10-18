import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'

const { dashboardSummaryText } = createLoader()('lib/api/normalizers/dashboard.ts')

test('structured execution metadata becomes renderable text without claiming tests ran or leaking diagnostics', () => {
  const result = dashboardSummaryText({ runtimeStack: 'android', ready: false, limitation: '/private/workspace/compiler diagnostic' }, 'execution')
  assert.equal(typeof result, 'string')
  assert.match(result, /chưa chạy trên máy ảo/)
  assert.ok(!result.includes('/private'))
  assert.equal(dashboardSummaryText({ runtimeStack: 'console', ready: true, limitation: null }, 'execution'), 'Môi trường thực thi đã sẵn sàng.')
  assert.equal(dashboardSummaryText({ ready: false }, 'execution', false), 'Execution environment unavailable; see the detailed report.')
})

test('legacy text survives and malformed summary values always produce a string', () => {
  assert.equal(dashboardSummaryText('  Original feedback  ', 'review'), 'Original feedback')
  for (const value of [undefined, null, '', {}, [], { passed: 1, total: 2 }, 42, false]) {
    for (const kind of ['execution', 'testcases', 'review']) {
      assert.equal(typeof dashboardSummaryText(value, kind), 'string')
    }
  }
})
