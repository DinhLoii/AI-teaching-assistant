import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'

function deferred() { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => ({ success: status < 400, data, message: 'fixture failure' }) })
const storage = () => ({ getItem: () => null, setItem() {}, removeItem() {} })
function setup(fetch) { return createLoader({ fetch, localStorage: storage(), sessionStorage: storage(), window: { location: { pathname: '/lecturer' } } })('features/submissions/load-workspace.ts') }

test('workspace displays submission rows before delayed metadata and roster complete', async () => {
  const metadata = deferred(), roster = deferred(), rowsReady = deferred()
  const requests = [], events = []
  const { loadSubmissionWorkspace } = setup(async url => {
    requests.push(url)
    if (url.includes('/assignments/')) return metadata.promise
    if (url.includes('/classes/')) return roster.promise
    return response([{ id: 'submission', studentId: 'student', totalScore: 7 }])
  })
  const loading = loadSubmissionWorkspace('exam', {
    assignment: value => events.push(['assignment', value.id]),
    roster: value => events.push(['roster', value.length]),
    submissions: value => events.push(['submissions', value[0].id]),
    submissionsError: error => { throw error },
    submissionsSettled: () => { events.push(['table-ready']); rowsReady.resolve() },
  })
  await rowsReady.promise
  assert.deepEqual(events, [['submissions', 'submission'], ['table-ready']])
  assert.ok(requests.includes('/api/assignments/exam?view=summary'))
  assert.ok(requests.includes('/api/submissions?assignmentId=exam&view=summary'))
  metadata.resolve(response({ id: 'exam', classId: 'class' }))
  roster.resolve(response([{ id: 'student' }]))
  await loading
  assert.deepEqual(events.slice(2), [['assignment', 'exam'], ['roster', 1]])
})

test('failed submission reads expose the error and stop loading without inventing an empty successful result', async () => {
  const events = []
  const { loadSubmissionWorkspace } = setup(async url => url.includes('/submissions') ? response(null, 500) : response({ id: 'exam' }))
  await assert.rejects(loadSubmissionWorkspace('exam', {
    assignment() {}, roster() {}, submissions: () => events.push('rows'),
    submissionsError: () => events.push('error'), submissionsSettled: () => events.push('settled'),
  }), /fixture failure/)
  assert.deepEqual(events, ['error', 'settled'])
})
