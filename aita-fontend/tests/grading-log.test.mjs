import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'
const load = createLoader()
const { serverLogs, acceptsProgress, logStage } = load('features/grading/grading-log.ts')
const { reportFacts } = load('features/submissions/report-facts.ts')

test('logs retain server timestamps, deduplicate reconnect snapshots and do not fabricate missing history', () => {
  assert.equal(serverLogs(undefined).length, 0)
  const event = { id: 'real-run:1', timestamp: '2026-10-19T10:00:00Z', message: 'Compiler failed', state: 'failed' }
  const logs = serverLogs([event, event, { message: 'No timestamp' }])
  assert.equal(logs.length, 1)
  assert.equal(logs[0].message, event.message)
  assert.equal(logs[0].timestamp, event.timestamp)
})

test('pipeline filters group actual events without inventing an execution stage for generic messages', () => {
  assert.equal(logStage('Compiling submission A source'), 2)
  assert.equal(logStage('Đang phân tích: Cấu trúc dữ liệu'), 3)
  assert.equal(logStage('Đang lưu báo cáo đánh giá...'), 4)
  assert.equal(logStage('Initialize the execution environment (Sandbox)...'), 1)
  assert.equal(logStage('Running Source Analysis (Source Snapshot)...'), 0)
  assert.equal(logStage('Waiting in queue...'), null)
  assert.equal(logStage('[Tệp gốc] Đã đọc ZIP', 0), 0)
  assert.equal(logStage('[Dọn dẹp] Đã xóa container', 1), 1)
  assert.equal(logStage('Biên dịch', 1), 1)
  assert.equal(logStage('Waiting in queue...', 99), null)
})

test('a different submission or stale grading attempt cannot overwrite the current run', () => {
  const current = { submissionId: 'a', requestVersion: 20, attempt: 2, state: 'processing' }
  assert.equal(acceptsProgress('a', current, { ...current, submissionId: 'b' }), false)
  assert.equal(acceptsProgress('a', current, { ...current, requestVersion: 19 }), false)
  assert.equal(acceptsProgress('a', current, { ...current, attempt: 1 }), false)
  assert.equal(acceptsProgress('a', current, { ...current, attempt: 3 }), true)
  assert.equal(acceptsProgress('a', { ...current, state: 'completed' }, current), false)
})

test('completed grading is distinct from passing tests and an unknown score is never 9.5', () => {
  const empty = reportFacts({ id: 'a' })
  assert.equal(empty.score, null)
  assert.equal(empty.compilation, null)
  assert.equal(empty.testExecuted, 0)
  const actual = reportFacts({ id: 'a', score: 1.3, reportData: { submissionId: 'a', consoleVerification: { status: 'completed', caseResults: [{ caseId: 'TC01', passed: true }, { caseId: 'TC02', passed: false }, { caseId: 'TC03', passed: null }] }, compilationSummary: { passed: true } } })
  assert.equal(actual.score, 1.3)
  assert.equal(actual.testPassed, 1)
  assert.equal(actual.testExecuted, 2)
  assert.equal(actual.compilation, true)
})
