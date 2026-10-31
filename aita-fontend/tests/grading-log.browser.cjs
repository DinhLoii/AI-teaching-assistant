const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5196'

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } })
  const user = { id: 'test-lecturer', role: 'lecturer', fullName: 'Test Lecturer', email: 'test@example.invalid' }
  await context.addInitScript(user => {
    localStorage.setItem('aita_token', 'local-test-only')
    localStorage.setItem('aita_user', JSON.stringify(user))
  }, user)
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    const id = path.split('/')[3]
    if (path.endsWith('/stream')) {
      if (!path.includes('/grading/submissions/')) return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"CONNECTED"}\n\n' })
      const logs = id === 'real-a' ? [{ id: 'event-a', timestamp: '2026-10-19T10:00:00Z', message: 'Compiling submission A source', state: 'processing' }] : id === 'detailed-c' ? [
        { id: 'c1', timestamp: '2026-10-19T10:00:00Z', message: '[Tệp gốc] submission-c.zip; SHA-256: test-only', stage: 0, status: 'info', state: 'processing' },
        { id: 'c2', timestamp: '2026-10-19T10:00:01Z', message: '[Nhận diện] Đã đọc 2 tệp .cpp', stage: 0, status: 'completed', state: 'processing' },
        { id: 'c3', timestamp: '2026-10-19T10:00:02Z', message: '[Runtime console] cpp', runtime: 'cpp', stage: 1, status: 'info', state: 'processing' },
        { id: 'c4', timestamp: '2026-10-19T10:00:03Z', message: 'Không kết nối được Docker Engine; mở Docker Desktop.', stage: 1, status: 'failed', state: 'processing' },
        { id: 'c5', timestamp: '2026-10-19T10:00:03Z', message: 'Không chạy vì môi trường chưa sẵn sàng.', stage: 2, status: 'skipped', state: 'processing' },
      ] : []
      return route.fulfill({ contentType: 'text/event-stream', body: 'data: ' + JSON.stringify({ submissionId: id, state: id === 'failed-d' ? 'failed' : 'completed', progressPercent: id === 'failed-d' ? 90 : 100, error: id === 'failed-d' ? 'AI_CODE_EVIDENCE_MISSING: mock reference error' : undefined, currentTask: 'Evaluation complete', logs }) + '\n\n' })
    }
    let data = []
    if (path === '/auth/me') data = user
    if (path === '/notifications/unread-count') data = { count: 0 }
    if (path.endsWith('/result')) data = {
      submissionId: id, score: id === 'real-a' ? 1.3 : 0, maxScore: 10, reviewStatus: 'PendingReview', isPublished: false,
      rules: [], failedRules: [], gradingLogs: [], compilationSummary: { passed: true },
      consoleVerification: { status: 'completed', caseResults: [{ caseId: 'TC01', passed: true }, { caseId: 'TC02', passed: false }] },
    }
    if (path.endsWith('/result') && id === 'detailed-c') Object.assign(data, { compilationSummary: null, consoleVerification: { status: 'blocked', caseResults: [] }, executionSummary: { ready: false, runtimeStack: 'unknown' } })
    if (path.endsWith('/result') && id === 'failed-d') Object.assign(data, { score: null, gradingError: 'AI_CODE_EVIDENCE_MISSING: mock reference error' })
    return route.fulfill({ json: { success: true, data } })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(base + '/lecturer/grading/live/real-a')
    await page.getByText('Compiling submission A source', { exact: true }).waitFor()
    await page.getByTestId('grading-score').waitFor()
    assert.equal((await page.getByTestId('grading-score').innerText()).replace(/\s/g, ''), '1.3/10')
    assert.ok((await page.locator('body').innerText()).includes('1/2 test đã chạy đạt yêu cầu'))
    assert.equal(await page.locator('[data-testid^="grading-stage-"]').count(), 5)
    assert.equal(await page.getByTestId('grading-stage-0').getAttribute('data-status'), 'unknown')
    assert.equal(await page.getByTestId('grading-stage-2').getAttribute('data-status'), 'warning')
    await page.getByRole('button', { name: 'B3', exact: true }).click()
    await page.getByText('Compiling submission A source', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'B1', exact: true }).click()
    await page.getByText('Chưa có nhật ký ghi nhận cho bước này.', { exact: true }).waitFor()
    assert.equal(await page.getByText('Compiling submission A source', { exact: true }).count(), 0)
    await page.getByRole('button', { name: /Tất cả logs/ }).click()
    await page.getByText('Compiling submission A source', { exact: true }).waitFor()
    await page.screenshot({ path: process.env.TEST_ARTIFACT_DIR ? process.env.TEST_ARTIFACT_DIR + '/grading-log-restored-ui.png' : 'tests/grading-log-restored-ui.png', fullPage: true })
    await page.goto(base + '/lecturer/grading/live/history-b')
    await page.getByText('Không có nhật ký chi tiết được lưu cho lượt chấm này.', { exact: true }).waitFor()
    await page.getByTestId('grading-score').waitFor()
    assert.equal((await page.getByTestId('grading-score').innerText()).replace(/\s/g, ''), '0/10')
    const text = await page.locator('body').innerText()
    for (const fake of ['Compiling submission A source', '9.5', 'sha256:d89a1c', 'Vượt qua 100%', 'Gemini 2.5 Flash', 'Quét mã độc: 0']) assert.equal(text.includes(fake), false)
    await page.goto(base + '/lecturer/grading/live/detailed-c')
    await page.getByTestId('grading-score').waitFor()
    assert.equal(await page.getByTestId('grading-stage-0').getAttribute('data-status'), 'verified')
    assert.equal(await page.getByTestId('grading-stage-1').getAttribute('data-status'), 'warning')
    assert.equal(await page.getByTestId('grading-stage-2').getAttribute('data-status'), 'skipped')
    await page.getByRole('button', { name: 'B1', exact: true }).click()
    await page.getByText('[Tệp gốc] submission-c.zip; SHA-256: test-only', { exact: true }).waitFor()
    assert.equal(await page.getByText('Không kết nối được Docker Engine; mở Docker Desktop.', { exact: true }).count(), 0)
    await page.getByRole('button', { name: 'B2', exact: true }).click()
    await page.getByText(/Không kết nối được Docker Engine; mở Docker Desktop/).waitFor()
    await page.getByRole('button', { name: 'B3', exact: true }).click()
    await page.getByText(/Không chạy vì môi trường chưa sẵn sàng/).waitFor()
    await page.getByRole('button', { name: /Tất cả logs/ }).click()
    await page.screenshot({ path: process.env.TEST_ARTIFACT_DIR ? process.env.TEST_ARTIFACT_DIR + '/grading-log-detailed-ui.png' : 'tests/grading-log-detailed-ui.png', fullPage: true })
    await page.goto(base + '/lecturer/grading/live/failed-d')
    await page.getByText(/Kết quả kiểm chứng trước khi đánh giá lỗi/).waitFor()
    assert.ok((await page.locator('body').innerText()).includes('1/2 test đã chạy đạt yêu cầu'))
    assert.ok((await page.locator('body').innerText()).includes('Biên dịch: Thành công'))
    assert.equal(await page.getByText('Kết nối gián đoạn', { exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: /Duyệt.*Công bố/ }).count(), 0)
    assert.deepEqual(errors, [])
    console.log('Browser checks passed: submission isolation, actual partial test results, zero score and missing historical logs.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
