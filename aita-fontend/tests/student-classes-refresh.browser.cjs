const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const user = { id: 'student-test', role: 'student', fullName: 'Test Student', email: 'test@example.invalid' }
  await context.addInitScript(user => {
    localStorage.setItem('aita_token', 'test-token')
    localStorage.setItem('aita_user', JSON.stringify(user))
  }, user)
  let dashboardCalls = 0, semesterCalls = 0, release, requestStarted, fail = false
  const errors = []
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api', '')
    let data = []
    if (path === '/auth/me') data = user
    if (path === '/notifications/unread-count') data = { count: 0 }
    if (path === '/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"CONNECTED"}\n\n' })
    if (path === '/semesters') { semesterCalls++; data = [{ id: 'semester-1', season: 'Spring', isActive: true }] }
    if (path === '/student-portal/dashboard') {
      dashboardCalls++
      const call = dashboardCalls
      if (call > 1) await new Promise(resolve => { release = resolve; requestStarted?.() })
      if (fail) return route.fulfill({ status: 503, json: { success: false, message: 'Refresh failed' } })
      data = { enrolledClasses: [{ id: 'class-1', classCode: 'PRJ301-SE1701', subject: { code: 'PRJ301', name: call > 1 ? 'Java Web Updated' : 'Java Web', credit: 3 }, semester: { season: 'Spring' }, lecturers: [], studentCount: 4, assignmentCount: 1 }] }
    }
    await route.fulfill({ json: { success: true, data } }).catch(() => {})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${base}/student/classes`)
    await page.getByRole('heading', { name: 'Java Web', exact: true }).waitFor()
    const button = page.getByRole('button', { name: 'Làm mới', exact: true })
    const before = await button.boundingBox()
    const refreshStarted = new Promise(resolve => { requestStarted = resolve })
    await button.click()
    const busy = page.getByRole('button', { name: 'Đang làm mới...', exact: true })
    await busy.waitFor()
    await refreshStarted
    assert.equal(await busy.isDisabled(), true)
    assert.equal(await busy.getAttribute('aria-busy'), 'true')
    assert.equal(await busy.locator('svg').evaluate(el => el.classList.contains('motion-safe:animate-spin')), true)
    assert.equal((await busy.boundingBox()).width, before.width)
    await page.getByRole('heading', { name: 'Java Web', exact: true }).waitFor()
    assert.equal(dashboardCalls, 2)
    assert.equal(semesterCalls, 2)
    await busy.evaluate(el => el.click())
    assert.equal(dashboardCalls, 2)
    release()
    await page.getByRole('heading', { name: 'Java Web Updated', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Làm mới', exact: true }).waitFor()
    fail = true
    const failedRefreshStarted = new Promise(resolve => { requestStarted = resolve })
    await page.getByRole('button', { name: 'Làm mới', exact: true }).click()
    await page.getByRole('button', { name: 'Đang làm mới...', exact: true }).waitFor()
    await failedRefreshStarted
    release()
    await page.getByRole('alert').filter({ hasText: 'Refresh failed' }).waitFor()
    await page.getByRole('heading', { name: 'Java Web Updated', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Làm mới', exact: true }).isEnabled(), true)
    assert.deepEqual(errors, [])
    console.log('PASS: refresh spinner/label/disabled state, stable button width, preserved cards, cache bypass, duplicate-click guard, fresh data and failure recovery. Mock API only.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
