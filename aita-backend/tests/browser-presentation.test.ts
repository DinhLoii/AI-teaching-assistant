import test from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { browserPresentationContext, readBrowserPresentation, reportWithBrowserPresentation, launchGradingBrowser } from '../src/modules/grading/engine/application/execution/browser-presentation.js'
import { scoreBrowserWorkflows } from '../src/modules/grading/engine/application/evaluator/browser-workflow-score.js'
import { DurableGradingQueue } from '../src/modules/grading/engine/application/queue/durable-grading-queue.js'
import { globalJobManager } from '../src/modules/grading/engine/application/queue/SubmissionJobManager.js'
import { BrowserTestRunner } from '../src/modules/grading/engine/plugins/playwright/BrowserTestRunner.js'

test('browser choice survives queue restart without changing saved grading content', () => {
  const report = reportWithBrowserPresentation('{"rawScore":8,"passedRules":[{"id":"r"}]}', true)
  assert.equal(JSON.parse(report).rawScore, 8)
  assert.equal(JSON.parse(report).passedRules[0].id, 'r')
  assert.equal(readBrowserPresentation(report).watchBrowser, true)
  assert.equal(readBrowserPresentation(reportWithBrowserPresentation(report, false)).watchBrowser, false)
  assert.equal(readBrowserPresentation('not-json').watchBrowser, true)
  assert.equal(readBrowserPresentation('{"__browserPresentation":{"watchBrowser":"true"}}').watchBrowser, true)
})

test('UI browsers open a native window by default; internal screenshot browsers stay isolated', async () => {
  const original = chromium.launch
  const calls: any[] = []
  chromium.launch = async (options: any) => { calls.push(options); return { options } as any }
  try {
    assert.equal((await launchGradingBrowser()).visible, true)
    await Promise.all([
      browserPresentationContext.run({ watchBrowser: true }, async () => { await Promise.resolve(); const opened = await launchGradingBrowser(); assert.equal(opened.visible, true) }),
      browserPresentationContext.run({ watchBrowser: false }, async () => { await Promise.resolve(); const opened = await launchGradingBrowser(); assert.equal(opened.visible, false) }),
    ])
    assert.ok(calls.some(options => options.headless === false && options.slowMo === 350))
    assert.ok(calls.filter(options => options.headless === false).every(options => options.args.includes('--start-maximized')))
    assert.ok(calls.some(options => options.headless === true))
    assert.equal(browserPresentationContext.getStore(), undefined)
  } finally { chromium.launch = original }
})

test('a worker without a desktop falls back visibly in logs, never claiming a window opened', async () => {
  const original = chromium.launch
  const messages: string[] = []
  let calls = 0
  chromium.launch = async (options: any) => { calls++; if (!options.headless) throw new Error('No display'); return {} as any }
  try {
    const result = await browserPresentationContext.run({ watchBrowser: true }, () => launchGradingBrowser(message => messages.push(message)))
    assert.equal(result.visible, false)
    assert.equal(calls, 2)
    assert.ok(messages.some(message => message.includes('chuyển sang chạy nền')))
    assert.ok(messages.every(message => !message.includes('Đã mở cửa sổ')))
  } finally { chromium.launch = original }
})

test('visible workflows follow native window resizing while headless workflows retain a fixed viewport', async () => {
  for (const visible of [true, false]) {
    let options: any, closedBrowser = false
    const browser = {
      newContext: async (value: any) => { options = value; return { newPage: async () => ({ setDefaultTimeout() {}, isClosed: () => true, close: async () => {} }), close: async () => {} } },
      close: async () => { closedBrowser = true },
    }
    const runner = new BrowserTestRunner('viewport', { submissionId: 's', baseUrl: 'http://localhost', artifactsDir: '.', browserSession: { browser, visible } } as any, {} as any)
    await runner.initializeAsync()
    assert.deepEqual(options.viewport, visible ? null : { width: 1280, height: 720 })
    await runner.teardownAsync()
    assert.equal(closedBrowser, false) // The executor owns and closes the shared window.
  }
})

test('closing the browser requires review rather than a student failure score', () => {
  const result = scoreBrowserWorkflows(['form'], [{ type: 'browser.workflow.completed', payload: { testId: 'form', success: false, executionError: true } }], 2)
  assert.equal(result.needsReview, true)
  assert.match(result.reason, /cần chạy lại/)
})

test('a browser initialization error still closes the browser created by the grading run', async () => {
  const { PlaywrightPlugin } = await import('../src/modules/grading/engine/plugins/playwright/PlaywrightPlugin.js')
  const original = BrowserTestRunner.prototype.initializeAsync
  let closed = 0
  BrowserTestRunner.prototype.initializeAsync = async function () {
    ;(this as any).browser = { close: async () => { closed++ } }
    throw new Error('Fixture page initialization failed')
  }
  try {
    await assert.rejects(new PlaywrightPlugin({} as any).executeAsync({ submissionId: 's', apiUrl: 'http://localhost:8080', artifacts: [] }, []), /initialization failed/)
    assert.equal(closed, 1)
  } finally { BrowserTestRunner.prototype.initializeAsync = original }
})

test('a duplicate enqueue cannot toggle the browser choice for an already-running job', async () => {
  let updates = 0
  const db = { $transaction: async (work: any) => work({ submission: { findUnique: async () => ({ Id: 's', ZipFileUrl: '/s.zip', ReportData: '{}' }), update: async () => { updates++ } }, $queryRaw: async () => [] }) }
  const result = await new DurableGradingQueue(db).enqueue('s', 'batch', { watchBrowser: true })
  assert.equal(result.accepted, false)
  assert.equal(updates, 0)
})

test('legacy automatic UI tasks are held until a lecturer explicitly starts them', async () => {
  let evaluated = false, pending = false
  const db = {
    submission: { findUnique: async () => ({ Exam: { Subject: { SubjectCode: 'FER202' } } }), updateMany: async ({ data }: any) => { pending = data.GradingStatus === 'Pending'; return { count: 1 } } },
    $executeRaw: async () => 1,
  }
  const queue = new DurableGradingQueue(db) as any
  await queue.run({ SubmissionId: 'held-ui', Lane: 'continuous', Attempts: 1, LeaseOwner: 'test', RequestedAt: new Date(), LeaseUntil: new Date(Date.now() + 120000) }, async () => { evaluated = true })
  assert.equal(evaluated, false)
  assert.equal(pending, true)
})

test('an accepted durable job saves its own browser choice and preserves the previous score', async () => {
  let update: any
  const id = 'browser-enqueue-test'
  const db = { $transaction: async (work: any) => work({
    submission: { findUnique: async () => ({ Id: id, ZipFileUrl: '/s.zip', ReportData: '{"rawScore":8}' }), update: async (query: any) => { update = query.data } },
    $queryRaw: async () => [{ SubmissionId: id, RequestedAt: new Date() }],
  }) }
  try {
    const result = await new DurableGradingQueue(db).enqueue(id, 'batch', { watchBrowser: true })
    assert.equal(result.accepted, true)
    assert.equal(JSON.parse(update.ReportData).rawScore, 8)
    assert.equal(readBrowserPresentation(update.ReportData).watchBrowser, true)
  } finally { globalJobManager.clearJob(id) }
})

test('runner classifies a closed Chromium page as interrupted evidence', async () => {
  const runner = new BrowserTestRunner('test', { submissionId: 's', baseUrl: 'http://localhost:8080', artifactsDir: '.' } as any, {} as any) as any
  runner.page = { url: () => 'about:blank', goto: async () => { throw new Error('Target page, context or browser has been closed') } }
  const evidence = await runner.executeTestAsync({ id: 'form', name: 'Form', startUrl: '/', steps: [{ action: 'assertVisible', target: 'form' }] })
  const workflow = evidence.find((row: any) => row.type === 'browser.workflow.completed')
  assert.equal(workflow.payload.executionError, true)
  assert.equal(scoreBrowserWorkflows(['form'], evidence, 2).needsReview, true)
})

test('hash-only React navigation is valid without inventing an HTTP response', async () => {
  const runner = new BrowserTestRunner('test', { submissionId: 's', baseUrl: 'http://localhost:8080', artifactsDir: '.' } as any, {} as any) as any
  runner.page = { url: () => 'http://localhost:8080/#login', goto: async () => null }
  const evidence = await runner.executeTestAsync({ id: 'register', name: 'Hash routing', startUrl: '/#register', steps: [{ action: 'navigate', target: '/#login' }] })
  assert.equal(evidence.find((row: any) => row.type === 'browser.workflow.completed').payload.success, true)
  const navigation = evidence.find((row: any) => row.type === 'browser.navigation.completed')
  assert.equal(navigation.payload.sameDocument, true)
  assert.equal(navigation.payload.status, undefined)
})

test('an empty first response and HTTP errors are not accepted as hash navigation', async () => {
  const runner = new BrowserTestRunner('test', { submissionId: 's', baseUrl: 'http://localhost:8080', artifactsDir: '.' } as any, {} as any) as any
  runner.page = { url: () => 'about:blank', goto: async () => null }
  await assert.rejects(runner.navigateToSubmission('/#register'), /Navigation returned 0/)
  runner.page = { url: () => 'http://localhost:8080/#login', goto: async () => ({ ok: () => false, status: () => 404 }) }
  await assert.rejects(runner.navigateToSubmission('/missing'), /404/)
  await assert.rejects(runner.navigateToSubmission('https://example.com'), /running submission/)
})
