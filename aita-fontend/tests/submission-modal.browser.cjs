const assert = require('node:assert/strict')
const test = require('node:test')
const path = require('node:path')
const fs = require('node:fs')
const { build } = require('../../aita-backend/node_modules/esbuild')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const root = path.resolve(__dirname, '..')

// Uses the real React development runtime, component and submission HTTP client.
// Only network responses, archive download and cache invalidation are controlled.
test('student submission modal lifecycle in a real browser', async (t) => {
  const bundle = await build({
    absWorkingDir: root, bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
    alias: { '@': path.join(root, 'src') },
    plugins: [{ name: 'controlled-side-effects', setup(build) {
      build.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: 'cache', namespace: 'stub' }))
      build.onResolve({ filter: /^@\/lib\/api\/modules\/grading$/ }, () => ({ path: 'grading', namespace: 'stub' }))
      build.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({ contents: path === 'cache'
        ? 'export const clearClientApiCache = () => {}'
        : 'export const gradingApi = { downloadSubmission: async (id) => window.testState.downloads.push(id), subscribeToProgress: (id, progress, complete, error) => { window.gradingObserver = { id, progress, complete, error }; return () => { window.gradingObserver = null } } }' }))
    }}],
    stdin: { resolveDir: root, loader: 'tsx', contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { StudentSubmissionModal } from './src/features/assignments/components/StudentSubmissionModal';
      window.testState = { requests: [], successes: [], complete: 0, close: 0, downloads: [] };
      window.fetch = (url, options) => new Promise((resolve, reject) => {
        window.testState.requests.push({ url, method: options.method, file: options.body?.get?.('file')?.name, note: options.body?.get?.('content'), assignment: options.body?.get?.('assignmentId') });
        window.testState.lastLinks = { githubUrl: options.body?.get?.('githubUrl'), vercelUrl: options.body?.get?.('vercelUrl') };
        window.respond = (data, status = 200) => resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
        window.rejectRequest = () => reject(new Error('network disconnected'));
      });
      const root = createRoot(document.getElementById('root'));
      const defaults = { isOpen: true, assignmentId: 'assignment-1', file: new File(['zip data'], 'student.zip'), noteContent: 'my note',
        onUploadSuccess: (result) => window.testState.successes.push(result),
        onComplete: () => window.testState.complete++, onClose: () => window.testState.close++ };
      window.renderModal = (props = {}) => root.render(<React.StrictMode><StudentSubmissionModal {...defaults} {...props} /></React.StrictMode>);
      window.unmountModal = () => root.unmount();
    ` },
  })
  const installed = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1228/chrome-win64/chrome.exe')
  const executablePath = fs.existsSync(installed) ? installed : 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  const browser = await chromium.launch({ executablePath, headless: true })
  t.after(() => browser.close())
  async function setup(props = {}) {
    const page = await browser.newPage()
    await page.route('http://aita.test/', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    await page.goto('http://aita.test/')
    await page.clock.install()
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.evaluate(props => window.renderModal(props), props)
    return page
  }
  async function requested(page) {
    await page.waitForFunction(() => window.testState.requests.length === 1)
  }
  async function received(page) {
    await page.getByText('Nộp bài thành công!', { exact: true }).waitFor()
  }
  await t.test('Strict Mode: timer advances, one POST, real confirmation, one callback and download', async () => {
    const page = await setup()
    await requested(page)
    assert.equal(await page.getByRole('list', { name: 'Các bước tiếp nhận bài nộp' }).getByRole('listitem').count(), 5)
    assert.equal(await page.getByRole('progressbar', { name: 'Tiến trình tiếp nhận bài nộp' }).getAttribute('aria-valuenow'), null)
    assert.equal(await page.getByRole('progressbar', { name: 'Tiến trình tiếp nhận bài nộp' }).locator('div').evaluate(el => el.style.width), '30%')
    await page.clock.runFor(2300)
    assert.match(await page.locator('body').innerText(), /00:02/)
    assert.equal(await page.getByTitle('Đóng').isDisabled(), true)
    assert.equal(await page.getByText('Nộp bài thành công!', { exact: true }).count(), 0)
    assert.deepEqual(await page.evaluate(() => window.testState.requests), [{ url: '/api/submissions', method: 'POST', file: 'student.zip', note: 'my note', assignment: 'assignment-1' }])
    await page.evaluate(() => window.respond({ success: true, data: { id: 'saved-1', submittedAt: '2026-10-15T08:00:00Z' } }))
    await received(page)
    assert.equal(await page.getByRole('progressbar', { name: 'Tiến trình tiếp nhận bài nộp' }).getAttribute('aria-valuenow'), '100')
    assert.equal(await page.evaluate(() => window.testState.successes.length), 1)
    assert.equal(await page.evaluate(() => window.testState.requests.length), 1)
    await page.getByText('Tải tệp vừa nộp (.zip)', { exact: true }).click()
    assert.deepEqual(await page.evaluate(() => window.testState.downloads), ['saved-1'])
    await page.getByText('Xác nhận & Xem bài nộp', { exact: true }).click()
    assert.equal(await page.evaluate(() => window.testState.complete), 1)
    await page.close()
  })
  await t.test('FER202 links use the existing receipt flow with one POST and no file', async () => {
    const links = { githubUrl: 'https://github.com/student/fer202', vercelUrl: 'https://ai-teaching-assistant-roan.vercel.app/login' }
    const page = await setup({ file: null, links, subjectCode: 'FER202', fileName: 'GitHub source.zip' })
    await requested(page)
    assert.deepEqual(await page.evaluate(() => window.testState.lastLinks), links)
    assert.equal(await page.evaluate(() => window.testState.requests[0].file), undefined)
    await page.evaluate(() => window.respond({ data: { id: 'github-attempt-2', attemptNumber: 2, gradingStatus: 'Pending' } }))
    await received(page)
    assert.equal(await page.evaluate(() => window.testState.successes.length), 1)
    assert.equal(await page.evaluate(() => window.testState.requests.length), 1)
    await page.close()
  })
  await t.test('business rejection: shows server error and closing never fires success completion', async () => {
    const page = await setup()
    await requested(page)
    await page.evaluate(() => window.respond({ success: false, message: 'Bài tập đã đóng' }, 400))
    await page.getByText('Bài tập đã đóng', { exact: true }).waitFor()
    await page.getByTitle('Đóng').click()
    assert.equal(await page.evaluate(() => window.testState.complete), 0)
    assert.equal(await page.evaluate(() => window.testState.successes.length), 0)
    assert.equal(await page.evaluate(() => window.testState.close), 1)
    await page.close()
  })
  await t.test('network failure surfaces an error without retrying POST', async () => {
    const page = await setup()
    await requested(page)
    await page.evaluate(() => window.rejectRequest())
    await page.getByText('Không thể tải lên tệp tin bài làm', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.testState.requests.length), 1)
    assert.equal(await page.evaluate(() => window.testState.successes.length), 0)
    await page.close()
  })
  await t.test('missing submission ID cannot produce a success receipt', async () => {
    const page = await setup()
    await requested(page)
    await page.evaluate(() => window.respond({ success: true, data: {} }))
    await page.getByText(/Máy chủ chưa xác nhận mã bài nộp/).first().waitFor()
    assert.equal(await page.evaluate(() => window.testState.successes.length), 0)
    await page.close()
  })
  await t.test('missing file cannot silently succeed', async () => {
    const page = await setup({ file: null })
    await page.getByText('Vui lòng chọn tệp bài làm và bài tập trước khi nộp.', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.testState.requests.length), 0)
    await page.close()
  })
  await t.test('receipt inspection never resubmits', async () => {
    const page = await setup({ initialMode: 'receipt', submissionId: 'existing-1' })
    await received(page)
    assert.equal(await page.evaluate(() => window.testState.requests.length), 0)
    assert.doesNotMatch(await page.locator('body').innerText(), /0 rủi ro|TLS 1.3|AES-256|Continuous Queue/)
    await page.close()
  })
  await t.test('grading progress follows only the latest attempt and never displays staff logs or triggers regrading', async () => {
    const page = await setup({ initialMode: 'receipt', submissionId: 'attempt-1' })
    await page.waitForFunction(() => window.gradingObserver?.id === 'attempt-1')
    await page.evaluate(() => {
      window.oldObserver = window.gradingObserver
      window.gradingObserver.progress({ submissionId: 'attempt-1', state: 'processing', requestVersion: 1, progressPercent: 40, logs: [{ message: 'PRIVATE TEST ANSWER' }], result: { totalScore: 9 } })
    })
    await page.getByText('Hệ thống đang chấm lần nộp này.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('progressbar', { name: 'Tiến trình chấm bài', exact: true }).getAttribute('aria-valuenow'), '40')
    assert.doesNotMatch(await page.locator('body').innerText(), /PRIVATE TEST ANSWER|Điểm tổng kết/)
    await page.evaluate(() => window.renderModal({ initialMode: 'receipt', submissionId: 'attempt-2' }))
    await page.waitForFunction(() => window.gradingObserver?.id === 'attempt-2')
    await page.evaluate(() => window.oldObserver.progress({ submissionId: 'attempt-1', state: 'completed', progressPercent: 100 }))
    assert.equal(await page.getByText('Đã chấm xong. Chờ giảng viên công bố kết quả.', { exact: true }).count(), 0)
    await page.evaluate(() => window.gradingObserver.progress({ submissionId: 'attempt-2', state: 'completed', progressPercent: 100 }))
    await page.getByText('Đã chấm xong. Chờ giảng viên công bố kết quả.', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.testState.requests.length), 0)
    await page.close()
  })
  await t.test('timeout unblocks UI; a late confirmation can still complete without duplicate POST', async () => {
    const page = await setup()
    await requested(page)
    await page.clock.runFor(120100)
    await page.getByText(/Máy chủ phản hồi quá lâu/).waitFor()
    assert.equal(await page.getByTitle('Đóng').isDisabled(), false)
    assert.equal(await page.evaluate(() => window.testState.requests.length), 1)
    await page.evaluate(() => window.respond({ data: { submissionId: 'late-1' } }))
    await received(page)
    assert.equal(await page.evaluate(() => window.testState.successes.length), 1)
    await page.close()
  })
  await t.test('an unmounted observer cannot update parent after request resolves', async () => {
    const page = await setup()
    await requested(page)
    await page.evaluate(() => { window.unmountModal(); window.respond({ data: { id: 'saved-after-unmount' } }) })
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)))
    assert.equal(await page.evaluate(() => window.testState.successes.length), 0)
    await page.close()
  })
})
