import assert from 'node:assert/strict';
import test from 'node:test';
import { createLoader } from './helpers/load-typescript.mjs';

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function response(data, status = 200) {
  return { ok: status < 400, status, statusText: 'Test response', json: async () => data };
}
function setup(fetch) {
  const localStorage = storage(), sessionStorage = storage();
  const load = createLoader({ fetch, localStorage, sessionStorage, window: { location: { href: '' } } });
  return { load, localStorage, sessionStorage };
}

test('domain clients preserve query encoding, JSON payload and authorization', async () => {
  const requests = [];
  const { load, localStorage } = setup(async (url, options) => { requests.push({ url, options }); return response({ success: true, data: [] }); });
  localStorage.setItem('aita_token', 'test-access');
  const { usersApi } = load('lib/api/modules/users.ts');
  const { classesApi } = load('lib/api/modules/classes.ts');
  await usersApi.getUsers('student', 2, 50, 'A & B');
  assert.equal(requests[0].url, '/api/users?role=student&page=2&limit=50&search=A%20%26%20B');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-access');
  const payload = { code: 'SE01', subjectId: 'subject-1', semesterId: 'semester-1' };
  await classesApi.createClass(payload);
  assert.equal(requests[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(requests[1].options.body), payload);
});

test('submission adapter and compatibility facade preserve normalized report data', async () => {
  const { load } = setup(async () => response({ Data: [{ id: 'submission-1', examId: 'exam-1', student: { fullName: 'Student', studentCode: 'SE01' }, reportData: JSON.stringify({ totalScore: 7 }), reviewStatus: 'PUBLISHED' }] }));
  const { submissionsApi } = load('lib/api/modules/submissions.ts');
  const direct = await submissionsApi.getSubmissions({ assignmentId: 'exam-1' });
  assert.equal(direct[0].assignmentId, 'exam-1');
  assert.equal(direct[0].score, 7);
  assert.equal(direct[0].reportData.totalScore, 7);
  assert.equal(direct[0].isPublished, true);
  const { api } = load('lib/api/index.ts');
  assert.equal(api.getSubmissions, submissionsApi.getSubmissions);
  assert.deepEqual(JSON.parse(JSON.stringify(await api.getSubmissions())), JSON.parse(JSON.stringify(direct)));
});

test('multipart submission leaves Content-Type to the browser', async () => {
  let request;
  const { load } = setup(async (url, options) => { request = { url, options }; return response({ data: { submissionId: 'new-submission' } }); });
  const { submissionsApi } = load('lib/api/modules/submissions.ts');
  await submissionsApi.submitAssignment(null, 'Test note', 'assignment-1');
  assert.equal(request.url, '/api/submissions');
  assert.equal(request.options.body.get('assignmentId'), 'assignment-1');
  assert.equal(request.options.body.get('content'), 'Test note');
  assert.equal(request.options.headers['Content-Type'], undefined);
});

test('SQL answer-key URL uses the shared Next.js API base instead of Vite import.meta.env', () => {
  const { load, localStorage } = setup(() => { throw new Error('No network expected'); });
  localStorage.setItem('aita_token', 'test-access');
  const { gradingApi } = load('lib/api/modules/grading.ts');
  assert.equal(gradingApi.getSqlKeyUrl('assignment-1'), '/api/grading/assignments/assignment-1/sql-key?token=test-access');
});

test('API error status/code survives the transport extraction', async () => {
  const { load } = setup(async () => response({ success: false, error: { code: 'NO_ACCESS', message: 'Not allowed' } }, 403));
  const { usersApi } = load('lib/api/modules/users.ts');
  const { ApiError } = load('lib/api/client.ts');
  await assert.rejects(usersApi.getUser('other-user'), err => err instanceof ApiError && err.status === 403 && err.code === 'NO_ACCESS');
});

test('concurrent domain requests share one refresh queue and retry with the new token', async () => {
  let refreshCalls = 0;
  const { load, localStorage } = setup(async (url, options) => {
    if (url === '/api/auth/refresh-token') {
      refreshCalls++;
      await new Promise(resolve => setTimeout(resolve, 15));
      return response({ data: { token: 'new-access', refreshToken: 'new-refresh' } });
    }
    if (options.headers.Authorization === 'Bearer old-access') return response({}, 401);
    assert.equal(options.headers.Authorization, 'Bearer new-access');
    return response({ success: true, data: [] });
  });
  localStorage.setItem('aita_token', 'old-access');
  localStorage.setItem('aita_refresh_token', 'old-refresh');
  const { usersApi } = load('lib/api/modules/users.ts');
  const { classesApi } = load('lib/api/modules/classes.ts');
  await Promise.all([usersApi.getUsers(), classesApi.getClasses()]);
  assert.equal(refreshCalls, 1);
  assert.equal(localStorage.getItem('aita_token'), 'new-access');
});
