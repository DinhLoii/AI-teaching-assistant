const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')

// Real student screens with isolated API fixtures; no real database or notifications are changed.
async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' })
    const user = { id: 'student', role: 'student', fullName: 'Deadline Test', email: 'test@example.invalid' }
    await context.addInitScript(user => {
      localStorage.setItem('aita_token', 'student')
      localStorage.setItem('aita_user', JSON.stringify(user))
      const fetchOriginal = window.fetch.bind(window)
      window.fetch = (input, options) => {
        if (String(input).includes('/notifications/stream')) {
          const encoder = new TextEncoder()
          const stream = new ReadableStream({ start(controller) {
            window.pushTestNotification = event => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
            window.pushTestNotification({ type: 'CONNECTED' })
          } })
          return Promise.resolve(new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }))
        }
        return fetchOriginal(input, options)
      }
    }, user)
    let due = new Date(Date.now() - 6 * 86400000).toISOString()
    let extended = false
    const notices = []
    let holdAssignment = false
    const heldAssignments = []
    const assignment = () => ({ id: 'exam', title: 'Deadline synchronization test', description: 'Assignment', due, dueAt: due, dueDate: due, status: 'published', type: 'assignment', totalPoints: 10, subjectCode: 'PRM392', semesterSeason: 'Fall 2026' })
    const errors = []
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api', '')
      let data = []
      if (path === '/auth/me') data = user
      if (path === '/notifications') data = notices
      if (path === '/notifications/unread-count') data = { count: notices.length }
      if (path === '/assignments') data = [assignment()]
      if (path === '/assignments/exam') {
        if (holdAssignment) await new Promise(resolve => heldAssignments.push(resolve))
        data = assignment()
      }
      if (path === '/grading/assignments/exam') data = { metadata: { title: assignment().title, dueDate: due }, rubric: { rules: [] } }
      if (path === '/submissions') data = [{ id: 'submission', examId: 'exam', assignmentId: 'exam', studentId: 'student', submittedAt: new Date().toISOString(), gradingStatus: 'Graded', isPublished: true, score: 0, extendedDueDate: extended ? due : null }]
      if (path === '/student-portal/dashboard') data = { upcomingAssignments: [{ ...assignment(), status: 'GRADED', score: 0 }], enrolledClasses: [], totalAssignments: 1, submittedAssignments: 1, unreadNotifications: notices.length }
      await route.fulfill({ json: { success: true, data } })
    })
    const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
    const pages = []
    for (const path of ['/student', '/student/assignments', '/student/assignments/exam']) {
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(base + path)
      await page.getByText('Deadline synchronization test', { exact: true }).first().waitFor({ timeout: 60000 })
      pages.push(page)
    }
    for (const page of pages.slice(0, 2)) await page.getByText(/Quá hạn \d+ ngày/).first().waitFor()
    due = new Date(Date.now() + 48 * 60000).toISOString()
    extended = true
    const notice = { id: 'extension-1', type: 'ASSIGNMENT_REOPENED', title: 'Gia hạn nộp bài', message: `Hạn mới: ${due}`, referenceId: 'exam', referenceType: 'EXAM', createdAt: new Date().toISOString(), isRead: false }
    notices.push(notice)
    for (const page of pages) await page.evaluate(notice => window.pushTestNotification({ type: 'NOTIFICATION', payload: notice }), notice)
    for (const page of pages.slice(0, 2)) {
      await page.getByText(/Còn 4[78] phút/).first().waitFor({ timeout: 15000 })
      assert.equal(await page.getByText(/Quá hạn \d+ ngày/).count(), 0)
    }
    await pages[2].getByText(/Còn 0h 4[67]m/).first().waitFor({ timeout: 15000 })
    await pages[2].getByRole('button', { name: 'Nộp lại bài', exact: true }).first().waitFor()
    // Reproduce history arriving first with an extension while assignment is null.
    holdAssignment = true
    const historyArrived = pages[2].waitForResponse(response => new URL(response.url()).pathname === '/api/submissions')
    await pages[2].reload({ waitUntil: 'domcontentloaded' })
    await historyArrived
    await pages[2].waitForTimeout(250)
    assert.deepEqual(errors, [])
    holdAssignment = false
    for (const release of heldAssignments) release()
    await pages[2].getByText(/Còn 0h 4[67]m/).first().waitFor({ timeout: 15000 })
    assert.deepEqual(errors, [])
    console.log('PASS: extension synchronizes three student tabs; countdown handles extended submission history arriving before delayed assignment metadata without a runtime error.')
    await context.close()
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
