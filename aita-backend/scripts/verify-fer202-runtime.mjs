import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import { chromium } from 'playwright'
import { ExecutionSandboxService } from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts'
import { PlaywrightExecutor } from '../src/modules/grading/engine/application/execution/PlaywrightExecutor.ts'
import { BrowserTestRunner } from '../src/modules/grading/engine/plugins/playwright/BrowserTestRunner.ts'
import { RubricEvaluator } from '../src/modules/grading/engine/application/evaluator/RubricEvaluator.ts'
import { browserPresentationContext } from '../src/modules/grading/engine/application/execution/browser-presentation.ts'

const root = path.resolve('../tmp/fer202-' + Date.now())
const source = path.join(root, 'React Student')
const artifactsDir = path.join(root, 'artifacts')
await fs.mkdir(path.join(source, 'src'), { recursive: true })
await fs.mkdir(artifactsDir, { recursive: true })
const pkg = { name: 'fer202-runtime-check', version: '1.0.0', type: 'module', scripts: { dev: 'vite' }, dependencies: { react: '19.2.8', 'react-dom': '19.2.8' }, devDependencies: { vite: '6.4.5' } }
await fs.writeFile(path.join(source, 'package.json'), JSON.stringify(pkg, null, 2))
await fs.writeFile(path.join(source, 'index.html'), '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>FER202 Runtime</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>')
const appSource = `import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
function App(){
 const [tasks,setTasks]=useState(()=>JSON.parse(localStorage.getItem('fer-tasks')||'[]'));
 const [title,setTitle]=useState(''),[error,setError]=useState(''),[route,setRoute]=useState(location.hash);
 useEffect(()=>{localStorage.setItem('fer-tasks',JSON.stringify(tasks));},[tasks]);
 useEffect(()=>{const changed=()=>setRoute(location.hash);addEventListener('hashchange',changed);return()=>removeEventListener('hashchange',changed);},[]);
 function add(e){e.preventDefault();if(!title.trim()){setError('Required title');return;}setTasks([...tasks,{id:Date.now(),title:title.trim(),done:false}]);setTitle('');setError('');}
 return <main><h1>FER202 React Task Manager</h1><nav><a href="#">Tasks</a> <a href="#about">About</a></nav>{route==='#about'?<section data-testid="about">React components, state, forms and localStorage</section>:<><form onSubmit={add}><label htmlFor="title">Task title</label><input id="title" data-testid="task-title" value={title} onChange={e=>setTitle(e.target.value)}/><button data-testid="add">Add task</button></form>{error&&<p role="alert">{error}</p>}{!tasks.length&&<p data-testid="empty">No tasks yet</p>}<ul>{tasks.map(task=><li key={task.id} data-testid="task-item" data-completed={String(task.done)}><input aria-label="Complete task" type="checkbox" checked={task.done} onChange={()=>setTasks(tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t))}/><span>{task.title}</span><button data-testid="delete" onClick={()=>setTasks(tasks.filter(t=>t.id!==task.id))}>Delete</button></li>)}</ul></>}</main>;
}
createRoot(document.getElementById('root')).render(<App/>);`
await fs.writeFile(path.join(source, 'src/main.jsx'), appSource)
await fs.writeFile(path.join(source, 'src/style.css'), '*{box-sizing:border-box}body{margin:0;background:#f4f7fb;font:16px Arial;color:#17324d}main{max-width:800px;margin:40px auto;padding:24px;background:white;border-radius:16px}nav{display:flex;gap:20px;margin-bottom:24px}form{display:flex;flex-wrap:wrap;gap:12px;align-items:center}input{max-width:100%;padding:10px}button{padding:10px;background:#e96820;color:white;border:0;border-radius:6px}li{display:flex;gap:12px;align-items:center;margin-top:16px}li span{flex:1;overflow-wrap:anywhere}li[data-completed=true] span{text-decoration:line-through}[role=alert]{color:#b00020}@media(max-width:600px){main{margin:12px;padding:16px}h1{font-size:24px}form>input{width:100%}}')

const zip = new AdmZip(); zip.addLocalFolder(source, 'React Student')
const output = path.resolve('../output/FER202_Readiness')
await fs.mkdir(output, { recursive: true })
zip.writeZip(path.join(output, 'React_sample.zip'))
const extracted = path.join(root, 'extracted')
new AdmZip(path.join(output, 'React_sample.zip')).extractAllTo(extracted, true)
const artifacts = new Map()
const artifactStore = {
  async storeArtifactAsync(submissionId, type, buffer, filename) {
    const id = 'artifact-' + artifacts.size
    artifacts.set(id, buffer)
    const filenameOnDisk = path.join(artifactsDir, `${id}-${path.basename(filename)}`)
    await fs.writeFile(filenameOnDisk, buffer)
    return { id, submissionId, type, uri: filenameOnDisk, createdAt: new Date().toISOString() }
  },
  async getArtifactAsync(id) { return artifacts.get(id) },
}
const tests = [
  { id: 'load', name: 'React renders', startUrl: '/', steps: [{ action: 'assertVisible', target: 'h1' }, { action: 'assertVisible', target: '[data-testid=empty]' }] },
  { id: 'validate', name: 'Form validation', startUrl: '/', steps: [{ action: 'click', target: '[data-testid=add]' }, { action: 'assertVisible', target: '[role=alert]' }] },
  { id: 'add', name: 'Input and add task', startUrl: '/', steps: [{ action: 'fill', target: '[data-testid=task-title]', value: 'Learn React' }, { action: 'click', target: '[data-testid=add]' }, { action: 'assertVisible', target: '[data-testid=task-item]:has-text("Learn React")' }] },
  { id: 'toggle', name: 'Checkbox changes state', startUrl: '/', steps: [{ action: 'click', target: 'input[type=checkbox]' }, { action: 'assertVisible', target: '[data-completed=true]' }] },
  { id: 'persist', name: 'Reload preserves localStorage', startUrl: '/', steps: [{ action: 'assertVisible', target: '[data-completed=true]:has-text("Learn React")' }] },
  { id: 'route', name: 'Frontend navigation', startUrl: '/', steps: [{ action: 'click', target: 'a[href="#about"]' }, { action: 'assertVisible', target: '[data-testid=about]' }] },
  { id: 'delete', name: 'Delete task and screenshot', startUrl: '/', steps: [{ action: 'click', target: '[data-testid=delete]' }, { action: 'assertVisible', target: '[data-testid=empty]' }, { action: 'screenshot', screenshotName: 'react-desktop' }] },
]
const assignment = { id: 'fer-check', metadata: { title: 'FER202 Runtime', projectType: 'frontend' }, testSuites: { browser: tests } }
const service = new ExecutionSandboxService()
let handle
let browser
try {
  handle = await service.startAsync(extracted, 'frontend')
  assert.equal(handle.isReady, true, handle.crashLogs)
  const messages = []
  const watchBrowser = true // UI grading now always opens its native Chromium window.
  const evidence = await browserPresentationContext.run({ watchBrowser }, () => new PlaywrightExecutor(artifactStore).executeAsync('fer-check', extracted, assignment, handle.baseUrl, undefined, message => { messages.push(message); console.log(message) }))
  if (watchBrowser) assert.ok(messages.some(message => message.includes('Đã mở cửa sổ Chromium')))
  const workflows = evidence.filter(e => e.type === 'browser.workflow.completed')
  assert.equal(workflows.length, tests.length)
  assert.ok(workflows.every(e => e.payload.success === true), JSON.stringify(workflows))
  assert.ok(evidence.some(e => e.type === 'browser.screenshot.captured'))
  console.log('PASS 7 real React browser workflows through PlaywrightExecutor')
  const runner = new BrowserTestRunner('FER-negative-test', { submissionId: 'fer-check', baseUrl: handle.baseUrl, artifactsDir }, artifactStore)
  let negative
  try {
    await runner.initializeAsync()
    negative = await runner.executeTestAsync({ id: 'broken', name: 'Wrong expected UI must fail', startUrl: '/', steps: [{ action: 'assertVisible', target: '#element-does-not-exist' }] })
  } finally { await runner.teardownAsync() }
  assert.equal(negative.find(e => e.type === 'browser.workflow.completed').payload.success, false)
  const rule = { id: 'browser-rule', title: 'React functionality', description: 'Run configured workflows', category: 'UI', scoringStrategy: 'AIVision', weight: 10, requiredEvidence: [{ evidenceType: 'browser.workflow.completed', minimumConfidence: 1, browserProbe: { path: '/', testIds: tests.map(t => t.id) } }] }
  const rubric = { id: 'fer-rubric', title: 'FER202', totalWeight: 10, passThreshold: 0.5, rules: [rule] }
  const context = { sandbox: handle, evidencePool: evidence, sourceSnapshot: { projectType: 'frontend', files: [{ relativePath: 'src/main.jsx', content: appSource }] }, subjectCode: 'FER202', projectType: 'frontend' }
  const evaluator = new RubricEvaluator({ async generateOverallFeedbackAsync() { return 'Local deterministic browser verification; no external AI call.' } }, artifactStore)
  const report = await evaluator.evaluateAsync('fer-check', 'fer-assignment', 'local-check', rubric, context)
  assert.equal(report.totalScore, 10)
  const failedReport = await evaluator.evaluateAsync('fer-check', 'fer-assignment', 'local-check', { ...rubric, rules: [{ ...rule, requiredEvidence: [{ evidenceType: 'browser.workflow.completed', minimumConfidence: 1, browserProbe: { path: '/', testIds: ['broken'] } }] }] }, { ...context, evidencePool: negative })
  assert.equal(failedReport.totalScore, 0)
  console.log('PASS deterministic scoring: working UI 10/10; failed workflow 0/10')
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(handle.baseUrl)
  await page.locator('h1').waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await page.screenshot({ path: path.join(output, 'react-mobile.png'), fullPage: true })
  console.log('PASS mobile viewport 390px and screenshot')
  await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify({ checkedAt: new Date().toISOString(), runtime: 'node:20-alpine', framework: 'React 19 / Vite 6', visibleBrowserVerified: watchBrowser, browserWorkflowsPassed: workflows.length, screenshotCount: evidence.filter(e => e.type === 'browser.screenshot.captured').length, positiveScore: report.totalScore, negativeScore: failedReport.totalScore, mobileViewport: 390, artifactsDir, source: 'Exact nested ZIP started through ExecutionSandboxService; PlaywrightExecutor and RubricEvaluator; no external AI request' }, null, 2))
} finally {
  if (browser) await browser.close()
  if (handle) await service.stopAsync(handle)
}
