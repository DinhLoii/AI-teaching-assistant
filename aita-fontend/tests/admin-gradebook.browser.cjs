const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const XLSX = require('xlsx')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
const output = path.resolve(__dirname, '../../output/gradebook-qa')

async function main() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1512, height: 1100 }, acceptDownloads: true })
    const user = { id: 'qa-admin', role: 'admin', fullName: 'Quản trị AITA', email: 'admin@example.invalid' }
    await context.addInitScript(user => { localStorage.setItem('aita_token', 'qa-token'); localStorage.setItem('aita_user', JSON.stringify(user)) }, user)
    const exams = [
      { id: 'lab', title: 'Lab 01 · Lập trình căn bản', type: 'LAB', maxScore: 20, weight: 40, dueDate: '2026-10-10' },
      { id: 'project', title: 'Dự án cuối môn', type: 'PROJECT', maxScore: 100, weight: 60, dueDate: '2026-10-25' },
    ]
    const cell = (examId, score, published = false, id = 'a') => ({ examId, submissionId: score == null ? null : `${id}-${examId}`, score, rawScore: score, penalty: 0, status: score == null ? 'NOT_SUBMITTED' : 'Graded', published, feedback: 'Bài làm có cấu trúc rõ ràng.', attempt: 1, submittedAt: '2026-10-09T08:30:00Z', reviewedAt: null, revision: 'a'.repeat(64) })
    const rows = [
      { id: 'a', code: 'SE190001', name: 'Nguyễn Minh Anh', email: 'anh@example.invalid', grades: [cell('lab', 18), cell('project', 80, true)], total: 8.4, publishedTotal: null },
      { id: 'b', code: 'SE190002', name: 'Trần Hoàng Nam', email: 'nam@example.invalid', grades: [cell('lab', 0, false, 'b'), cell('project', null)], total: null, publishedTotal: null },
    ]
    const course = (id, code, subjectCode) => ({ id, code, subjectId: subjectCode, subjectCode, subjectName: subjectCode === 'PRF192' ? 'Programming Fundamentals' : 'Introduction to Database Systems', students: 2, lecturers: ['Nguyễn Văn Giảng'], status: 'Active' })
    const catalog = [
      { id: 'fall', code: '2026', season: 'Fall', active: true, classes: [course('course-1', 'SE1901', 'PRF192'), course('course-2', 'SE1901', 'DBI202')] },
      { id: 'spring', code: '2026', season: 'Spring', active: false, classes: [course('spring-course', 'SE1901', 'PRF192')] },
    ]
    const logs = []
    let lastChange, lastWeights, fail = false
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url()), api = url.pathname.replace('/api', ''), method = route.request().method()
      let data = []
      if (api === '/auth/me') data = user
      if (api === '/notifications/unread-count') data = { count: 0 }
      if (api === '/classes/gradebook/catalog') data = catalog
      if (/\/gradebook\/.*\/history$/.test(api)) data = logs
      if (/\/gradebook\/weights$/.test(api) && method === 'PUT') {
        lastWeights = route.request().postDataJSON()
        for (const weight of lastWeights.weights) exams.find(e => e.id === weight.examId).weight = weight.weight
        data = { updated: 2 }
      } else if (/\/gradebook$/.test(api)) {
        if (method === 'PATCH') {
          lastChange = route.request().postDataJSON()
          if (fail) return route.fulfill({ status: 409, json: { success: false, message: 'Điểm vừa được cập nhật bởi người khác. Hãy tải lại bảng điểm trước khi lưu.' } })
          for (const edit of lastChange.changes) {
            const g = rows.flatMap(r => r.grades).find(g => g.submissionId === edit.submissionId)
            const before = { score: g.score, published: g.published, feedback: g.feedback }
            g.score = edit.finalScore ?? g.score; g.published = edit.published ?? g.published; g.feedback = edit.feedback ?? g.feedback
            g.revision = 'b'.repeat(64)
            logs.push({ id: `log-${logs.length}`, at: new Date().toISOString(), actor: 'Quản trị AITA', before, after: { score: g.score, published: g.published, feedback: g.feedback, reason: lastChange.reason } })
          }
          data = { updated: lastChange.changes.length }
        } else {
          const id = api.split('/')[2], c = catalog.flatMap(s => s.classes).find(c => c.id === id)
          data = { class: { id, code: c.code, semester: id === 'spring-course' ? 'Spring 2026' : 'Fall 2026', semesterId: id === 'spring-course' ? 'spring' : 'fall', subjectCode: c.subjectCode, subjectName: c.subjectName, lecturers: c.lecturers }, exams, rows, weightTotal: 100, weightsRevision: 'c'.repeat(64), weightsSource: 'exam', generatedAt: new Date().toISOString() }
        }
      }
      return route.fulfill({ json: { success: true, data } })
    })
    const page = await context.newPage(), errors = []
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/admin/gradebook?classId=course-1`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Chi tiết SE190001, Lab 01 · Lập trình căn bản' }).waitFor({ timeout: 45000 }).catch(async error => {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true })
      console.log('Page state:', (await page.locator('body').innerText()).slice(-4000)); throw error
    })
    console.log('PASS: deep link opens requested semester, class and subject.')
    assert.equal(await page.getByLabel('Học kỳ', { exact: true }).inputValue(), 'fall')
    assert.equal(await page.getByLabel('Lớp trong kỳ', { exact: true }).inputValue(), 'SE1901')
    assert.equal(await page.getByLabel('Môn học của lớp', { exact: true }).inputValue(), 'course-1')
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true })

    await page.getByRole('button', { name: 'Chi tiết SE190002, Lab 01 · Lập trình căn bản' }).click()
    assert.equal(await page.getByLabel('Điểm cuối cùng', { exact: true }).inputValue(), '0')
    await page.getByRole('button', { name: 'Đóng', exact: true }).click()
    await page.getByRole('button', { name: 'Chi tiết SE190001, Lab 01 · Lập trình căn bản' }).click()
    await page.getByLabel('Điểm cuối cùng', { exact: true }).fill('17.5')
    await page.getByLabel('Lý do điều chỉnh', { exact: true }).fill('Đối chiếu lại tiêu chí trong barem')
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
    await page.getByText('Đã cập nhật 1 bài.', { exact: false }).waitFor()
    assert.equal(lastChange.changes[0].finalScore, 17.5)
    assert.equal(lastChange.changes[0].revision, 'a'.repeat(64))

    await page.getByRole('button', { name: 'Chi tiết SE190001, Lab 01 · Lập trình căn bản' }).click()
    await page.getByText('Lý do: Đối chiếu lại tiêu chí trong barem').waitFor()
    await page.getByLabel('Lý do điều chỉnh', { exact: true }).fill('Thử trường hợp cập nhật đồng thời')
    fail = true
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
    await page.getByRole('alert').filter({ hasText: 'Điểm vừa được cập nhật' }).waitFor()
    await page.getByRole('button', { name: 'Đóng', exact: true }).click(); fail = false

    await page.getByLabel('Chọn SE190001', { exact: true }).check()
    await page.getByRole('button', { name: 'Công bố điểm', exact: true }).click()
    await page.getByLabel('Lý do công bố hoặc thu hồi').fill('Đã rà soát đầy đủ điểm trong lớp')
    await page.getByRole('button', { name: 'Xác nhận công bố' }).click()
    await page.getByRole('button', { name: 'Chi tiết SE190001, Lab 01 · Lập trình căn bản' }).waitFor()
    assert.deepEqual(lastChange.changes.map(c => c.submissionId), ['a-lab'])
    assert.equal(lastChange.changes[0].published, true)

    await page.getByRole('button', { name: 'Cấu hình trọng số' }).click()
    await page.getByLabel('Trọng số Lab 01 · Lập trình căn bản').fill('50')
    await page.getByLabel('Trọng số Dự án cuối môn').fill('50')
    await page.getByLabel('Lý do thay đổi trọng số').fill('Cập nhật theo đề cương học phần')
    await page.getByRole('button', { name: 'Lưu trọng số' }).click()
    await page.getByText('Đã lưu trọng số', { exact: false }).waitFor()
    assert.deepEqual(lastWeights.weights.map(w => w.weight), [50, 50])
    await page.getByRole('button', { name: 'Xuất Excel' }).waitFor()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Xuất Excel' }).click()
    const download = await downloadPromise
    const file = path.join(output, download.suggestedFilename()); await download.saveAs(file)
    const workbook = XLSX.readFile(file), text = JSON.stringify(XLSX.utils.sheet_to_json(workbook.Sheets['Bảng điểm'], { header: 1 }))
    assert.match(text, /SE190001/); assert.match(text, /17.5/)

    await page.getByLabel('Tìm sinh viên').fill('khong-co-sinh-vien')
    await page.getByText('Không có sinh viên phù hợp bộ lọc.').waitFor()
    await page.getByLabel('Tìm sinh viên').fill('')
    await page.getByLabel('Học kỳ', { exact: true }).selectOption('spring')
    assert.equal(await page.getByLabel('Môn học của lớp', { exact: true }).inputValue(), '')
    assert.equal(await page.getByLabel('Lớp trong kỳ', { exact: true }).inputValue(), '')
    await page.getByLabel('Lớp trong kỳ', { exact: true }).selectOption('SE1901')
    await page.getByLabel('Môn học của lớp', { exact: true }).selectOption('spring-course')
    await page.getByRole('button', { name: 'Chi tiết SE190001, Lab 01 · Lập trình căn bản' }).waitFor()
    assert.match(page.url(), /classId=spring-course/)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'page must not overflow horizontally')
    assert.deepEqual(errors, [])
    console.log('PASS: deep link, hierarchy resets, zero score, editing, history, conflict, bulk publication, course weights, Excel export, empty filter, mobile layout; no browser errors.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
