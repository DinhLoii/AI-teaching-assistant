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
  const context = await browser.newContext()
  const classes = deferred(), refresh = deferred(), deletion = deferred()
  const user = { id: 'lecturer-test', role: 'lecturer', fullName: 'Performance Test' }
  await context.addInitScript(user => {
    localStorage.setItem('aita_token', 'fixture-token')
    localStorage.setItem('aita_user', JSON.stringify(user))
  }, user)
  let deleted = false, permanent = false, classRequests = 0, trashRequests = 0, refreshRequests = 0
  const errors = []
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api', '')
    const method = route.request().method()
    let data = []
    if (path === '/auth/me') data = user
    if (path === '/notifications/unread-count') data = { count: 0 }
    if (path === '/classes') { classRequests++; await classes.promise }
    if (path === '/grading/assignments/a' && method === 'DELETE') {
      await deletion.promise
      deleted = true
    }
    if (path === '/grading/assignments/a/hard-delete' && method === 'DELETE') permanent = true
    if (path === '/assignments' || path === '/grading/assignments/trash') {
      if (path.endsWith('/trash')) trashRequests++
      // Capture the old snapshot before blocking to exercise a late-response race.
      const row = { id: 'a', title: 'Performance Assignment', status: deleted ? 'deleted' : 'published', isDeleted: deleted }
      data = permanent || (path === '/assignments' ? deleted : !deleted) ? [] : [row]
      if (deleted) { refreshRequests++; await refresh.promise }
    }
    await route.fulfill({ json: { success: true, data } }).catch(() => {})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('dialog', dialog => dialog.accept())
  try {
    await page.goto(`${base}/lecturer/grading/assignments`)
    const heading = page.getByRole('heading', { name: 'Performance Assignment', exact: true })
    await heading.waitFor({ timeout: 15000 })
    assert.equal(classRequests, 1)
    assert.equal(trashRequests, 0)
    // Class options remain blocked while the assignment is already usable.
    await page.getByRole('button', { name: 'Chuyển Performance Assignment vào thùng rác', exact: true }).click()
    await page.locator('button[aria-busy="true"]').first().waitFor()
    assert.equal(await heading.count(), 1, 'Do not report deletion before the server commits')
    deletion.resolve()
    await page.getByRole('status').filter({ hasText: 'Đã chuyển 1' }).waitFor()
    assert.equal(await page.locator('button[aria-busy="true"]').count(), 0)
    await page.getByRole('button', { name: /^Thùng rác/ }).click()
    await heading.waitFor()
    const card = heading.locator('../..')
    assert.equal(await card.getByRole('button', { name: 'Xóa vĩnh viễn', exact: true }).isEnabled(), true)
    // Both reconciliation reads remain blocked, but another mutation must work.
    await card.getByRole('button', { name: 'Xóa vĩnh viễn', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Đã xóa vĩnh viễn 1' }).waitFor()
    assert.equal(await heading.count(), 0)
    assert.equal(await page.locator('button[aria-busy="true"]').count(), 0)
    assert.equal(classRequests, 1, 'Mutations must not reload creation options')
    assert.ok(refreshRequests >= 2)
    const finalTrash = page.waitForResponse(response => response.url().endsWith('/api/grading/assignments/trash'))
    refresh.resolve()
    classes.resolve()
    await finalTrash
    await page.getByText('Thùng rác trống.', { exact: true }).waitFor()
    assert.equal(await heading.count(), 0, 'A late refresh must not resurrect a permanently deleted row')
    assert.deepEqual(errors, [])
    console.log('PASS: blocked classes do not block rendering; committed deletes unlock actions during blocked refresh; late reads cannot resurrect deleted rows. Mock API only.')
  } finally {
    classes.resolve(); refresh.resolve(); deletion.resolve()
    await browser.close()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
