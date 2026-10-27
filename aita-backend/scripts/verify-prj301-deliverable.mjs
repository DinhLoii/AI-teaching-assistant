import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import AdmZip from 'adm-zip'
import { ExecutionSandboxService } from '../src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts'
import { HTTPProbeEngine } from '../src/modules/grading/engine/application/evaluator/HTTPProbeEngine.ts'

const base = path.resolve('../output/PRJ301_Docker')
const zipPath = path.join(base, 'PRJ301_folder.zip')
const zip = new AdmZip()
zip.addLocalFolder(path.join(base, 'folder_submit'), 'folder_submit')
zip.writeZip(zipPath)
const extract = path.resolve('../tmp/prj301-verify-' + Date.now())
await fs.mkdir(extract, { recursive: true })
new AdmZip(zipPath).extractAllTo(extract)
const service = new ExecutionSandboxService()
let handle
const checks = []
const pass = name => { checks.push(name); console.log('PASS ' + name) }
try {
  handle = await service.startAsync(extract, 'backend')
  assert.equal(handle.isReady, true, handle.crashLogs)
  console.log('BASE_URL ' + handle.baseUrl)
  async function api(method, url, status, body) {
    const response = await fetch(handle.baseUrl + url, { method, headers: { 'Content-Type': 'application/json; charset=UTF-8' }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) })
    assert.equal(response.status, status, method + ' ' + url)
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }
  assert.equal((await api('GET', '/health', 200)).status, 'UP'); pass('Health / Tomcat startup')
  let list = await api('GET', '/api/products', 200)
  assert.equal(list.total, 2); assert.deepEqual(list.items.map(p => p.id), [1, 2]); pass('Seed and ordered list')
  assert.equal((await api('GET', '/api/products?q=NOTE', 200)).items[0].name, 'Notebook'); pass('Case insensitive search')
  assert.equal((await api('GET', '/api/products?q=missing', 200)).total, 0); pass('Empty search')
  assert.equal((await api('GET', '/api/products/999', 404)).error, 'NOT_FOUND'); pass('Missing product 404')
  let product = await api('POST', '/api/products', 201, { id: 101, name: 'Sổ tay', quantity: 3, price: 12.5 })
  assert.equal(product.name, 'Sổ tay'); pass('Create / JSON / UTF-8')
  assert.equal((await api('POST', '/api/products', 409, { id: 101, name: 'Other', quantity: 5, price: 2 })).error, 'DUPLICATE_ID')
  assert.equal((await api('GET', '/api/products/101', 200)).name, 'Sổ tay'); pass('Duplicate ID does not overwrite')
  await api('POST', '/api/products', 400, { id: 102, name: ' ', quantity: 1, price: 1 }); pass('Blank name 400')
  await api('POST', '/api/products', 400, { id: 102, name: 'Invalid', quantity: -1, price: 1 }); pass('Negative quantity 400')
  await api('POST', '/api/products', 400, { id: 102, name: 'Invalid', quantity: 1, price: -1 }); pass('Negative price 400')
  await api('POST', '/api/products', 400, '{broken'); pass('Malformed JSON 400')
  await api('POST', '/api/products', 400, { id: 102, name: 'Invalid', quantity: 1.5, price: 1 }); pass('Fractional quantity rejected')
  product = await api('PUT', '/api/products/101', 200, { name: 'Updated', quantity: 0, price: 0 })
  assert.equal(product.quantity, 0); assert.equal(product.price, 0); pass('Update / zero boundaries')
  await api('PUT', '/api/products/999', 404, { name: 'Missing', quantity: 1, price: 1 }); pass('Update missing ID 404')
  await api('GET', '/api/products/not-a-number', 400); pass('Invalid path ID 400')
  await api('DELETE', '/api/products/101', 204)
  await api('GET', '/api/products/101', 404); pass('Delete / persistence across requests')
  await api('DELETE', '/api/products/101', 404); pass('Delete missing ID 404')
  await api('POST', '/api/products', 201, { id: 150, name: '<script>alert(1)</script>', quantity: 1, price: 1 })
  const page = await fetch(handle.baseUrl + '/products?q=%3Cscript%3E')
  assert.equal(page.status, 200)
  const html = await page.text()
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
  assert.ok(!html.includes('<script>alert(1)</script>')); pass('JSP / MVC / escaped HTML')
  await api('DELETE', '/api/products/150', 204)
  const root = await fetch(handle.baseUrl + '/')
  assert.equal(root.status, 200); assert.ok((await root.text()).includes('Product Manager')); pass('Root route and welcome JSP')
  const probe = await new HTTPProbeEngine().evaluateAsync(handle.baseUrl, { steps: [
    { stepId: 'health', method: 'GET', pathTemplate: '/health', expectedStatus: 200, assertions: [{ jsonPath: '$.status', assertType: 'equals', value: 'UP' }] },
    { stepId: 'create', method: 'POST', pathTemplate: '/api/products', expectedStatus: 201, body: { id: 301, name: 'Probe', quantity: 2, price: 9 }, assertions: [{ jsonPath: '$.name', assertType: 'equals', value: 'Probe' }] },
    { stepId: 'read', method: 'GET', pathTemplate: '/api/products/301', expectedStatus: 200, assertions: [{ jsonPath: '$.quantity', assertType: 'equals', value: 2 }] },
    { stepId: 'delete', method: 'DELETE', pathTemplate: '/api/products/301', expectedStatus: 204, assertions: [] },
  ] })
  assert.equal(probe.passed, true, JSON.stringify(probe)); pass('Platform HTTPProbeEngine integration')
  await fs.writeFile(path.join(base, 'docker-verification.json'), JSON.stringify({ checkedAt: new Date().toISOString(), source: 'Exact ZIP extracted and started by ExecutionSandboxService', runtime: 'aita-java-war:tomcat-9.0-jdk21', checksPassed: checks.length, checks, httpProbePassed: probe.passed }, null, 2))
  console.log('VERIFIED ' + checks.length + ' checks')
} finally {
  if (handle) await service.stopAsync(handle)
  console.log('Test container cleanup requested')
}
