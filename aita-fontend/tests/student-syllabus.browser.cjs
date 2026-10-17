const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'

const syllabus = {
  name: 'Java Web Application Development', description: 'Đề cương PRJ301 từ môn học',
  credits: 3, degreeLevel: 'Bachelor', timeAllocation: '150 giờ học', prerequisites: 'PRO192',
  learningOutcomes: [{ category: 'Kiến thức Java Web', code: 'ABET e', items: ['Xây dựng ứng dụng MVC'] }],
  studentTasks: ['Chuẩn bị bài trước buổi học'], tools: ['Java JDK 17'],
  clos: [{ code: 'CLO1', details: 'Triển khai Servlet và JSP', loDetails: 'LO1' }],
  sessions: [
    { sessionNo: 1, topic: 'Giới thiệu Servlet', type: 'Lecture', clo: 'CLO1', itu: 'I', studentTasks: ['Đọc tài liệu Servlet'] },
    { sessionNo: 2, topic: 'Thực hành JSP', type: 'Lab', clo: 'CLO1', itu: 'T', studentTasks: ['Viết trang JSP'] },
  ],
  assessments: [{ category: 'Practical Exam', weightPercent: 40 }, { category: 'Final Exam', weightPercent: 60 }],
}
const subject = { id: 'subject-1', code: 'PRJ301', name: syllabus.name, credit: 3, syllabusData: JSON.stringify(syllabus) }

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  async function session(role = 'student', subjectResult = subject) {
    const user = { id: `${role}-1`, role, fullName: 'Test User', email: 'test@example.invalid' }
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await context.addInitScript(user => {
      localStorage.setItem('aita_token', 'test-token')
      localStorage.setItem('aita_user', JSON.stringify(user))
    }, user)
    const requests = []
    await context.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname.replace('/api', '')
      requests.push({ path, method: req.method() })
      let data = []
      if (path === '/auth/me') data = user
      if (path === '/notifications/unread-count') data = { count: 0 }
      if (path === '/student-portal/classes/class-1') data = {
        id: 'class-1', classCode: 'PRJ301-SE1701', subject: { ...subject, syllabusData: undefined },
        assignments: [], students: [], lecturers: [], semester: { season: 'Fall', code: '2026' },
      }
      if (path === '/subjects/subject-1') {
        const result = typeof subjectResult === 'function' ? subjectResult() : subjectResult
        if (result === 'error') return route.fulfill({ status: 503, json: { success: false, message: 'Temporarily unavailable' } })
        data = result
      }
      if (path === '/subjects') data = [subject]
      await route.fulfill({ json: { success: true, data } })
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    return { page, context, requests }
  }
  async function openSyllabus(page) {
    await page.goto(`${base}/student/classes/class-1`)
    await page.getByRole('button', { name: 'Đề cương môn học (Syllabus)', exact: true }).click()
  }
  try {
    const student = await session()
    await student.page.goto(`${base}/student/classes/class-1`)
    const tab = student.page.getByRole('button', { name: 'Đề cương môn học (Syllabus)', exact: true })
    await tab.waitFor()
    assert.equal(student.requests.some(req => req.path === '/subjects/subject-1'), false)
    await tab.click()
    await student.page.getByText('Đề cương PRJ301 từ môn học', { exact: true }).waitFor()
    await student.page.getByText('Xây dựng ứng dụng MVC', { exact: true }).waitFor()
    assert.equal(await student.page.locator('a[href^="/lecturer"]').count(), 0)
    assert.equal(await student.page.getByText('Tác vụ giảng viên', { exact: true }).count(), 0)
    assert.equal(await student.page.getByRole('button', { name: /^Bài tập & Đề thi/ }).count(), 0)
    await student.page.getByRole('button', { name: 'Chuẩn đầu ra CLO (1)', exact: true }).click()
    await student.page.getByText('Triển khai Servlet và JSP', { exact: true }).waitFor()
    await student.page.getByRole('button', { name: 'Lịch trình buổi học (2)', exact: true }).click()
    await student.page.getByText('Giới thiệu Servlet', { exact: true }).waitFor()
    await student.page.getByPlaceholder('Tìm kiếm slot, chủ đề...').fill('JSP')
    assert.equal(await student.page.getByText('Giới thiệu Servlet', { exact: true }).count(), 0)
    await student.page.getByText('Thực hành JSP', { exact: true }).waitFor()
    await student.page.getByRole('button', { name: 'Cơ cấu điểm số', exact: true }).click()
    await student.page.getByText('40%', { exact: true }).waitFor()
    await student.page.getByText('60%', { exact: true }).waitFor()
    await student.page.getByRole('button', { name: /^Danh sách Bài tập/ }).click()
    await student.page.getByRole('button', { name: 'Đề cương môn học (Syllabus)', exact: true }).click()
    await student.page.getByText('Đề cương PRJ301 từ môn học', { exact: true }).waitFor()
    assert.equal(student.requests.filter(req => req.path === '/subjects/subject-1').length, 1)
    assert.deepEqual(student.requests.filter(req => req.method !== 'GET'), [])
    await student.page.setViewportSize({ width: 390, height: 844 })
    await student.page.screenshot({ path: '.next/student-syllabus-mobile.png', fullPage: true })
    assert.equal(await student.page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth), true)
    await student.context.close()

    for (const syllabusData of [null, 'invalid JSON']) {
      const empty = await session('student', { ...subject, syllabusData })
      await openSyllabus(empty.page)
      await empty.page.getByText('Chưa có đề cương môn học', { exact: true }).waitFor()
      assert.equal(await empty.page.getByRole('button', { name: /^Lịch trình buổi học/ }).count(), 0)
      await empty.context.close()
    }
    let attempts = 0
    const retry = await session('student', () => ++attempts === 1 ? 'error' : subject)
    await openSyllabus(retry.page)
    await retry.page.getByRole('alert').waitFor()
    await retry.page.getByRole('button', { name: 'Thử lại', exact: true }).click()
    await retry.page.getByText('Đề cương PRJ301 từ môn học', { exact: true }).waitFor()
    assert.equal(attempts, 2)
    await retry.context.close()

    const lecturer = await session('lecturer')
    await lecturer.page.goto(`${base}/lecturer/subjects/subject-1`)
    await lecturer.page.getByText('Đề cương PRJ301 từ môn học', { exact: true }).waitFor()
    await lecturer.page.getByRole('button', { name: 'Cấu hình Prompt AI môn', exact: true }).waitFor()
    await lecturer.page.getByRole('button', { name: 'Tạo bài tập / Đề thi', exact: true }).waitFor()
    await lecturer.page.getByRole('button', { name: /^Bài tập & Đề thi/ }).click()
    await lecturer.page.getByText('Chưa có bài tập nào cho môn học này', { exact: true }).waitFor()
    await lecturer.context.close()
    assert.deepEqual(errors, [])
    console.log('PASS: student read-only syllabus tabs, real subject content, lazy GET/cache, mobile layout, missing/invalid syllabus, retry; lecturer actions preserved. Mock API only.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
