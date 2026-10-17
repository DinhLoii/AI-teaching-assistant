const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const admin = { id: 'admin-test', role: 'admin', fullName: 'Test Admin', email: 'admin@example.invalid' }
  await context.addInitScript(user => {
    localStorage.setItem('aita_token', 'test-token')
    localStorage.setItem('aita_user', JSON.stringify(user))
  }, admin)
  let writes = 0
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api', '')
    if (route.request().method() !== 'GET') { writes++; return route.fulfill({ status: 500, json: { success: false } }) }
    let data = []
    if (path === '/auth/me') data = admin
    if (path === '/notifications/unread-count') data = { count: 0 }
    if (path === '/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"CONNECTED"}\n\n' })
    if (path === '/users') data = [1, 2].map(id => ({ id: `user-${id}`, fullName: `Test Person ${id}`, email: `user${id}@example.invalid`, role: url.searchParams.get('role') || 'LECTURER', status: 'active', lecturerCode: `GV00${id}`, studentCode: `HE000${id}` }))
    if (path.startsWith('/users/user-')) data = { id: 'user-1', fullName: 'Test Person 1', role: 'LECTURER', email: 'user1@example.invalid' }
    await route.fulfill({ json: { success: true, data } }).catch(() => {})
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    for (const role of ['lecturer', 'student', 'admin']) {
      await page.goto(`${base}/admin/users?role=${role}`)
      const trigger = page.getByRole('button', { name: 'Thao tác với Test Person 2', exact: true })
      await trigger.waitFor()
      await trigger.click()
      const menu = page.getByRole('menu')
      await menu.waitFor()
      assert.equal(await menu.evaluate(el => el.parentElement === document.body), true, 'Menu escapes table overflow')
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true')
      assert.equal(await menu.getByRole('menuitem').count(), 5)
      assert.equal(await menu.getByRole('menuitem').first().evaluate(el => el === document.activeElement), true)
      const last = menu.getByRole('menuitem').last()
      await last.scrollIntoViewIfNeeded()
      assert.equal(await last.evaluate(el => {
        const r = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
      }), true, 'Last action is not clipped or covered by the footer')
      if (role === 'lecturer') await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'aita-user-action-menu-fixed.png') })
      await page.keyboard.press('Home')
      await page.keyboard.press('ArrowDown')
      assert.equal(await menu.getByRole('menuitem').nth(1).evaluate(el => el === document.activeElement), true)
      await page.keyboard.press('End')
      assert.equal(await last.evaluate(el => el === document.activeElement), true)
      await page.keyboard.press('Escape')
      assert.equal(await menu.count(), 0)
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true)
      await trigger.click()
      await page.getByRole('button', { name: 'Thao tác với Test Person 1', exact: true }).click()
      assert.equal(await page.getByRole('menu').count(), 1)
      assert.equal(await page.getByRole('menu').getAttribute('aria-label'), 'Thao tác với Test Person 1')
      await page.mouse.click(5, 130)
      assert.equal(await menu.count(), 0, 'Outside click closes without blocking the page')
      await trigger.click()
      await menu.getByRole('menuitem').first().click()
      await page.getByRole('dialog').waitFor()
      assert.equal(await menu.count(), 0, 'Action opens the existing profile modal')
      await page.keyboard.press('Escape')
      console.log(`PASS ${role}: no clipping, all actions reachable, one menu, keyboard navigation, focus restore, outside dismissal and profile action.`)
    }
    for (const viewport of [{ width: 900, height: 600 }, { width: 390, height: 700 }, { width: 1440, height: 420 }]) {
      await page.setViewportSize(viewport)
      await page.goto(`${base}/admin/users?role=lecturer`)
      const trigger = page.getByRole('button', { name: 'Thao tác với Test Person 2', exact: true })
      await trigger.click()
      const menu = page.getByRole('menu')
      await menu.waitFor()
      const bounds = await menu.boundingBox()
      assert.ok(bounds.x >= 7 && bounds.x + bounds.width <= viewport.width - 7, 'Clamped to horizontal viewport')
      assert.ok(bounds.y >= 7 && bounds.y + bounds.height <= viewport.height - 5, 'Fits above/below or scrolls within viewport')
      const last = menu.getByRole('menuitem').last()
      await last.focus()
      await last.scrollIntoViewIfNeeded()
      assert.equal(await last.isVisible(), true)
      await page.keyboard.press('Escape')
      console.log(`PASS viewport ${viewport.width}x${viewport.height}: menu stays inside screen and final action remains reachable.`)
    }
    assert.equal(writes, 0, 'No real or mocked mutation executed')
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
