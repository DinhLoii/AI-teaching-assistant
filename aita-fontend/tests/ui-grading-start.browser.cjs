const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { build } = require('../../aita-backend/node_modules/esbuild')
const { chromium } = require('../../aita-backend/node_modules/playwright')
const root = path.resolve(__dirname, '..')

test('lecturer UI grading starts only on click, awaits acceptance and prevents duplicate starts', async () => {
  const bundle = await build({ absWorkingDir: root, bundle: true, write: false, platform: 'browser', format: 'iife', alias: { '@': path.join(root, 'src') }, define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'fixture', setup(builder) {
      builder.onResolve({ filter: /^(next\/navigation|next\/link|@\/providers\/language-provider|@\/lib\/api\/modules\/(grading|submissions))$|load-workspace$|LiveGradingRunnerModal$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: p }) => {
        let contents
        if (p === 'next/navigation') contents = 'export const useParams=()=>({id:"exam"}); export const useRouter=()=>({push(){},refresh(){}})'
        else if (p === 'next/link') contents = 'import React from "react"; export default function Link({children,...props}){return <a {...props}>{children}</a>}'
        else if (p.includes('language-provider')) contents = 'export const useLanguage=()=>({t:(key,fallback)=>fallback||key})'
        else if (p.endsWith('load-workspace')) contents = 'export async function loadSubmissionWorkspace(id,c){c.assignment({id,title:"REACT",subjectCode:"FER202",maxScore:10}); c.roster([]); c.submissions([window.fixtureSubmission]);c.submissionsSettled()}'
        else if (p.endsWith('LiveGradingRunnerModal')) contents = 'import React from "react"; export function LiveGradingRunnerModal(p){return <div role="dialog" data-submission={p.submissionId}>Live run</div>}'
        else if (p.endsWith('/grading')) contents = 'export const gradingApi={gradeExistingSubmission:id=>{window.starts.push(id);return new Promise((resolve,reject)=>{window.acceptStart=resolve;window.rejectStart=reject})}}'
        else contents = 'export const submissionsApi={getSubmissions:async()=>[window.fixtureSubmission]}'
        return { contents, loader: 'jsx', resolveDir: root }
      })
    }}], stdin: { resolveDir: root, loader: 'tsx', contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Page from './src/features/submissions/screens/LecturerSubmissionsPage'; window.starts=[];window.fixtureSubmission={id:'new-attempt',studentId:'student',student:'Test Student',score:null,gradingStatus:'Pending',filename:'folder.zip'};createRoot(document.getElementById('root')).render(<Page/>);` } })
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('http://fixture.test/', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
    await page.goto('http://fixture.test/')
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    const button = page.getByRole('button', { name: '▶ Bắt đầu chấm UI & Logs', exact: true })
    await button.waitFor()
    assert.deepEqual(await page.evaluate(() => window.starts), [])
    await button.evaluate(button => { button.click(); button.click() })
    assert.deepEqual(await page.evaluate(() => window.starts), ['new-attempt'])
    assert.equal(await page.getByRole('dialog').count(), 0)
    await page.evaluate(() => window.acceptStart({ submissionId: 'new-attempt' }))
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.getByRole('dialog').getAttribute('data-submission'), 'new-attempt')
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})
