import assert from 'node:assert/strict'
import test from 'node:test'
import { createLoader } from './helpers/load-typescript.mjs'

function setup(fetch, globals = {}) {
  const values = new Map([['aita_token', 'user-a']])
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
  const load = createLoader({ fetch, localStorage, sessionStorage: { getItem: () => null }, window: {}, ...globals })
  return { ...load('lib/api/client.ts'), load, localStorage }
}
const response = data => ({ ok: true, status: 200, json: async () => ({ data }) })
function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

test('concurrent page reads and subsequent navigation share one request', async () => {
  let calls = 0
  const pending = deferred()
  const api = setup(() => { calls++; return pending.promise })
  const a = api.request('/classes'), b = api.request('/classes')
  assert.equal(calls, 1)
  pending.resolve(response(['class-a']))
  assert.deepEqual(await a, await b)
  await api.request('/classes')
  assert.equal(calls, 1)
})

test('reading a notification preserves unrelated page cache', async () => {
  const calls = []
  const api = setup(async url => { calls.push(url); return response([]) })
  await api.request('/assignments')
  await api.request('/notifications')
  await api.request('/student-portal/dashboard')
  await api.request('/notifications/read-all', { method: 'PUT' })
  await api.request('/assignments')
  await api.request('/notifications')
  await api.request('/student-portal/dashboard')
  assert.equal(calls.filter(url => url === '/api/assignments').length, 1)
  assert.equal(calls.filter(url => url === '/api/notifications').length, 2)
  assert.equal(calls.filter(url => url === '/api/student-portal/dashboard').length, 2)
})

test('an old read cannot repopulate the cache after mutation or remove a newer in-flight read', async () => {
  const old = deferred(), fresh = deferred()
  let reads = 0
  const api = setup((_url, options) => options.method === 'POST'
    ? Promise.resolve(response({}))
    : (++reads === 1 ? old.promise : fresh.promise))
  const before = api.request('/assignments')
  await api.request('/assignments', { method: 'POST' })
  const after = api.request('/assignments')
  old.resolve(response(['old']))
  await before
  assert.equal(api.peekClientApiCache('/assignments'), undefined)
  const joined = api.request('/assignments')
  assert.equal(reads, 2)
  fresh.resolve(response(['new']))
  await Promise.all([after, joined])
  assert.equal(api.peekClientApiCache('/assignments')[0], 'new')
})

test('assignment mutations preserve master data and profile while refreshing related lists', async () => {
  const calls = []
  const api = setup(async (url, options) => { calls.push([url, options.method || 'GET']); return response([]) })
  const preserved = ['/subjects', '/semesters', '/configs', '/users/me']
  const affected = ['/assignments', '/grading/assignments/trash', '/classes?page=1', '/submissions', '/student-portal/dashboard']
  for (const path of [...preserved, ...affected]) await api.request(path)
  await api.request('/grading/assignments/a/hard-delete', { method: 'DELETE' })
  for (const path of [...preserved, ...affected]) await api.request(path)
  for (const path of preserved) assert.equal(calls.filter(([url]) => url === '/api' + path).length, 1, path)
  for (const path of affected) assert.equal(calls.filter(([url]) => url === '/api' + path).length, 2, path)
})

test('unrelated pending reads remain cacheable during a mutation', async () => {
  const pending = deferred()
  let reads = 0
  const api = setup((_url, options) => options.method === 'DELETE'
    ? Promise.resolve(response({})) : (++reads, pending.promise))
  const subjects = api.request('/subjects')
  await api.request('/submissions/a', { method: 'DELETE' })
  pending.resolve(response(['subject-a']))
  await subjects
  assert.equal(await api.request('/subjects').then(rows => rows[0]), 'subject-a')
  assert.equal(reads, 1)
})

test('domain mutations invalidate dependencies without evicting unrelated resources', async () => {
  for (const [mutation, affected, preserved] of [
    ['/classes/a', '/student-portal/subjects', '/semesters'],
    ['/submissions/a', '/assignments?view=summary', '/subjects'],
    ['/prompts/a', '/prompts/subject/a', '/classes'],
    ['/settings', '/settings', '/assignments?view=summary'],
    ['/semesters/a', '/classes', '/users/me'],
  ]) {
    const api = setup(async () => response([]))
    await api.request(affected)
    await api.request(preserved)
    await api.request(mutation, { method: 'PUT' })
    assert.equal(api.peekClientApiCache(affected), undefined, mutation)
    assert.ok(api.peekClientApiCache(preserved), mutation)
  }
})

test('grading polls bypass the browser cache and request fresh server data', async () => {
  let calls = 0
  const api = setup(async (_url, options) => {
    calls++
    if (calls > 1) {
      assert.equal(options.cache, 'no-store')
      assert.equal(new Headers(options.headers).get('Cache-Control'), 'no-cache')
    }
    return response([{ id: 'sub-a', gradingStatus: calls > 1 ? 'Graded' : 'Processing' }])
  })
  const { submissionsApi } = api.load('lib/api/modules/submissions.ts')
  assert.equal((await submissionsApi.getSubmissions({ assignmentId: 'a' }))[0].gradingStatus, 'Processing')
  assert.equal((await submissionsApi.getSubmissions({ assignmentId: 'a' }, true))[0].gradingStatus, 'Graded')
  assert.equal(calls, 2)
})

test('switching accounts isolates both cached data and pending requests', async () => {
  const old = deferred()
  let calls = 0
  const api = setup(() => ++calls === 1 ? old.promise : Promise.resolve(response(['user-b-data'])))
  const before = api.request('/submissions')
  api.setClientApiCache('/classes', ['user-a-data'])
  api.localStorage.setItem('aita_token', 'user-b')
  assert.equal(api.peekClientApiCache('/classes'), undefined)
  await api.request('/submissions')
  old.resolve(response(['user-a-data']))
  await before
  assert.equal(api.peekClientApiCache('/submissions')[0], 'user-b-data')
})

test('explicit no-store and Cache-Control bypass cache without replacing it', async () => {
  let calls = 0
  const api = setup(async () => response(++calls))
  assert.equal(await api.request('/prompts'), 1)
  assert.equal(await api.request('/prompts', { cache: 'no-store' }), 2)
  assert.equal(await api.request('/prompts', { headers: new Headers({ 'cache-control': 'no-cache' }) }), 3)
  assert.equal(await api.request('/prompts'), 1)
})

test('stale navigation returns immediately and shares one background refresh', async () => {
  let now = 0, calls = 0
  const pending = deferred()
  class Clock extends Date { static now() { return now } }
  const api = setup(() => ++calls === 1 ? Promise.resolve(response('cached')) : pending.promise, { Date: Clock })
  await api.request('/classes')
  now = 26_000
  assert.equal(await api.request('/classes'), 'cached')
  assert.equal(await api.request('/classes'), 'cached')
  assert.equal(calls, 2)
  now = 250_000
  const joined = api.request('/classes')
  pending.resolve(response('fresh'))
  assert.equal(await joined, 'fresh')
  assert.equal(calls, 2)
})

test('hover prefetch and page load deduplicate API reads; unknown routes do no work', async () => {
  let calls = 0
  const pending = deferred()
  const api = setup(() => { calls++; return pending.promise })
  const { prefetchPageData } = api.load('lib/api/prefetch.ts')
  prefetchPageData('/unknown')
  assert.equal(calls, 0)
  prefetchPageData('/student/results')
  prefetchPageData('/student/results')
  const pageLoad = api.request('/submissions')
  assert.equal(calls, 1)
  pending.resolve(response([]))
  await pageLoad
})
