const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5174'
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    for (const [execution, expected] of [
      [{ runtimeStack: 'android', ready: false, limitation: '/private/compiler-error' }, 'Đánh giá mã nguồn Android; chưa chạy trên máy ảo.'],
      [{ runtimeStack: 'console', ready: true, limitation: null }, 'Môi trường thực thi đã sẵn sàng.'],
      ['Legacy execution result', 'Legacy execution result'],
    ]) {
      const context = await browser.newContext()
      const user = { id: 'student-test', role: 'student', fullName: 'Dashboard Test' }
      await context.addInitScript(user => {
        localStorage.setItem('aita_token', 'fixture-token')
        localStorage.setItem('aita_user', JSON.stringify(user))
      }, user)
      await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname.replace('/api', '')
        let data = []
        if (path === '/auth/me') data = user
        if (path === '/notifications/unread-count') data = { count: 0 }
        if (path === '/student-portal/dashboard') data = {
          enrolledClasses: [], upcomingAssignments: [],
          recentAiResult: { title: 'Structured report regression', subject: 'TEST101', score: 8, maxScore: 10, assignmentId: 'a', execution, testcases: { unexpected: true }, review: { unexpected: true } },
        }
        await route.fulfill({ json: { success: true, data } }).catch(() => {})
      })
      const page = await context.newPage(), errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}/student`)
      await page.getByText('Structured report regression', { exact: true }).waitFor()
      await page.getByText(expected, { exact: true }).waitFor()
      assert.equal(await page.getByText('/private/compiler-error', { exact: true }).count(), 0)
      assert.deepEqual(errors, [])
      await context.close()
    }
    console.log('PASS: student dashboard renders structured unavailable/ready execution and legacy text; malformed test/review metadata never becomes a React child. Mock API only.')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
