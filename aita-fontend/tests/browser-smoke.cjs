let chromium
try {
  chromium = require('playwright').chromium
} catch {
  try {
    chromium = require('../../aita-backend/node_modules/playwright').chromium
  } catch {
    try {
      chromium = require('../aita-backend/node_modules/playwright').chromium
    } catch {
      chromium = require('playwright').chromium
    }
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  const mutations = []
  let classes = Array.from({ length: 11 }, (_, index) => ({ id: `class-${index}`, code: `SE${index}`, subject: { id: 'subject-1', code: 'TEST101', name: 'Test subject' }, semester: { id: 'semester-1', code: 'Fall 2026' }, lecturers: [{ id: 'lecturer-1', name: 'Test Lecturer' }], studentCount: 0 }))
  let aiConfig = { aiEndpoint: '', aiModel: 'test-model', aiTimeout: '60', aiStubMode: 'true' }
  let prompts = []
  async function context(role) {
    const user = { id: `${role}-1`, email: `${role}@test.invalid`, fullName: 'Test User', name: 'Test User', role, status: 'active' }
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
    await ctx.addInitScript(user => { localStorage.setItem('aita_token', 'test'); localStorage.setItem('aita_user', JSON.stringify(user)) }, user)
    await ctx.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), p = url.pathname.replace('/api', '')
      let data = []
      if (p === '/auth/me') data = user
      else if (p === '/notifications/unread-count') data = { count: 27 }
      else if (p === '/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"CONNECTED"}\n\n' })
      else if (p === '/classes' && req.method() === 'GET') { const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 10); data = classes.slice((page - 1) * limit, page * limit) }
      else if (p === '/classes' && req.method() === 'POST') { const body = req.postDataJSON(); mutations.push(body); data = { id: 'created-class', ...body, subject: { id: body.subjectId, name: 'Test subject' }, semester: { id: body.semesterId, code: 'Fall 2026' }, studentCount: 0 }; classes.unshift(data) }
      else if (p === '/subjects') data = [{ id: 'subject-1', code: 'TEST101', name: 'Test subject' }]
      else if (p === '/semesters') data = [{ id: 'semester-1', code: 'Fall 2026', isActive: true }]
      else if (p === '/users') data = [{ id: 'lecturer-1', name: 'Test Lecturer', email: 'lecturer@test.invalid', role: 'lecturer', status: 'active' }]
      else if (p === '/ai/config') { if (req.method() === 'PUT') aiConfig = req.postDataJSON(); data = aiConfig }
      else if (p.startsWith('/prompts/subject/')) data = prompts
      else if (p === '/prompts' && req.method() === 'POST') { data = { id: 'prompt-1', usageCount: 0, ...req.postDataJSON() }; prompts.push(data) }
      else if (p === '/prompts/prompt-1' && req.method() === 'PUT') { prompts[0] = { ...prompts[0], ...req.postDataJSON() }; data = prompts[0] }
      else if (p === '/prompts/prompt-1' && req.method() === 'DELETE') prompts = []
      await route.fulfill({ json: { success: true, data } })
    })
    const page = await ctx.newPage()
    page.on('pageerror', error => errors.push(error.message))
    return { ctx, page }
  }
  try {
    const { ctx, page } = await context('admin')
    await page.goto('http://localhost:5194/admin/classes')
    await page.getByRole('heading', { name: 'SE0', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Trang sau' }).click()
    await page.getByRole('heading', { name: 'SE10', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Trang trước' }).click()
    await page.getByRole('button', { name: 'Mở lớp mới', exact: true }).click()
    const modal = page.getByRole('dialog')
    await modal.getByLabel('Mã lớp', { exact: true }).fill('NEW101')
    await modal.getByLabel(/^Môn học/).selectOption('subject-1')
    await modal.getByLabel(/^Học kỳ/).selectOption('semester-1')
    await modal.getByLabel(/^Giảng viên/).selectOption('lecturer-1')
    await modal.getByRole('button', { name: 'Lưu lớp học' }).click()
    await page.getByRole('heading', { name: 'NEW101', exact: true }).waitFor()
    assert.deepEqual(mutations[0], { code: 'NEW101', subjectId: 'subject-1', semesterId: 'semester-1', lecturerId: 'lecturer-1' })
    await page.reload()
    await page.getByRole('heading', { name: 'NEW101', exact: true }).waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Mở menu điều hướng' }).click()
    await page.getByRole('dialog', { name: 'Điều hướng' }).waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('dialog').count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('http://localhost:5194/admin/ai-config')
    await page.getByLabel('Tên mô hình').fill('updated-model')
    await page.getByRole('button', { name: 'Lưu cấu hình' }).click()
    await page.getByRole('status').filter({ hasText: 'Đã lưu và kiểm tra lại dữ liệu' }).waitFor()
    await page.reload()

    await page.getByLabel('Tên mô hình').waitFor()
    assert.equal(await page.getByLabel('Tên mô hình').inputValue(), 'updated-model')
    await ctx.close()
    const lecturer = await context('lecturer')
    await lecturer.page.goto('http://localhost:5194/lecturer/prompts')
    await lecturer.page.getByRole('combobox').selectOption('subject-1')
    await lecturer.page.getByRole('button', { name: 'Tạo prompt', exact: true }).click()
    await lecturer.page.getByLabel('Tên prompt', { exact: true }).fill('Test prompt')
    await lecturer.page.getByLabel('Nội dung', { exact: true }).fill('Grade according to the rubric')
    await lecturer.page.getByRole('button', { name: 'Lưu prompt' }).click()
    await lecturer.page.getByRole('heading', { name: 'Test prompt' }).waitFor()
    await lecturer.page.getByRole('button', { name: 'Chỉnh sửa' }).click()
    await lecturer.page.getByLabel('Tên prompt', { exact: true }).fill('Edited prompt')
    await lecturer.page.getByRole('button', { name: 'Lưu prompt' }).click()
    await lecturer.page.getByRole('heading', { name: 'Edited prompt' }).waitFor()
    lecturer.page.once('dialog', dialog => dialog.accept())
    await lecturer.page.getByRole('button', { name: 'Xóa', exact: true }).click()
    await lecturer.page.getByText('Môn này chưa có prompt.', { exact: true }).waitFor()
    await lecturer.ctx.close()
    assert.deepEqual(errors, [])
    console.log('PASS: class pagination/create/read-back, exact ID payload, 390px menu/Escape/no overflow, AI config persistence, prompt CRUD; no page errors. Mock API only.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
