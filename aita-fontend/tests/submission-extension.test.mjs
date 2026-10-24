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

test('deadline notification versions change for extensions while read status does not trigger a reload', () => {
  const { assignmentNoticeVersion } = createLoader()('lib/events/assignments.ts')
  const notice = { id: 'extension', type: 'ASSIGNMENT_REOPENED', message: 'New deadline: 22:18', createdAt: '2026-10-24T14:30:00Z' }
  assert.ok(assignmentNoticeVersion(notice))
  assert.equal(assignmentNoticeVersion({ ...notice, isRead: true }), assignmentNoticeVersion(notice))
  assert.notEqual(assignmentNoticeVersion({ ...notice, message: 'New deadline: 23:18' }), assignmentNoticeVersion(notice))
  assert.equal(assignmentNoticeVersion({ ...notice, type: 'SYSTEM' }), null)
})

test('deadline updates clear cached assignment, submission and dashboard snapshots before refreshing views', async () => {
  const events = []
  let due = '2026-10-18T00:00:00Z'
  const storage = { getItem: key => key === 'aita_token' ? 'student' : null }
  const load = createLoader({
    localStorage: storage, sessionStorage: storage, Event,
    window: { dispatchEvent: event => events.push(event.type) },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ data: { due } }) }),
  })
  const { request, peekClientApiCache } = load('lib/api/client.ts')
  const { emitAssignmentsChanged, ASSIGNMENTS_EVENT } = load('lib/events/assignments.ts')
  const paths = ['/student-portal/dashboard', '/student-portal/classes/class', '/assignments?view=summary', '/assignments/exam', '/submissions?view=summary']
  for (const path of paths) await request(path)
  due = '2026-10-24T15:18:00Z'
  emitAssignmentsChanged()
  assert.deepEqual(events, [ASSIGNMENTS_EVENT])
  for (const path of paths) {
    assert.equal(peekClientApiCache(path), undefined)
    assert.equal((await request(path)).due, due)
  }
})
