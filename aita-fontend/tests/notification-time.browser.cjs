const assert = require('node:assert/strict')
const http = require('node:http')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
const clients = new Map(), streams = new Set()
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  const role = req.headers.authorization?.replace('Bearer ', '')
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
  res.flushHeaders()
  if (!clients.has(role)) clients.set(role, new Set())
  clients.get(role).add(res); streams.add(res)
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', payload: { serverTime: new Date().toISOString() } })}\n\n`)
  res.on('close', () => { clients.get(role)?.delete(res); streams.delete(res) })
})
;(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const streamUrl = `http://127.0.0.1:${server.address().port}/stream`
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  try {
    for (const role of ['lecturer', 'student', 'admin']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Los_Angeles' })
      const user = { id: `${role}-test`, role, fullName: 'Timestamp Test' }
      const date = '2026-10-18T08:10:11.000Z'
      const rows = [{ id: role + '-existing', title: 'Persisted timestamp ' + role, message: 'Thông báo kiểm tra thời gian.', type: 'SYSTEM', createdAt: date, isRead: false }]
      await context.addInitScript(({ user, role }) => {
        localStorage.setItem('aita_token', role)
        localStorage.setItem('aita_user', JSON.stringify(user))
      }, { user, role })
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace('/api', '')
        if (path === '/notifications/stream') return route.continue({ url: streamUrl })
        let data = []
        if (path === '/auth/me') data = user
        if (path === '/notifications') data = rows
        if (path === '/notifications/unread-count') data = { count: rows.length }
        if (path === '/student-portal/dashboard') data = { enrolledClasses: [], upcomingAssignments: [] }
        if (path === '/reports') data = {
          summary: { users: 0, classes: 0, exams: 0, subjects: 0, submissions: 0, evaluated: 0, auditLogs: 0, assignedClasses: 0, assignedLecturers: 0 },
          roles: [], trend: [], grades: { count: 0, average: null, passed: 0, bins: [] }, range: { from: '2026-09-19', to: '2026-10-18', timezone: 'Asia/Ho_Chi_Minh' }, period: '30d', generatedAt: date,
        }
        if (path === '/reports/health') data = { api: { status: 'ok' }, database: { status: 'ok' }, aiEngine: { status: 'ok', mode: 'test' } }
        await route.fulfill({ json: { success: true, data } }).catch(() => {})
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(role + ': ' + error.message))
      await page.goto(`${base}/${role}/notifications`)
      await page.getByRole('heading', { name: rows[0].title, exact: true }).waitFor()
      const time = page.locator(`time[datetime="${date}"]`).first()
      assert.match(await time.textContent(), /15:10:11/)
      assert.match(await time.textContent(), /18\/10\/2026/)
      assert.match(await time.textContent(), /UTC\+7/)
      await page.waitForFunction(() => !!document.querySelector('[title="Thông báo đang cập nhật trực tiếp"]'))
      const live = { id: role + '-live', title: 'Realtime timestamp ' + role, message: 'Thông báo trực tiếp.', type: 'SYSTEM', createdAt: '2026-10-18T08:11:12.000Z', isRead: false }
      rows.unshift(live)
      for (const client of clients.get(role) || []) client.write(`data: ${JSON.stringify({ type: 'NOTIFICATION', payload: live, serverTime: new Date().toISOString() })}\n\n`)
      await page.getByRole('heading', { name: live.title, exact: true }).waitFor()
      assert.match(await page.locator(`time[datetime="${live.createdAt}"]`).textContent(), /15:11:12/)
      await page.reload()
      await page.getByRole('heading', { name: live.title, exact: true }).waitFor()
      assert.match(await page.locator(`time[datetime="${live.createdAt}"]`).textContent(), /15:11:12/)
      assert.equal(await page.getByText('Chưa rõ thời gian', { exact: true }).count(), 0)
      await page.setViewportSize({ width: 390, height: 844 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), role + ': mobile overflow')
      if (role === 'lecturer') await page.screenshot({ path: '../.cache/notification-time-lecturer-mobile.png', fullPage: true })
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto(`${base}/${role}`)
      const dashboardTime = page.locator(`time[datetime="${live.createdAt}"]`).first()
      await dashboardTime.waitFor()
      assert.match(await dashboardTime.getAttribute('title'), /15:11:12.*UTC\+7/)
      await context.close()
    }
    assert.deepEqual(errors, [])
    console.log('PASS: lecturer/student/admin inbox and dashboard timestamps; realtime and reload preserve dates; Vietnam time on a US device; mobile layout without overflow. Mock API only.')
  } finally {
    await browser.close()
    for (const stream of streams) stream.destroy()
    await new Promise(resolve => server.close(resolve))
  }
})().catch(error => { console.error(error); process.exitCode = 1; server.close() })
