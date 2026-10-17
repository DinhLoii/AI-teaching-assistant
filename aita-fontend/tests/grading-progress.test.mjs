import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'

test('grading SSE keeps JWT in headers, decodes split Vietnamese frames and completes once', async () => {
  let writer, requested, completed = 0
  const messages = [], errors = []
  const stream = new ReadableStream({ start(controller) { writer = controller } })
  const storage = { getItem: () => 'fixture-access-token' }
  const load = createLoader({ TextDecoder, AbortController, localStorage: storage, sessionStorage: storage, window: {}, fetch: async (url, options) => { requested = { url, options }; return { ok: true, body: stream } } })
  const { subscribeProgressStream } = load('lib/websocket/progress-stream.ts')
  const stop = subscribeProgressStream('/api/grading/submissions/id/stream', job => messages.push(job), () => completed++, error => errors.push(error))
  const bytes = new TextEncoder().encode('data: {"state":"processing","currentTask":"Đang chấm"}\r\n\r\ndata: {"state":"completed"}\r\n\r\n')
  for (const byte of bytes) writer.enqueue(new Uint8Array([byte]))
  await new Promise(resolve => setTimeout(resolve, 20))
  stop()
  assert.equal(requested.url.includes('token='), false)
  assert.equal(requested.options.headers.Authorization, 'Bearer fixture-access-token')
  assert.equal(messages[0].currentTask, 'Đang chấm')
  assert.equal(completed, 1)
  assert.equal(errors.length, 0)
})
