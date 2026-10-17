import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('../aita-backend/src/modules/reports/application/report-range.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, Date })
const { reportRange } = exports
test('report windows use inclusive Vietnamese calendar dates, including midnight UTC boundaries', () => {
  const range = reportRange('30d', new Date('2026-10-15T17:01:00Z'))
  assert.equal(range.from, '2026-09-17')
  assert.equal(range.to, '2026-10-16')
  assert.equal(range.start.toISOString(), '2026-09-16T17:00:00.000Z')
  assert.equal(range.end.toISOString(), '2026-10-16T17:00:00.000Z')
  assert.equal(reportRange('7d', new Date('2026-10-16T12:00:00Z')).from, '2026-10-10')
})
test('custom ranges reject malformed, impossible, reversed and unbounded dates', () => {
  for (const [start, end] of [['2026-02-30', '2026-03-01'], ['bad', '2026-10-16'], ['2026-10-17', '2026-10-16'], ['2020-01-01', '2026-10-16']]) assert.throws(() => reportRange('custom', new Date(), start, end))
  const range = reportRange('custom', new Date(), '2024-02-29', '2024-02-29')
  assert.equal(range.end - range.start, 86400000)
})
test('year and configured semesters honor their real start dates; missing semester is not fabricated', () => {
  const now = new Date('2026-10-16T10:00:00Z')
  assert.equal(reportRange('year', now).from, '2026-01-01')
  assert.throws(() => reportRange('semester', now))
  const semester = reportRange('semester', now, undefined, undefined, { StartDate: new Date('2026-09-01T00:00:00Z'), EndDate: new Date('2026-12-31T00:00:00Z') })
  assert.equal(semester.from, '2026-09-01')
  assert.equal(semester.to, '2026-10-16')
})
