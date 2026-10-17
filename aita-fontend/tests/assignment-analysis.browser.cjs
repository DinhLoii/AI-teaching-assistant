const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { build } = require('../../aita-backend/node_modules/esbuild')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const root = path.resolve(__dirname, '..')
;(async () => {
  const bundle = await build({ absWorkingDir: root, bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' }, alias: { '@': path.join(root, 'src') },
    plugins: [{ name: 'isolated-api', setup(builder) {
      builder.onResolve({ filter: /^@\/(providers\/language-provider|lib\/api\/modules\/(ai|assignments))$/ }, args => ({ path: args.path, namespace: 'stub' }))
      builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({ contents: path.includes('language-provider') ? 'export const useLanguage = () => ({ t: key => key })' : path.endsWith('/ai') ? 'export const aiApi = { autoConfigureAssignment: data => new Promise(resolve => window.requests.push({ data, resolve })) }' : 'export const assignmentsApi = { createAssignment: async payload => window.saved.push(payload instanceof FormData ? { ...JSON.parse(payload.get("payload")), _uploadedName: payload.get("file").name, _uploadedText: await payload.get("file").text() } : payload) }' }))
    } }], stdin: { resolveDir: root, loader: 'tsx', contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {CreateAssignmentWizardModal} from './src/features/assignments/components/CreateAssignmentWizardModal'; window.requests=[];window.saved=[];window.alerts=[];window.alert=message=>window.alerts.push(message);createRoot(document.getElementById('root')).render(<CreateAssignmentWizardModal isOpen={true} onClose={()=>{}} onSuccess={()=>{}} classes={[{id:'class-1',classCode:'PRM392-Class',subject:{id:'subject-1'}}]}/>);` } })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  const analysis = {
    suggestedTitle: 'Personal Expense Tracker', description: fs.readFileSync(path.join(root, 'tests/fixtures/personal-expense-tracker.txt'), 'utf8'), detectedLanguage: 'Kotlin',
    runtimeConfig: { language: 'Kotlin', version: 'Android · Cần cấu hình môi trường kiểm thử', buildCommand: '', runCommand: '' },
    submissionFormat: { submissionType: 'project_archive', allowedFormats: ['.zip'], entryFile: '', directoryStructure: 'Android Studio project' },
    testCases: [], rubricCriteria: [3, 1.5, 1.5, 1, 1.5, 1.5].map((points, index) => ({ id: `r${index}`, name: `Android criterion ${index + 1}`, description: 'Actual source criterion', maxPoints: points, method: 'ai_assessment', evidence: 'Room Database', aiGuidance: 'Only original requirement' })),
    analysisReview: { profile: { platform: 'Android', mode: 'project' }, status: 'needs_teacher_review', warnings: ['Chưa có bộ kiểm thử tự động đã xác minh.'] },
    provenanceReport: { rubricSourceType: 'ORIGINAL_DOCUMENT', documentHash: 'actual-doc-hash' },
    requirementGroups: { required: [{ text: 'CRUD giao dịch' }], advanced: [{ text: 'Ngân sách tháng' }], excluded: [{ text: 'Đăng nhập, cloud backend, Firebase' }] },
    acceptanceTests: [{ id: 'TC01', steps: 'Thêm thu 5.000.000', expectedResult: 'Tổng thu tăng đúng', level: 'required' }],
  }
  try {
    const cssDir = path.join(root, '.next/static')
    const findCss = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? findCss(path.join(dir, entry.name)) : entry.name.endsWith('.css') ? [path.join(dir, entry.name)] : [])
    const css = findCss(cssDir).map(file => fs.readFileSync(file, 'utf8')).join('\n')
    await page.setContent(`<style>${css}</style><div id="root"></div>`)
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.locator('select:has(option[value="class-1"])').selectOption('class-1')
    const upload = name => page.locator('input[type=file]').setInputFiles({ name, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('isolated fixture') })
    await upload('android.docx')
    await page.waitForFunction(() => window.requests.length === 1)
    await page.evaluate(data => window.requests[0].resolve(data), analysis)
    await page.waitForFunction(() => document.querySelector('select:has(option[value="Kotlin"])')?.value === 'Kotlin')
    await page.getByText('Bước 2: Barem điểm (Rubric) & Test Cases', { exact: true }).click()
    await page.getByText('Rubric: 10/10 điểm', { exact: true }).waitFor()
    await page.getByText('Xuất bản & Giao bài ngay', { exact: true }).click()
    assert.equal(await page.evaluate(() => window.saved.length), 0)
    await page.getByRole('checkbox', { name: /Tôi đã đối chiếu/ }).check()
    await page.getByText('Xuất bản & Giao bài ngay', { exact: true }).click()
    await page.waitForFunction(() => window.saved.length === 1)
    const saved = await page.evaluate(() => window.saved[0])
    assert.equal(saved._uploadedName, 'android.docx'); assert.equal(saved._uploadedText, 'isolated fixture');
    assert.equal(saved.runtimeConfig.language, 'Kotlin'); assert.equal(saved.runtimeConfig.buildCommand, '')
    assert.equal(saved.testCases.length, 0); assert.equal(saved.rubricCriteria.length, 6)
    assert.equal(saved.aiConfig.analysisReview.acknowledged, true)
    assert.equal(saved.submissionFormat.entryFile, '')
    // Stale response from an older file must not replace a newer analysis.
    await page.getByText('Bước 1: Đề bài & Thông tin chung', { exact: true }).click()
    await upload('old-sql.docx'); await upload('new-android.docx')
    await page.waitForFunction(() => window.requests.length === 3)
    await page.evaluate(data => window.requests[2].resolve({ ...data, rubricCriteria: [] }), analysis)
    await page.evaluate(() => window.requests[1].resolve({ detectedLanguage: 'SQL', rubricCriteria: [{ name: 'stale SQL', maxPoints: 10 }], testCases: [] }))
    await page.waitForFunction(() => document.querySelector('select:has(option[value="Kotlin"])')?.value === 'Kotlin')
    await page.getByText('Bước 2: Barem điểm (Rubric) & Test Cases', { exact: true }).click()
    await page.getByText('Rubric: 0/10 điểm', { exact: true }).waitFor()
    assert.equal(await page.locator('input[value="stale SQL"]').count(), 0)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'tests/assignment-analysis-mobile.png', fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
    assert.deepEqual(errors, [])
    console.log('PASS: correct runtime, no preset/test injection, review gate, payload provenance, stale-file response and mobile layout')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
