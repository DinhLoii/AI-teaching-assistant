const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  async function session(role, handler) {
    const user = { id: `${role}-test`, role, fullName: 'Performance Test', email: 'test@example.invalid' }
    const context = await browser.newContext()
    await context.addInitScript(user => {
      localStorage.setItem('aita_token', 'test-token')
      localStorage.setItem('aita_user', JSON.stringify(user))
    }, user)
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      const path = url.pathname.replace('/api', '')
      let data = []
      if (path === '/auth/me') data = user
      else if (path === '/notifications/unread-count') data = { count: 0 }
      else data = await handler(path, url)
      await route.fulfill({ json: { success: true, data } }).catch(() => {})
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    return { page, context }
  }
  try {
    let releaseNotifications
    const notificationsPending = new Promise(resolve => { releaseNotifications = resolve })
    let notificationStarted = false, submissionRequests = 0
    const student = await session('student', async path => {
      if (path === '/notifications') {
        notificationStarted = true
        await notificationsPending
      }
      if (path === '/student-portal/dashboard') return { enrolledClasses: [], upcomingAssignments: [] }
      if (path === '/submissions') submissionRequests++
      return []
    })
    await student.page.goto(`${base}/student`)
    await student.page.getByText('Không có bài tập nào trong mục này', { exact: true }).waitFor({ timeout: 5000 })
    assert.equal(notificationStarted, true)
    // The notification response is still blocked: main content must already render.
    releaseNotifications()
    const resultsLink = student.page.locator('aside a[href="/student/results"]')
    const prefetched = student.page.waitForResponse(url => new URL(url.url()).pathname === '/api/submissions')
    await resultsLink.hover()
    await prefetched
    await resultsLink.click()
    await student.page.waitForURL('**/student/results')
    await student.page.getByRole('button', { name: /Tải lại|Refresh/ }).waitFor()
    assert.equal(submissionRequests, 1)
    await student.context.close()

    const subjectRequests = []
    const subjects = await session('student', async (path, url) => {
      if (path === '/semesters') return [{ id: 'semester-1', season: 'Fall 2026', isActive: true }]
      if (path === '/student-portal/subjects') {
        subjectRequests.push(url.searchParams.get('semester'))
        return [{ id: 'subject-1', code: 'PERF101', name: 'Performance Subject', lecturers: [] }]
      }
      return []
    })
    await subjects.page.goto(`${base}/student/subjects`)
    await subjects.page.getByText('Performance Subject', { exact: true }).waitFor()
    assert.deepEqual(subjectRequests, ['FALL2026'])
    await subjects.context.close()

    let trashRequests = 0
    const lecturer = await session('lecturer', async path => {
      if (path === '/grading/assignments/trash') trashRequests++
      return []
    })
    await lecturer.page.goto(`${base}/lecturer/grading/assignments`)
    await lecturer.page.getByText('Chưa có bài tập nào.', { exact: true }).waitFor()
    assert.equal(trashRequests, 0)
    const trashLoaded = lecturer.page.waitForResponse(url => new URL(url.url()).pathname === '/api/grading/assignments/trash')
    await lecturer.page.getByRole('button', { name: /^Thùng rác/ }).click()
    await trashLoaded
    assert.equal(trashRequests, 1)
    await lecturer.context.close()
    assert.deepEqual(errors, [])
    console.log('PASS: dashboard renders with blocked notifications; hover/page GET deduplication; one semester-filtered subjects request; trash fetched on demand. Mock API only.')
  } finally {
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
