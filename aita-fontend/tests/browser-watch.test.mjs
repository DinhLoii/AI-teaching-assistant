import assert from 'node:assert/strict'
import test from 'node:test'
import { createLoader } from './helpers/load-typescript.mjs'

test('single and batch grading requests default to automatically opening Chromium', async () => {
  const requests = []
  const storage = { getItem: () => null }
  const { gradingApi } = createLoader({ localStorage: storage, sessionStorage: storage, window: {}, fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, status: 200, json: async () => ({ data: {} }) } } })('lib/api/modules/grading.ts')
  await gradingApi.gradeExistingSubmission('s', { watchBrowser: true })
  await gradingApi.gradeExistingSubmission('s')
  await gradingApi.gradeSelectedBatch('a', ['s'], { watchBrowser: true })
  await gradingApi.gradeExistingBatch('a', { watchBrowser: true })
  assert.equal(JSON.parse(requests[0].options.body).watchBrowser, true)
  assert.equal(JSON.parse(requests[1].options.body).watchBrowser, true)
  assert.equal(JSON.parse(requests[2].options.body).watchBrowser, true)
  assert.equal(JSON.parse(requests[3].options.body).watchBrowser, true)
  await gradingApi.submitProject(new Blob(['zip']), 'a', { watchBrowser: true })
  await gradingApi.submitBatchProject([new Blob(['zip'])], 'a')
  assert.equal(requests[4].options.body.get('watchBrowser'), 'true')
  assert.equal(requests[5].options.body.get('watchBrowser'), 'true')
})
