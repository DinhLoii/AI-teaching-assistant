const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const user = { id: 'lecturer-test', role: 'lecturer', fullName: 'Lecturer Test' }
  await context.addInitScript(user => {
    localStorage.setItem('aita_token', 'fixture-token')
    localStorage.setItem('aita_user', JSON.stringify(user))
  }, user)
  const records = ['a', 'b', 'c'].map(id => ({ id, title: `Assignment ${id.toUpperCase()}`, status: 'published', subjectCode: 'PRM392', deleted: false }))
  let failId = null, deletions = 0, fallbackCalls = 0, trashUnavailable = false
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url()), method = route.request().method()
    const pathname = url.pathname.replace('/api', '')
    let data = []
    if (pathname === '/auth/me') data = user
    if (pathname === '/notifications/unread-count') data = { count: 0 }
    if (pathname === '/assignments') data = records.filter(row => !row.deleted && !row.permanent)
    if (pathname === '/grading/assignments/trash') {
      if (trashUnavailable) return route.fulfill({ status: 500, json: { success: false, message: 'Không tải được thùng rác. Vui lòng thử lại.' } })
      data = records.filter(row => row.deleted && !row.permanent)
    }
    const match = pathname.match(/^\/grading\/assignments\/([abc])(?:\/(restore|hard-delete))?$/)
    if (match && method === 'DELETE') {
      deletions++
      await new Promise(resolve => setTimeout(resolve, 400))
      if (failId === match[1]) return route.fulfill({ status: 500, json: { success: false, message: 'Fixture database write failed' } })
      if (match[2] === 'hard-delete') records.find(row => row.id === match[1]).permanent = true
      else records.find(row => row.id === match[1]).deleted = true
    }
    if (match?.[2] === 'restore' && method === 'POST') records.find(row => row.id === match[1]).deleted = false
    if (/^\/assignments\/[abc]$/.test(pathname) && method === 'DELETE') fallbackCalls++
    await route.fulfill({ json: { success: true, data } })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const card = title => page.getByRole('heading', { level: 3, name: title, exact: true }).locator('../..')
  const trashTab = () => page.getByRole('button', { name: /^Thùng rác/ }).click()
  const activeTab = () => page.getByRole('button', { name: /^Đang hoạt động/ }).click()
  try {
    await page.goto(`${base}/lecturer/grading/assignments`)
    await page.getByRole('heading', { name: 'Assignment A', exact: true }).waitFor()
    trashUnavailable = true
    await trashTab()
    await page.getByText(/Không tải được danh sách thùng rác/).waitFor()
    assert.equal(await page.getByText('Thùng rác trống.', { exact: true }).count(), 0)
    trashUnavailable = false
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click()
    await page.getByText('Thùng rác trống.', { exact: true }).waitFor()
    await activeTab()
    page.once('dialog', dialog => dialog.dismiss())
    await page.getByRole('button', { name: 'Chuyển Assignment A vào thùng rác', exact: true }).click()
    assert.equal(deletions, 0)
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Chuyển Assignment A vào thùng rác', exact: true }).click()
    await page.locator('button[aria-busy="true"]').first().waitFor()
    await page.getByRole('status').filter({ hasText: 'Đã chuyển 1' }).waitFor()
    assert.equal(await page.getByTestId('assignment-trash-count').textContent(), '1')
    assert.equal(await page.getByRole('heading', { name: 'Assignment A', exact: true }).count(), 0)
    await trashTab()
    await page.getByRole('heading', { name: 'Assignment A', exact: true }).waitFor()
    await page.reload()
    await trashTab()
    await card('Assignment A').getByRole('button', { name: 'Khôi phục', exact: true }).click()
    await page.getByText('Thùng rác trống.', { exact: true }).waitFor()
    assert.equal(await page.getByTestId('assignment-trash-count').textContent(), '0')
    await activeTab()
    await card('Assignment A').click()
    await card('Assignment B').click()
    failId = 'b'
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: /^Xóa \(2\)$/ }).click()
    await page.getByText(/1 bài tập chưa chuyển được: Fixture database write failed/).waitFor()
    await page.getByRole('button', { name: /^Xóa \(1\)$/ }).waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Assignment A', exact: true }).count(), 0)
    await page.getByRole('heading', { name: 'Assignment B', exact: true }).waitFor()
    await trashTab()
    await page.getByRole('heading', { name: 'Assignment A', exact: true }).waitFor()
    failId = 'a'
    page.once('dialog', dialog => dialog.accept())
    await card('Assignment A').getByRole('button', { name: 'Xóa vĩnh viễn', exact: true }).click()
    await page.getByText(/1 bài tập chưa xử lý được: Fixture database write failed/).waitFor()
    assert.equal(await page.getByTestId('assignment-trash-count').textContent(), '1')
    failId = null
    page.once('dialog', dialog => dialog.accept())
    await card('Assignment A').getByRole('button', { name: 'Xóa vĩnh viễn', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Đã xóa vĩnh viễn 1' }).waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Assignment A', exact: true }).count(), 0)
    assert.equal(await page.getByTestId('assignment-trash-count').textContent(), '0')
    await page.getByText('Thùng rác trống.', { exact: true }).waitFor()
    assert.equal(fallbackCalls, 0)
    assert.deepEqual(errors, [])
    console.log('PASS: live counters, trash/restore/permanent deletion without reload, failure retention, loading and partial bulk failure')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
