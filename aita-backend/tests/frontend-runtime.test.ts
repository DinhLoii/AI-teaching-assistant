import test from 'node:test'
import assert from 'node:assert/strict'
import { frontendRuntimePlan } from '../src/modules/grading/engine/application/sandbox/frontend-runtime.js'
import { getSubjectPolicy } from '../src/modules/grading/engine/core/domain/rubric/SubjectProjectTypes.js'
import { scoreBrowserWorkflows } from '../src/modules/grading/engine/application/evaluator/browser-workflow-score.js'
import { RubricEvaluator } from '../src/modules/grading/engine/application/evaluator/RubricEvaluator.js'
import { probePublishedApp } from '../src/modules/grading/engine/application/sandbox/published-app-probe.js'
import { ExecutionSandboxService } from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.js'
import { dockerSocketOptions } from '../src/modules/grading/engine/application/sandbox/docker-client.js'
import { parseAiJson } from '../src/modules/grading/engine/infrastructure/ai/parse-ai-json.js'

test('Docker Desktop Linux context resolves the actual Windows named pipe', () => {
  assert.deepEqual(dockerSocketOptions('npipe:////./pipe/dockerDesktopLinuxEngine'), { socketPath: '//./pipe/dockerDesktopLinuxEngine' })
  assert.deepEqual(dockerSocketOptions('unix:///var/run/docker.sock'), { socketPath: '/var/run/docker.sock' })
  assert.equal(dockerSocketOptions('tcp://localhost:2375'), undefined)
})

test('AI JSON repairs only formatting, preserves strings and rejects missing values', () => {
  assert.deepEqual(parseAiJson('```json\n{\n"score": 0.5, // note\n"reason": "a,} URL https://site.test",\n}\n```'), { score: .5, reason: 'a,} URL https://site.test' })
  assert.deepEqual(parseAiJson('{"lines":"a\nb", /* note */ "ids":[1,2,],}'), { lines: 'a\nb', ids: [1, 2] })
  assert.throws(() => parseAiJson('{"score":}'), SyntaxError)
  assert.throws(() => parseAiJson('{"score":0.5'), SyntaxError)
})

test('failed generated browser tests control functional rubric points instead of code-only guesses', async () => {
  const evaluator = new RubricEvaluator({} as any, {} as any) as any
  const result = await evaluator.evaluateRuleAsync({ id: 'register', weight: 2, scoringStrategy: 'AICodeReview' }, { evidencePool: [
    { type: 'browser.workflow.planned', source: 'AuthRequirementTemplate', payload: { testId: 'auth-register', ruleIds: ['register'] } },
    { type: 'browser.workflow.completed', payload: { testId: 'auth-register', success: false } },
  ] })
  assert.equal(result.score, 0)
  assert.equal(result.passed, false)
})

test('React readiness rejects 404, empty responses and JSON instead of displaying a broken UI', async () => {
  const response = (text: string, status = 200) => (async () => new Response(text, { status })) as typeof fetch
  assert.equal(await probePublishedApp('http://localhost/', true, 100, response('not found', 404)), false)
  assert.equal(await probePublishedApp('http://localhost/', true, 100, response('')), false)
  assert.equal(await probePublishedApp('http://localhost/', true, 100, response('{"ok":true}')), false)
  assert.equal(await probePublishedApp('http://localhost/', true, 100, response('<!doctype html><html><body><div id="root"></div></body></html>')), true)
  assert.equal(await probePublishedApp('http://localhost/', false, 100, response('not found', 404)), true)
  let bounded = false
  assert.equal(await probePublishedApp('http://localhost/', true, 100, (async (_url, options) => { bounded = options?.signal instanceof AbortSignal; throw new Error('connection reset') }) as typeof fetch), false)
  assert.equal(bounded, true)
})

test('readiness checks the published URL Chromium uses rather than an internal Docker address', async () => {
  const original = globalThis.fetch, urls: string[] = []
  globalThis.fetch = (async url => { urls.push(String(url)); return new Response('<html><body>React</body></html>') }) as typeof fetch
  try {
    await (new ExecutionSandboxService() as any).waitUntilReady({ inspect: async () => ({ State: { Running: true }, NetworkSettings: { IPAddress: '172.17.0.2' } }) }, 'http://localhost:12345', 100, [], true)
    assert.deepEqual(urls, ['http://localhost:12345'])
  } finally { globalThis.fetch = original }
})

test('FER202 accepts only frontend submissions', () => {
  assert.deepEqual(getSubjectPolicy('FER202-SE01'), { allowed: ['frontend'], fallback: 'frontend' })
})

test('React Vite runs nested ESM submissions on the actual published port', () => {
  const plan = frontendRuntimePlan({ type: 'module', scripts: { dev: 'vite' }, dependencies: { react: '19' }, devDependencies: { vite: '6' } }, '/app/React Student')!
  assert.equal(plan.image, 'node:20-alpine')
  assert.match(plan.command, /cd '\/sandbox\/React Student'/)
  assert.match(plan.command, /npm ci --include=dev/)
  assert.match(plan.command, /--host 0\.0\.0\.0 --port 8080 --strictPort/)
  assert.doesNotMatch(plan.command, /autoport\.js|NODE_OPTIONS|node index\.js/)
})

test('CRA uses its standard start script and browser is disabled', () => {
  const plan = frontendRuntimePlan({ scripts: { start: 'react-scripts start' }, dependencies: { react: '18', 'react-scripts': '5' } }, '/app')!
  assert.match(plan.command, /BROWSER=none/)
  assert.match(plan.command, /exec npm run start$/)
  assert.doesNotMatch(plan.command, /--strictPort/)
})

test('unrelated Node and backend projects keep their existing runner', () => {
  assert.equal(frontendRuntimePlan({ scripts: { start: 'node index.js' }, dependencies: { express: '4' } }, '/app'), null)
})

test('frontend scores use linked workflows and preserve failed and missing evidence', () => {
  const evidence = (testId: string, success: boolean) => ({ type: 'browser.workflow.completed', payload: { testId, success } })
  const partial = scoreBrowserWorkflows(['add', 'delete'], [evidence('add', true), evidence('delete', false), evidence('unrelated', true)], 2)
  assert.equal(partial.score, 1)
  assert.equal(partial.passed, false)
  assert.equal(partial.needsReview, false)
  assert.equal(scoreBrowserWorkflows(['missing'], [], 2).needsReview, true)
  assert.equal(scoreBrowserWorkflows(['add'], [evidence('add', true), evidence('add', false)], 2).score, 0)
})

test('FER202 UI cannot fall back to code-only grading without a runtime screenshot', async () => {
  const evaluator = new RubricEvaluator({} as any, {} as any) as any
  const result = await evaluator.evaluateRuleAsync({ id: 'ui', title: 'UI', description: 'React UI', weight: 2, scoringStrategy: 'AIVision', requiredEvidence: [] }, { subjectCode: 'FER202', evidencePool: [], sourceSnapshot: { projectType: 'frontend', files: [] } }, {})
  assert.equal(result.needsReview, true)
  assert.equal(result.score, 0)
})
