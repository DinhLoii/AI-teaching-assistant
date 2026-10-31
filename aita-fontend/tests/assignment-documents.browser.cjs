const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'
const id = '11111111-1111-4111-8111-111111111111'
const attachmentId = '33333333-3333-4333-8333-333333333333'
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true })
  const user = { id: 'student-test', role: 'student', fullName: 'Student Document Test', email: 'test@example.invalid' }
  await context.addInitScript(user => { localStorage.setItem('aita_token', 'test-token'); localStorage.setItem('aita_user', JSON.stringify(user)) }, user)
  const bytes = Buffer.from([80, 75, 3, 4, 17, 0, 255, 9])
  let missing = false, fail = false, downloads = 0
  let release, hold = false
  const original = fs.readFileSync('tests/fixtures/personal-expense-tracker.txt', 'utf8')
  await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname.replace('/api', '')
    let data = []
    if (pathname === '/auth/me') data = user
    if (pathname === '/notifications/unread-count') data = { count: 0 }
    if (pathname === `/assignments/${id}`) data = {
      id, title: 'Personal Expense Tracker', status: 'published', type: 'assignment', description: original, documentContent: original, content: 'Barem tiêu chí chấm điểm tự động và AI', maxScore: 10, dueAt: '2099-10-18T03:00:00Z',
      attachments: missing ? [] : [{ id: attachmentId, fileName: 'Đề bài Android gốc.docx', fileUrl: '/uploads/attachments/not-used.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
      documentAnalysis: { reviewStatus: 'teacher_reviewed', language: 'Kotlin', platform: 'Android', requirementGroups: { required: [{ text: 'Lưu giao dịch bằng Room' }], advanced: [{ text: 'Thiết lập ngân sách tháng' }], excluded: [{ text: 'Đăng nhập, Firebase không bắt buộc' }] }, acceptanceTests: [{ id: 'TC01', steps: 'Thêm giao dịch Thu 5.000.000', expectedResult: 'Tổng thu tăng đúng', level: 'required' }, { id: 'TC09', steps: 'Chi vượt ngân sách tháng', expectedResult: 'Hiện cảnh báo', level: 'advanced' }] },
    }
    if (pathname === `/grading/assignments/${id}`) data = { metadata: { content: 'Barem tiêu chí chấm điểm tự động và AI' }, rubric: { rules: [] } }
    if (pathname === `/assignments/attachments/${attachmentId}/download`) {
      downloads++
      assert.equal(route.request().headers().authorization, 'Bearer test-token')
      if (hold) await new Promise(resolve => { release = resolve })
      if (fail) return route.fulfill({ status: 404, json: { success: false, message: 'Tệp gốc không còn trên kho lưu trữ.' } })
      return route.fulfill({ body: bytes, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } })
    }
    await route.fulfill({ json: { success: true, data } }).catch(() => {})
  })
  const page = await context.newPage(), errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${base}/student/assignments/${id}`)
    await page.getByRole('button', { name: 'Tải đề bài gốc', exact: true }).waitFor()
    const document = page.getByRole('region', { name: 'Đề bài và phân tích yêu cầu', exact: true })
    await document.getByText(/Ứng dụng hoạt động offline/).waitFor()
    assert.ok(!(await document.getByRole('tabpanel').innerText()).includes('Barem tiêu chí chấm điểm tự động và AI'))
    hold = true
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Tải đề bài gốc', exact: true }).click()
    await page.getByRole('button', { name: 'Đang tải đề...', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Đang tải đề...', exact: true }).isDisabled(), true)
    await page.waitForTimeout(100)
    release(); hold = false
    const downloaded = await downloadPromise
    assert.equal(downloaded.suggestedFilename(), 'Đề bài Android gốc.docx')
    assert.deepEqual(fs.readFileSync(await downloaded.path()), bytes)
    await document.getByRole('tab', { name: 'Phân tích yêu cầu', exact: true }).click()
    await document.getByText('Lưu giao dịch bằng Room', { exact: true }).waitFor()
    await document.getByText('Đăng nhập, Firebase không bắt buộc', { exact: true }).waitFor()
    await document.getByRole('tab', { name: 'Tình huống kiểm thử (2)', exact: true }).click()
    await document.getByText('TC09 · Nâng cao', { exact: true }).waitFor()
    await document.getByText(/chưa phải kết quả chấm/).waitFor()
    await document.getByRole('tab', { name: 'Nội dung đề', exact: true }).click()
    await page.setViewportSize({ width: 390, height: 844 })
    await document.scrollIntoViewIfNeeded()
    await page.screenshot({ path: process.env.TEST_ARTIFACT_DIR ? process.env.TEST_ARTIFACT_DIR + '/assignment-document-mobile.png' : 'tests/assignment-document-mobile.png', fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
    fail = true
    await page.getByRole('button', { name: 'Tải đề bài gốc', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Tệp gốc không còn' }).waitFor()
    assert.equal(downloads, 2)
    missing = true
    await page.reload()
    const disabled = page.getByRole('button', { name: 'Chưa có tệp đề gốc', exact: true })
    await disabled.waitFor(); assert.equal(await disabled.isDisabled(), true)
    assert.deepEqual(errors, [])
    console.log('PASS: full original web content, reviewed analysis, original binary/name download, loading/error/missing states and mobile layout')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
