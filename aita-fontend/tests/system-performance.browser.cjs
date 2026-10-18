const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  async function scenario(role, handler, run) {
    const user = { id: `${role}-test`, role, fullName: 'Performance Test' }
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.addInitScript(user => {
      localStorage.setItem('aita_token', 'fixture-token')
      localStorage.setItem('aita_user', JSON.stringify(user))
    }, user)
    const pending = deferred()
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url()), path = url.pathname.replace('/api', '')
      let data = []
      if (path === '/auth/me') data = user
      else if (path === '/notifications/unread-count') data = { count: 0 }
      else data = await handler(path, url, pending)
      await route.fulfill({ json: { success: true, data } }).catch(() => {})
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    try { await run(page, pending) }
    finally { pending.resolve(); await context.close() }
  }
  const assignment = id => ({ id, title: `Performance Assignment ${id}`, status: 'published', classes: ['class-a'], classIds: ['class-a'], subjectId: 'subject-a', subjectCode: 'PERF101' })
  try {
    let submissionRequests = 0, classListRequests = 0
    await scenario('lecturer', async (path, url, pending) => {
      if (path === '/classes/class-a') return { id: 'class-a', classCode: 'PERF01', subject: { code: 'PERF101', name: 'Performance Class' } }
      if (path === '/classes') classListRequests++
      if (path === '/assignments') {
        assert.equal(url.searchParams.get('view'), 'summary')
        assert.equal(url.searchParams.get('classId'), 'class-a')
        return Array.from({ length: 8 }, (_, index) => assignment(String(index)))
      }
      if (path === '/submissions') {
        submissionRequests++
        assert.equal(url.searchParams.get('classId'), 'class-a')
        assert.equal(url.searchParams.has('assignmentId'), false)
        await pending.promise
        return [{ id: 'sub-a', assignmentId: '0', studentId: 'student-a', score: 8, finalScore: 8 }]
      }
      if (path === '/classes/class-a/students') {
        await pending.promise
        return [{ id: 'student-a', studentCode: 'SE001', fullName: 'Performance Student' }]
      }
      if (path.endsWith('/announcements')) await pending.promise
      return []
    }, async (page, pending) => {
      await page.goto(`${base}/lecturer/classes/class-a`)
      await page.getByRole('heading', { name: 'Performance Class', exact: true }).waitFor()
      await page.getByRole('heading', { name: 'Performance Assignment 0', exact: true }).waitFor()
      assert.equal(classListRequests, 0)
      assert.equal(submissionRequests, 1, 'Eight assignments must share one class submission request')
      await page.getByRole('button', { name: /Danh sách sinh viên/ }).click()
      await page.getByRole('status').filter({ hasText: 'Đang tải danh sách sinh viên và điểm' }).waitFor()
      pending.resolve()
      await page.getByText('Performance Student', { exact: true }).waitFor()
      await page.getByRole('button', { name: 'Xuất bảng điểm Excel (CSV)' }).waitFor()
    })

    await scenario('student', async (path, _url, pending) => {
      if (path === '/semesters') return [{ id: 'semester-a', season: 'Fall 2026', isActive: true }]
      if (path === '/student-portal/subjects') return [{ id: 'subject-a', code: 'PERF101', name: 'Performance Subject', lecturers: [] }]
      if (path === '/assignments' || path === '/submissions') await pending.promise
      return []
    }, async page => {
      await page.goto(`${base}/student/subjects`)
      await page.getByText('Performance Subject', { exact: true }).waitFor()
    })

    await scenario('student', async (path, _url, pending) => {
      if (path === '/assignments') return [assignment('a')]
      if (path === '/student-portal/dashboard' || path === '/submissions') await pending.promise
      return []
    }, async page => {
      await page.goto(`${base}/student/assignments`)
      await page.getByText('Performance Assignment a', { exact: true }).first().waitFor()
    })

    await scenario('admin', async (path, url, pending) => {
      if (path === '/classes') {
        if (url.searchParams.get('page') === '2') { await pending.promise; return [] }
        return [{ id: 'class-a', code: 'PERF01', subject: { code: 'PERF101', name: 'Performance Subject' }, semester: { code: 'SEM1' }, lecturers: [], studentCount: 1 }]
      }
      return []
    }, async page => {
      await page.goto(`${base}/admin/classes`)
      await page.getByText('PERF01', { exact: true }).waitFor()
    })
    assert.deepEqual(errors, [])
    console.log('PASS: class content before roster/grades/announcements; one submission request for eight assignments; subjects before grades; assignment list before dashboard; current admin page before next-page prefetch. Mock API only.')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
