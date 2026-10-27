import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import Docker from 'dockerode'
import { chromium } from 'playwright'
import { ExecutionSandboxService } from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts'
import { decodeSandboxLogs } from '../src/modules/grading/engine/application/sandbox/java-runtime.ts'
import { PlaywrightExecutor } from '../src/modules/grading/engine/application/execution/PlaywrightExecutor.ts'
import { createDockerClient } from '../src/modules/grading/engine/application/sandbox/docker-client.ts'

const base = path.resolve('../output/FER202_Auth')
const temporary = path.resolve('../tmp/fer202-auth-' + Date.now())
await fs.mkdir(temporary, { recursive: true })
new AdmZip(path.join(base, 'folder.zip')).extractAllTo(temporary)
const tests = JSON.parse(await fs.readFile(path.join(base, 'browser-tests.json'), 'utf8'))
const docker = createDockerClient()
const store = {
  async storeArtifactAsync(submissionId, type, buffer, filename) {
    const target = path.join(base, path.basename(filename))
    await fs.writeFile(target, buffer)
    return { id: filename, submissionId, type, uri: target, createdAt: new Date().toISOString() }
  },
}
const service = new ExecutionSandboxService()
let handle, browser
const originalLaunch = chromium.launch
const gradingBrowsers = []
chromium.launch = async options => {
  const opened = await originalLaunch.call(chromium, options)
  gradingBrowsers.push({ browser: opened, visible: options?.headless === false })
  return opened
}
try {
  // Reproduce an uploaded exam labelled "project", not explicitly "frontend".
  handle = await service.startAsync(temporary, 'project')
  assert.equal(handle.isReady, true, handle.crashLogs)
  assert.equal(handle.projectType, 'frontend')
  assert.deepEqual(handle.additionalUrls, [])
  const response = await fetch(handle.baseUrl)
  assert.equal(response.status, 200)
  assert.match(await response.text(), /<div id="root"><\/div>/)
  const startup = decodeSandboxLogs(await docker.getContainer(handle.containerId).logs({ stdout: true, stderr: true }))
  assert.doesNotMatch(startup, /autoport|vite 0\.0\.0\.0/)
  console.log('PASS generic project label detects React, serves actual HTML on the published port, and avoids the broken Vite root override')
  let workflows = []
  if (process.env.VERIFY_AUTO_ONLY !== 'true') {
  const evidence = await new PlaywrightExecutor(store).executeAsync('fer-auth', temporary, { id: 'fer-auth', metadata: { projectType: 'frontend' }, testSuites: { browser: tests } }, handle.baseUrl, undefined, console.log)
  workflows = evidence.filter(row => row.type === 'browser.workflow.completed')
  assert.equal(workflows.length, 13)
  assert.ok(workflows.every(row => row.payload.success), JSON.stringify(workflows))
  console.log('PASS 13/13 registration/login browser workflows')
  assert.equal(gradingBrowsers.filter(row => row.visible).length, 1, 'Exactly one native workflow window must open automatically')
  assert.ok(gradingBrowsers.every(row => !row.browser.isConnected()), 'All grading browsers must close after execution')
  console.log('PASS native Chromium opens automatically and closes after workflows')
  }
  const before = gradingBrowsers.length
  const contract = JSON.parse(await fs.readFile(path.join(base, 'teacher-browser-contract.json'), 'utf8'))
  const automatic = await new PlaywrightExecutor(store).executeAsync('fer-auth-no-workflows', temporary, { ...contract, testSuites: { browser: [] } }, handle.baseUrl, handle.additionalUrls, console.log)
  const autoWorkflows = automatic.filter(row => row.type === 'browser.workflow.completed')
  assert.equal(autoWorkflows.length, 7)
  assert.ok(autoWorkflows.every(row => row.payload.success), JSON.stringify(autoWorkflows))
  assert.ok(automatic.some(row => row.type === 'browser.input.filled'))
  assert.ok(automatic.some(row => row.type === 'browser.element.clicked'))
  assert.ok(automatic.some(row => row.type === 'browser.workflow.planned' && row.payload.ruleIds.length))
  assert.equal(gradingBrowsers.length, before + 1)
  assert.equal(gradingBrowsers.at(-1).visible, true)
  assert.equal(gradingBrowsers.at(-1).browser.isConnected(), false)
  console.log('PASS 7 automatically prepared auth workflows fill inputs, click buttons, verify outcomes and close the native window')
  const exec = await docker.getContainer(handle.containerId).exec({ Cmd: ['sh', '-c', 'cd /sandbox/folder_submit && npm run build'], AttachStdout: true, AttachStderr: true })
  const stream = await exec.start({ Detach: false, Tty: false })
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const build = await exec.inspect()
  const buildLog = decodeSandboxLogs(Buffer.concat(chunks))
  assert.equal(build.ExitCode, 0, buildLog)
  await fs.writeFile(path.join(base, 'build-verification.log'), buildLog)
  console.log('PASS production build inside Docker')
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(handle.baseUrl + '/#register')
  await page.getByTestId('register-page').waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: path.join(base, 'mobile-register.png'), fullPage: true })
  console.log('PASS mobile layout at 390px')
  await fs.writeFile(path.join(base, 'verification.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), source: 'Exact folder.zip extracted into a fresh directory; application started with ExecutionSandboxService', runtime: 'node:20-alpine', browserWorkflowsPassed: workflows.length, browserWorkflowsTotal: process.env.VERIFY_AUTO_ONLY === 'true' ? 0 : tests.length, automaticAuthWorkflows: autoWorkflows.length, visibleBrowserVerified: true, productionBuildPassed: true, mobileWidth: 390, externalAiCalls: 0 }, null, 2))
} finally {
  chromium.launch = originalLaunch
  for (const row of gradingBrowsers) if (row.browser.isConnected()) await row.browser.close()
  if (browser) await browser.close()
  if (handle) await service.stopAsync(handle)
}
