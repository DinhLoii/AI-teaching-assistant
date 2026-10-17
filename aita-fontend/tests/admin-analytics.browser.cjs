const assert = require('node:assert/strict')
const http = require('node:http')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'

async function main() {
  const { sseService } = await import('../../aita-backend/dist/shared/infrastructure/sse-service.js')
  const { invalidateAnalytics } = await import('../../aita-backend/dist/shared/infrastructure/analytics-realtime.js')
  const streams = new Set()
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Accept')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
    if (req.url !== '/api/notifications/stream') { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' })
    res.write('data: {"type":"CONNECTED"}\n\n')
    const cleanup = sseService.register('admin-test', res, 'admin')
    streams.add(res)
    res.on('close', () => { cleanup(); streams.delete(res) })
  })
  await new Promise(resolve => server.listen(5195, '127.0.0.1', resolve))
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true })
  const user = { id: 'admin-test', role: 'admin', fullName: 'Test Admin', email: 'admin@example.invalid' }
  await context.addInitScript(user => {
    localStorage.setItem('aita_token', 'test-token')
    localStorage.setItem('aita_user', JSON.stringify(user))
    const original = window.fetch.bind(window)
    window.fetch = (input, options) => {
      if (String(input).endsWith('/notifications/stream')) return original('http://127.0.0.1:5195/api/notifications/stream', options)
      return original(input, options)
    }
  }, user)
  let students = 6, exams = 4, gradeCount = 2, average = 8.5, empty = false, fail = false
  let calls = 0, release, held, holdNext = false
  const errors = []
  const makeReport = url => {
    const period = url.searchParams.get('period') || '30d'
    const from = period === 'custom' ? url.searchParams.get('start') : period === '7d' ? '2026-10-10' : '2026-09-17'
    const to = period === 'custom' ? url.searchParams.get('end') : '2026-10-16'
    const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1
    return {
      period, generatedAt: new Date().toISOString(), range: { from, to, timezone: 'Asia/Ho_Chi_Minh' },
      summary: { users: empty ? 0 : students + 4, classes: empty ? 0 : 5, exams: empty ? 0 : exams, subjects: empty ? 0 : 4, submissions: empty ? 0 : gradeCount, evaluated: empty ? 0 : gradeCount, auditLogs: 0, assignedClasses: empty ? 0 : 5, assignedLecturers: empty ? 0 : 2 },
      roles: empty ? [] : [{ role: 'student', count: students }, { role: 'lecturer', count: 2 }, { role: 'admin', count: 2 }],
      trend: Array.from({ length: days }, (_, i) => ({ date: new Date(new Date(from).getTime() + i * 86400000).toISOString().slice(0, 10), submissions: !empty && i === days - 1 ? gradeCount : 0, evaluated: !empty && i === days - 1 ? gradeCount : 0 })),
      grades: { count: empty ? 0 : gradeCount, average: empty ? null : average, passed: empty ? 0 : 2, bins: empty ? [0, 0, 0, 0, 0] : [1, 1, 0, 0, gradeCount - 2] }, majors: null,
    }
  }
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname.replace('/api', '')
    if (url.port === '5195') return route.continue()
    let data = []
    if (path === '/auth/me') data = user
    if (path === '/notifications/unread-count') data = { count: 0 }
    if (path === '/reports/health') data = { api: { status: 'up', formattedUptime: '1h 2m' }, database: { status: 'up', latencyMs: 4 }, aiEngine: { status: 'unknown', mode: 'stub' } }
    if (path === '/reports') {
      calls++
      if (url.searchParams.get('period') === 'semester') return route.fulfill({ status: 400, json: { success: false, message: 'Chưa cấu hình ngày bắt đầu và kết thúc học kỳ đang hoạt động.' } })
      data = makeReport(url)
      if (holdNext) {
        holdNext = false
        await new Promise(resolve => { release = resolve; held?.() })
      }
      if (fail) return route.fulfill({ status: 503, json: { success: false, message: 'Report temporarily unavailable' } })
    }
    await route.fulfill({ json: { success: true, data } }).catch(() => {})
  })
  const reports = await context.newPage(), overview = await context.newPage()
  for (const page of [reports, overview]) page.on('pageerror', error => errors.push(error.message))
  const total = page => page.getByTestId('role-total')
  const expectTotal = async (page, n) => {
    await page.bringToFront()
    await page.waitForFunction(value => document.querySelector('[data-testid="role-total"]')?.textContent === String(value), n)
  }
  try {
    await reports.goto(`${base}/admin/reports`)
    await overview.goto(`${base}/admin`)
    await expectTotal(reports, 10); await expectTotal(overview, 10)
    await reports.getByRole('img', { name: /Biểu đồ 30 ngày/ }).waitFor()
    assert.equal(await reports.getByTestId('average-score').textContent(), '8.50 / 10')
    await overview.getByText('Chưa có dữ liệu chuyên ngành sinh viên được lưu trong hệ thống.', { exact: true }).waitFor()
    assert.equal(await total(overview).textContent(), await total(reports).textContent())
    students++
    invalidateAnalytics()
    await expectTotal(reports, 11); await expectTotal(overview, 11)
    console.log('PASS: real SSE invalidation refreshes both admin pages with consistent global role counts.')
    gradeCount = 3; average = 5.67; exams = 5
    invalidateAnalytics()
    await reports.waitForFunction(() => document.querySelector('[data-testid="average-score"]')?.textContent === '5.67 / 10')
    await reports.getByText('1 bài (33.3%)', { exact: true }).first().waitFor()
    const before = calls
    for (let i = 0; i < 20; i++) invalidateAnalytics()
    await new Promise(resolve => setTimeout(resolve, 1000))
    assert.ok(calls - before <= 4, 'Burst invalidations are coalesced across two pages')
    console.log('PASS: new assignments/grades update; zero scores count; event bursts do not create request storms.')
    const started = new Promise(resolve => { held = resolve })
    holdNext = true
    await reports.getByRole('button', { name: 'Làm mới', exact: true }).click()
    await started
    students = 9
    invalidateAnalytics()
    await new Promise(resolve => setTimeout(resolve, 500))
    release()
    await expectTotal(reports, 13); await expectTotal(overview, 13)
    console.log('PASS: invalidation during an old snapshot queues a fresh read and rejects obsolete display data.')
    await reports.getByLabel('Khoảng thời gian báo cáo').selectOption('7d')
    await reports.getByRole('img', { name: /Biểu đồ 7 ngày/ }).waitFor()
    await reports.getByLabel('Khoảng thời gian báo cáo').selectOption('custom')
    await reports.getByLabel('Từ ngày', { exact: true }).fill('2026-10-15')
    await reports.getByLabel('Đến ngày', { exact: true }).fill('2026-10-16')
    await reports.getByRole('button', { name: 'Áp dụng', exact: true }).click()
    await reports.getByRole('img', { name: /Biểu đồ 2 ngày/ }).waitFor()
    const downloadEvent = reports.waitForEvent('download')
    await reports.getByRole('button', { name: 'Xuất JSON', exact: true }).click()
    const download = await downloadEvent, stream = await download.createReadStream()
    const chunks = []; for await (const chunk of stream) chunks.push(chunk)
    const exported = JSON.parse(Buffer.concat(chunks).toString())
    assert.equal(exported.range.from, '2026-10-15'); assert.equal(exported.trend.length, 2)
    assert.equal(exported.summary.users, 13)
    await reports.getByLabel('Từ ngày', { exact: true }).fill('2026-10-16')
    await reports.getByRole('button', { name: 'Áp dụng', exact: true }).click()
    await reports.getByRole('img', { name: /Biểu đồ 1 ngày/ }).waitFor()
    assert.equal(await reports.getByRole('img', { name: /Biểu đồ 1 ngày/ }).locator('circle').getAttribute('cx'), '495')
    fail = true
    await reports.getByRole('button', { name: 'Làm mới', exact: true }).click()
    await reports.getByRole('alert').filter({ hasText: 'Report temporarily unavailable' }).waitFor()
    assert.equal(await total(reports).textContent(), '13')
    fail = false
    await reports.getByRole('button', { name: 'Làm mới', exact: true }).click()
    await reports.waitForFunction(() => !document.querySelector('[role="alert"]'))
    await reports.bringToFront()
    students = 10
    const disconnectedAt = Date.now()
    for (const response of [...streams]) response.end()
    await reports.waitForFunction(() => document.querySelector('[data-testid="role-total"]')?.textContent === '14', null, { timeout: 5000 })
    assert.ok(Date.now() - disconnectedAt < 5000, 'Reconnect catches up without waiting for polling')
    await expectTotal(overview, 14)
    empty = true; invalidateAnalytics()
    await expectTotal(reports, 0); await expectTotal(overview, 0)
    await reports.getByText('Chưa có điểm hợp lệ đã công bố trong khoảng ngày này.', { exact: true }).waitFor()
    assert.equal(await reports.getByTestId('average-score').textContent(), 'Chưa có dữ liệu')
    await reports.setViewportSize({ width: 390, height: 844 })
    await reports.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'aita-report-mobile-check.png') })
    assert.equal(await reports.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile layout does not overflow')
    assert.deepEqual(errors, [])
    console.log('PASS: 7-day/custom filters, faithful JSON export, error retention/retry, reconnect catch-up, empty data and mobile layout. Mock REST + actual SSE service; no database writes.')
  } finally {
    await browser.close()
    for (const response of streams) response.end()
    await new Promise(resolve => server.close(resolve))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
