import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'

function deferred() { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => ({ success: status < 400, data, message: 'fixture failure' }) })
const storage = () => ({ getItem: () => null, setItem() {}, removeItem() {} })
function setup(fetch) { return createLoader({ fetch, localStorage: storage(), sessionStorage: storage(), window: { location: { pathname: '/student' } } })('features/assignments/load-student-assignment.ts') }

test('assignment content becomes usable before delayed enrichment and submission history', async () => {
  const enrichment = deferred(), history = deferred(), ready = deferred()
  const events = [], requests = []
  const { loadStudentAssignment } = setup(async url => {
    requests.push(url)
    if (url.includes('/grading/')) return enrichment.promise
    if (url.includes('/submissions')) return history.promise
    return response({ id: 'exam', content: 'Original document' })
  })
  const loading = loadStudentAssignment('exam', {
    assignment: (value, grading) => events.push(['document', value.content, grading?.rubric || null]),
    assignmentError: error => { throw error }, assignmentSettled: () => ready.resolve(),
    submission: value => events.push(['submission', value?.id]), submissionError: error => { throw error },
  })
  await ready.promise
  assert.deepEqual(events, [['document', 'Original document', null]])
  assert.ok(requests.includes('/api/submissions?assignmentId=exam&view=summary'))
  enrichment.resolve(response({ rubric: 'Actual rubric' }))
  history.resolve(response([{ id: 'old', submittedAt: '2026-01-01' }, { id: 'new', submittedAt: '2026-02-01' }]))
  await loading
  assert.ok(events.some(value => value[2] === 'Actual rubric'))
  assert.ok(events.some(value => value[0] === 'submission' && value[1] === 'new'))
})

test('history failure is reported separately without replacing a valid document or inventing a missing submission', async () => {
  const events = []
  const { loadStudentAssignment } = setup(async url => response(url.includes('/submissions') ? null : { id: 'exam' }, url.includes('/submissions') ? 500 : 200))
  await loadStudentAssignment('exam', {
    assignment: () => events.push('document'), assignmentSettled: () => events.push('ready'),
    assignmentError: () => events.push('document-error'), submission: () => events.push('submission'),
    submissionError: () => events.push('history-error'),
  })
  assert.ok(events.includes('document'))
  assert.ok(events.includes('ready'))
  assert.ok(events.includes('history-error'))
  assert.ok(!events.includes('submission'))
  assert.ok(!events.includes('document-error'))
})
