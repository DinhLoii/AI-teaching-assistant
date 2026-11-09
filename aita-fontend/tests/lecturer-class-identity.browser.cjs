const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const user = { id: 'lecturer-test', role: 'lecturer', fullName: 'Test Lecturer', email: 'test@example.invalid' }
  const classes = ['PRF192-FALL2026', 'AITA-DEMO'].map((code, i) => ({
    id: `class-${i}`, code, name: 'Programming Fundamentals',
    subject: { id: 'subject-1', code: 'PRF192', name: 'Programming Fundamentals' },
    semester: { id: 'fall-2026', code: 'FALL2026', season: 'Fall' },
    lecturers: [user], studentCount: 6,
  }))
  await context.addInitScript(user => {
    localStorage.setItem('aita_token', 'test-token')
    localStorage.setItem('aita_user', JSON.stringify(user))
  }, user)
  await context.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api', '')
    let data = []
    if (path === '/auth/me') data = user
    if (path === '/notifications/unread-count') data = { count: 0 }
    if (path === '/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"CONNECTED"}\n\n' })
    if (path === '/classes') data = classes
    if (path === '/classes/class-1') data = classes[1]
    await route.fulfill({ json: { success: true, data } }).catch(() => {})
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${base}/lecturer/classes`)
    await page.getByText('AITA-DEMO', { exact: true }).waitFor()
    await page.getByText('PRF192-FALL2026', { exact: true }).waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Programming Fundamentals', exact: true }).count(), 2)
    assert.equal(await page.getByText('Spring 2026', { exact: false }).count(), 0)
    assert.equal(await page.getByText(/^(Học kỳ|Semester): FALL2026$/).count(), 2)
    await page.locator('a[href="/lecturer/classes/class-1"]').click()
    await page.getByRole('heading', { name: 'Programming Fundamentals', exact: true, level: 1 }).waitFor()
    await page.getByText('AITA-DEMO', { exact: true }).waitFor()
    await page.getByText('FALL2026', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.log('PASS: same-subject classes display distinct API codes; assigned semester and class detail retain identity. Mock API only.')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
