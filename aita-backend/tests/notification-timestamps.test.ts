import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { planNotificationTimestampRepairs } from '../src/modules/notifications/application/notification-timestamp-repair.js'

test('historical repair uses a unique matching event; ambiguity, other students and known dates are preserved', () => {
  const date = new Date('2026-10-18T08:10:11Z')
  const notification = (Id: string, Type = 'NEW_SUBMISSION', extra = {}) => ({ Id, Type, ReferenceId: 'exam-a', ReferenceType: 'ASSIGNMENT_GRADING', CreatedBy: 'student-a', CreatedAt: null, ...extra })
  const event = (AttemptNumber: number, extra = {}) => ({ ExamId: 'exam-a', StudentId: 'student-a', AttemptNumber, SubmittedAt: date, ...extra })
  const rows = [notification('initial'), notification('resubmit', 'RESUBMISSION'), notification('known', 'NEW_SUBMISSION', { CreatedAt: date }), notification('other', 'NEW_SUBMISSION', { CreatedBy: 'student-b' }), notification('unknown', 'FEEDBACK')]
  const result = planNotificationTimestampRepairs(rows, [event(1), event(2)])
  assert.deepEqual(result.repairs.map(row => [row.id, row.createdAt.toISOString(), row.source]), [
    ['initial', date.toISOString(), 'submission_event'], ['resubmit', date.toISOString(), 'submission_event'],
  ])
  assert.equal(result.unresolved, 2)
  assert.deepEqual(planNotificationTimestampRepairs([notification('resubmit', 'RESUBMISSION')], [event(2), event(3)]).repairs, [])
  assert.deepEqual(planNotificationTimestampRepairs([notification('initial')], [event(0), event(1, { SubmittedAt: new Date('invalid') })]).repairs, [])
})

test('every direct notification creator persists CreatedAt, and the database provides a default', () => {
  const root = path.resolve('src')
  let creators = 0
  function visit(directory: string) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) { visit(file); continue }
      if (!file.endsWith('.ts')) continue
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
      function inspect(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'create' &&
          ts.isPropertyAccessExpression(node.expression.expression) && node.expression.expression.name.text === 'notification') {
          const argument = node.arguments[0]
          assert.ok(argument && ts.isObjectLiteralExpression(argument), file)
          const data = argument.properties.find(property => property.name?.getText(source) === 'data') as ts.PropertyAssignment | undefined
          assert.ok(data && ts.isObjectLiteralExpression(data.initializer), file)
          assert.ok(data.initializer.properties.some(property => property.name?.getText(source) === 'CreatedAt'), `Missing persisted CreatedAt: ${file}`)
          creators++
        }
        ts.forEachChild(node, inspect)
      }
      inspect(source)
    }
  }
  visit(root)
  assert.ok(creators >= 10)
  assert.match(fs.readFileSync('prisma/schema.prisma', 'utf8'), /model Notification \{[^}]*CreatedAt\s+DateTime\?\s+@default\(now\(\)\)/)
})
