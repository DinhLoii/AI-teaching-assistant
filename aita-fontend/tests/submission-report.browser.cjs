const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'
const id = '11111111-1111-4111-8111-111111111111'
const examId = '22222222-2222-4222-8222-222222222222'
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } })
  const user = { id: 'student-test', role: 'student', fullName: 'Student ZIP Test', email: 'test@example.invalid' }
  await context.addInitScript(user => { localStorage.setItem('aita_token', 'test-token'); localStorage.setItem('aita_user', JSON.stringify(user)) }, user)
  let missing = false, sourceError = false, failed = false, processing = false
  const errors = []
  await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname.replace('/api', '')
    let data = []
    if (pathname === '/auth/me') data = user
    if (pathname === '/notifications/unread-count') data = { count: 0 }
    if (pathname === `/submissions/${id}`) data = {
      id, examId, assignment: 'Real ZIP report', filename: 'student.zip', isPublished: true, reviewStatus: 'PUBLISHED', gradingStatus: 'Graded', attemptNumber: 2,
      score: missing ? null : 6, maxScore: 10, submittedAt: '2026-10-17T03:00:00Z',
      reportData: missing ? null : { submissionId: id, assignmentId: examId, totalScore: 6, maxPossibleScore: 10, passedRules: [{ ruleId: 'R1', title: 'Lecturer functional criterion', weight: 6, earnedScore: 6, details: 'Review based on actual Kotlin', evidence: { snippets: [{ filePath: 'project/Main.kt', codeSnippet: 'println("REAL_ZIP")' }], ioTestCases: [{ caseId: 'teacher-case-1', passed: true }, { caseId: 'teacher-case-2', passed: false }] } }], failedRules: [] },
    }
    if (pathname === `/submissions/${id}` && failed) data = { ...data, score: 0, gradingStatus: 'Error', reportData: { submissionId: id, assignmentId: examId, totalScore: 0, error: 'AI_CODE_EVIDENCE_MISSING', passedRules: [], failedRules: [] } }
    if (pathname === `/submissions/${id}` && user.role === 'lecturer') data = { ...data, isPublished: false, reviewStatus: 'DRAFT' }
    if (pathname === `/submissions/${id}` && processing) data = { ...data, score: null, gradingStatus: 'Processing', reportData: null }
    if (pathname === `/submissions/${id}/source`) {
      if (sourceError) return route.fulfill({ status: 422, json: { success: false, message: 'ZIP unavailable for preview' } })
      data = { files: [{ path: 'project/Main.kt', content: 'fun main() = println("REAL_ZIP")' }], archiveSha256: 'a'.repeat(64), skipped: 0 }
    }
    if (pathname === `/submissions/${id}/history`) data = [
      { id, attemptNumber: 2, filename: 'student.zip', isPublished: true, score: 6, maxScore: 10 },
      { id: 'old', attemptNumber: 1, filename: 'previous.zip', isPublished: false, score: null, maxScore: 10 },
    ]
    await route.fulfill({ json: { success: true, data } }).catch(() => {})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${base}/student/results/${id}`)
    await page.getByText('6.00 / 10', { exact: true }).waitFor()
    await page.getByText('REAL_ZIP', { exact: false }).first().waitFor()
    assert.equal(await page.getByRole('tab', { name: /Git/ }).count(), 0)
    assert.equal(await page.getByText('8.8/10', { exact: true }).count(), 0)
    assert.equal(await page.getByText('main.cpp', { exact: true }).count(), 0)
    await page.getByRole('tab', { name: 'Chi tiết đánh giá', exact: true }).click()
    await page.getByText(/Đoạn trích khớp ZIP/).waitFor()
    await page.getByRole('tab', { name: 'Test cases', exact: true }).click()
    await page.getByText('1/2 kiểm thử đạt', { exact: true }).waitFor()
    await page.getByText(/teacher-case-2/).waitFor()
    await page.getByRole('tab', { name: 'Lịch sử nộp bài', exact: true }).click()
    await page.getByText(/previous.zip/).waitFor()
    await page.getByText('Chưa công bố điểm', { exact: true }).waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('tab', { name: 'Tổng quan', exact: true }).click()
    await page.screenshot({ path: process.env.TEST_ARTIFACT_DIR ? process.env.TEST_ARTIFACT_DIR + '/submission-report-mobile.png' : 'tests/submission-report-mobile.png', fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
    missing = true; sourceError = true
    await page.reload()
    await page.getByText('Chưa có điểm', { exact: true }).waitFor()
    await page.getByText(/ZIP unavailable for preview/).waitFor()
    await page.getByText('Chưa xác minh', { exact: true }).waitFor()
    assert.equal(await page.getByText(/REAL_ZIP/).count(), 0)
    sourceError = false
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
    await page.getByText(/REAL_ZIP/).first().waitFor()
    failed = true
    await page.reload()
    await page.getByText('Chưa có điểm', { exact: true }).waitFor()
    await page.getByRole('alert').filter({ hasText: 'AI_CODE_EVIDENCE_MISSING' }).waitFor()
    assert.equal(await page.getByText('0.00 / 10', { exact: true }).count(), 0)
    user.role = 'lecturer'
    await context.addInitScript(user => localStorage.setItem('aita_user', JSON.stringify(user)), user)
    await page.goto(`${base}/lecturer/grading/result/${id}`)
    await page.getByRole('alert').filter({ hasText: 'AI_CODE_EVIDENCE_MISSING' }).waitFor()
    assert.equal(await page.getByText('0.00 / 10', { exact: true }).count(), 0)
    assert.ok(await page.getByText(/Chưa có điểm/).count() >= 3)
    failed = false; processing = true
    await page.reload()
    await page.getByText('Chưa có điểm', { exact: true }).first().waitFor()
    processing = false; missing = false
    await page.getByText(/^6\.00/).first().waitFor({ timeout: 12000 })
    assert.deepEqual(errors, [])
    console.log('PASS: source, rubric tests, history, missing/failed grades, lecturer background updates and mobile layout')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
