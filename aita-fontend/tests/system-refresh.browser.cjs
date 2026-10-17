const assert = require('node:assert/strict')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:5194'

const cases = [
  { role: 'student', route: '/student/assignments', target: '/assignments', row: title => [{ id: 'assignment-1', title, subjectCode: 'PRJ301' }] },
  { role: 'student', route: '/student/results', target: '/submissions', iconOnly: true, row: title => [{ id: 'submission-1', assignmentId: 'assignment-1', assignmentTitle: title, filename: 'solution.zip', subjectCode: 'PRJ301', status: 'GRADED', isPublished: true, score: 8 }] },
  { role: 'lecturer', route: '/lecturer/grading/history', target: '/grading/submissions/history', row: title => ({ history: [{ id: 'submission-1', assignmentTitle: title, studentName: 'Test Student', status: 'completed', score: 8 }], meta: { totalPages: 1 } }) },
  { role: 'admin', route: '/admin/users', target: '/users', row: title => [{ id: 'user-1', fullName: title, email: 'student@example.invalid', role: 'student', status: 'active' }] },
  { role: 'admin', route: '/admin/exams/assignment-1/submissions', target: '/submissions', row: title => [{ id: 'submission-1', student: title, studentId: 'student-1', filename: 'solution.zip', status: 'GRADED', score: 8 }] },
  { role: 'lecturer', route: '/lecturer/assignments/assignment-1/submissions', target: '/submissions', row: title => [{ id: 'submission-1', student: title, studentId: 'student-1', filename: 'solution.zip', status: 'GRADED', score: 8 }] },
]

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    for (const scenario of cases) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
      const user = { id: `${scenario.role}-test`, role: scenario.role, fullName: 'Test User', email: 'test@example.invalid' }
      await context.addInitScript(user => {
        localStorage.setItem('aita_token', 'test-token')
        localStorage.setItem('aita_user', JSON.stringify(user))
      }, user)
      let calls = 0, release, started, fail = false
      const errors = []
      await context.route('**/api/**', async route => {
        const url = new URL(route.request().url())
        const path = url.pathname.replace('/api', '')
        let data = []
        if (path === '/auth/me') data = user
        if (path === '/notifications/unread-count') data = { count: 0 }
        if (path === '/notifications/stream') return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"type":"CONNECTED"}\n\n' })
        if (path === '/student-portal/dashboard') data = { upcomingAssignments: [], enrolledClasses: [] }
        if (path === '/assignments/assignment-1') data = { id: 'assignment-1', title: 'Test assignment', subjectCode: 'PRJ301' }
        if (path === scenario.target && (!url.searchParams.has('page') || url.searchParams.get('page') === '1')) {
          const call = ++calls
          if (call > 1) await new Promise(resolve => { release = resolve; started?.() })
          if (fail) return route.fulfill({ status: 503, json: { success: false, message: 'Refresh unavailable' } })
          data = scenario.row(call > 1 ? 'Updated data' : 'Original data')
        }
        await route.fulfill({ json: { success: true, data } }).catch(() => {})
      })
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${base}${scenario.route}`)
      await page.getByText('Original data', { exact: true }).first().waitFor()
      const button = page.locator('[data-refresh-button]')
      await page.waitForFunction(() => !document.querySelector('[data-refresh-button]')?.disabled)
      const width = (await button.boundingBox()).width
      const ready = new Promise(resolve => { started = resolve })
      await button.click()
      await ready
      assert.equal(await button.isDisabled(), true)
      assert.equal(await button.getAttribute('aria-busy'), 'true')
      assert.equal(await button.getAttribute('aria-label'), 'Đang làm mới...')
      assert.equal(await button.locator('svg').evaluate(el => el.classList.contains('motion-safe:animate-spin')), true)
      assert.equal(await button.locator('svg').evaluate(el => getComputedStyle(el).animationName), 'none', 'Respects reduced motion')
      assert.equal((await button.boundingBox()).width, width)
      if (scenario.iconOnly) assert.equal(await button.locator('span:not([aria-hidden])').count(), 0)
      await page.getByText('Original data', { exact: true }).first().waitFor()
      await button.evaluate(el => { el.click(); el.click() })
      assert.equal(calls, 2, 'Refresh bypasses cached data and suppresses duplicate clicks')
      release()
      await page.getByText('Updated data', { exact: true }).first().waitFor()
      await page.waitForFunction(() => !document.querySelector('[data-refresh-button]').disabled)
      fail = true
      const failure = new Promise(resolve => { started = resolve })
      await button.click()
      await failure
      release()
      await page.getByRole('alert').filter({ hasText: 'Không thể làm mới' }).waitFor()
      await page.getByText('Updated data', { exact: true }).first().waitFor()
      assert.equal(await button.isEnabled(), true)
      fail = false
      const recovery = new Promise(resolve => { started = resolve })
      await button.click()
      await recovery
      release()
      await page.waitForFunction(() => !document.querySelector('[data-refresh-button]').disabled)
      assert.equal(await page.getByRole('alert').filter({ hasText: 'Không thể làm mới' }).count(), 0)
      assert.deepEqual(errors, [])
      console.log(`PASS ${scenario.role} ${scenario.route}: real pending state, stable width, cache bypass, retained content, duplicate guard, reduced motion, failure and retry.`)
      await context.close()
    }
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
