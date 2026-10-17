const assert = require('node:assert/strict')
const http = require('node:http')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'
const rows = new Map(), clients = new Map()
const streams = new Set()
const push = (role, event) => {
  for (const response of clients.get(role) || []) response.write(`data: ${JSON.stringify({ ...event, serverTime: new Date().toISOString() })}\n\n`)
}
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
  const role = req.headers.authorization?.replace('Bearer ', '')
  if (!['student', 'lecturer', 'admin'].includes(role)) { res.writeHead(401); res.end(); return }
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive' })
  res.flushHeaders()
  if (!clients.has(role)) clients.set(role, new Set())
  clients.get(role).add(res)
  streams.add(res)
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', payload: { serverTime: new Date().toISOString() } })}\n\n`)
  res.on('close', () => { clients.get(role).delete(res); streams.delete(res) })
})

async function main() {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(3001, '127.0.0.1', resolve)
  })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  try {
    for (const role of ['student', 'lecturer', 'admin']) {
      rows.set(role, [])
      const context = await browser.newContext()
      const user = { id: `${role}-1`, role, fullName: 'Realtime Test', email: 'test@example.invalid' }
      await context.addInitScript(({ role, user }) => {
        localStorage.setItem('aita_token', role)
        localStorage.setItem('aita_user', JSON.stringify(user))
      }, { role, user })
      let failDelete = false
      let releaseSnapshot, snapshotStarted
      let holdSnapshot = false
      await context.route('**/api/**', async route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api', '')
        if (path === '/notifications/stream') {
          assert.equal(url.origin, new URL(base).origin)
          return route.continue()
        }
        let data = []
        if (path === '/auth/me') data = user
        if (path === '/notifications/unread-count') data = { count: rows.get(role).filter(n => !n.isRead).length }
        if (path === '/notifications' && req.method() === 'GET') {
          data = rows.get(role).map(n => ({ ...n }))
          if (holdSnapshot) {
            holdSnapshot = false
            snapshotStarted?.()
            await new Promise(resolve => { releaseSnapshot = resolve })
          }
        }
        if (req.method() === 'PUT' && path === '/notifications/read-all') {
          rows.set(role, rows.get(role).map(n => ({ ...n, isRead: true })))
          push(role, { type: 'ALL_READ' })
        }
        if (req.method() === 'DELETE') {
          if (failDelete) { failDelete = false; return route.fulfill({ status: 503, json: { success: false, message: 'Temporary write failure' } }) }
          if (path === '/notifications/all') {
            rows.set(role, [])
            push(role, { type: 'ALL_DELETED' })
          } else {
            const id = path.split('/').pop()
            rows.set(role, rows.get(role).filter(n => n.id !== id))
            push(role, { type: 'NOTIFICATION_DELETED', payload: { notificationId: id } })
          }
        }
        await route.fulfill({ json: { success: true, data } }).catch(() => {})
      })
      const page = await context.newPage(), other = await context.newPage()
      for (const p of [page, other]) {
        p.on('pageerror', error => errors.push(error.message))
        p.on('dialog', dialog => dialog.accept())
        await p.goto(`${base}/${role}/notifications`)
        await p.getByText('Không có thông báo nào!', { exact: true }).waitFor()
      }
      await page.waitForFunction(() => !!document.querySelector('[title="Thông báo đang cập nhật trực tiếp"]'), undefined, { timeout: 10000 })
      assert.equal(clients.get(role).size, 2)
      const refreshStarted = new Promise(resolve => { snapshotStarted = resolve })
      holdSnapshot = true
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('aita_notification_update')))
      await refreshStarted
      const newItem = { id: `${role}-live`, title: `Live ${role}`, message: 'Nội dung realtime', type: 'SYSTEM', createdAt: new Date().toISOString(), isRead: false }
      rows.set(role, [newItem])
      push(role, { type: 'NOTIFICATION', payload: newItem })
      push(role, { type: 'NOTIFICATION', payload: newItem })
      for (const p of [page, other]) {
        await p.getByRole('heading', { name: newItem.title, exact: true }).waitFor({ timeout: 3000 })
        assert.equal(await p.getByRole('heading', { name: newItem.title, exact: true }).count(), 1)
        assert.equal(await p.locator('time').first().getAttribute('datetime'), newItem.createdAt)
      }
      releaseSnapshot()
      await page.getByRole('button', { name: /đã đọc tất cả/i }).click()
      await other.getByText('Mới', { exact: true }).waitFor({ state: 'hidden' })
      failDelete = true
      await page.getByTitle('Xóa thông báo này', { exact: true }).click()
      await page.getByRole('alert').filter({ hasText: 'Thao tác' }).waitFor()
      await page.getByRole('heading', { name: newItem.title, exact: true }).waitFor()
      await page.getByTitle('Xóa thông báo này', { exact: true }).click()
      for (const p of [page, other]) await p.getByText('Không có thông báo nào!', { exact: true }).waitFor()

      // Close live streams, add an event while disconnected, then verify reconnect catch-up.
      for (const res of [...clients.get(role)]) res.end()
      const missed = { ...newItem, id: `${role}-missed`, title: `Recovered ${role}` }
      rows.set(role, [missed])
      for (const p of [page, other]) await p.getByRole('heading', { name: missed.title, exact: true }).waitFor({ timeout: 8000 })
      await context.close()
    }
    assert.deepEqual(errors, [])
    console.log('PASS: authenticated streaming through the Next.js API proxy for student/lecturer/admin; two-tab live delivery, duplicate suppression, read/delete sync, failed-delete rollback, exact timestamps, reconnect recovery. Mock API and real local SSE transport only.')
  } finally {
    await browser.close()
    for (const response of streams) response.end()
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
