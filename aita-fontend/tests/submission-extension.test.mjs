import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'

const { normalizeSubmissionRow } = createLoader()('lib/api/normalizers/submission.ts')
test('extension target preserves the student account ID independently of submission ID and student code', () => {
  const row = normalizeSubmissionRow({ id: 'submission-id', studentId: 'user-id', student: { fullName: 'Student', studentCode: 'HE170002' }, extendedDueDate: '2030-01-01T00:00:00.000Z' })
  assert.equal(row.id, 'submission-id')
  assert.equal(row.studentId, 'HE170002')
  assert.equal(row.studentUserId, 'user-id')
  assert.equal(row.extendedDueDate, '2030-01-01T00:00:00.000Z')
  assert.equal(normalizeSubmissionRow({ id: 'submission-only' }).studentUserId, null)
})
