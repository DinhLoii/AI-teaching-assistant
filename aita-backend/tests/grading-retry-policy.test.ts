import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldRetryGradingFailure } from '../src/modules/grading/engine/application/queue/durable-grading-queue.js'
test('ambiguous frontend source never retries even when wrapped by runtime unavailable', () => {
 assert.equal(shouldRetryGradingFailure('UI_RUNTIME_UNAVAILABLE: Sandbox could not be started: UI_PROJECT_ROOT_AMBIGUOUS: multiple packages',1),false)
 assert.equal(shouldRetryGradingFailure('SANDBOX_DISABLED: unavailable',1),false)
})
test('temporary provider and connection errors retry within the attempt budget', () => {
 assert.equal(shouldRetryGradingFailure('Provider unavailable 503',1),true)
 assert.equal(shouldRetryGradingFailure('fetch failed ECONNRESET',2),true)
 assert.equal(shouldRetryGradingFailure('Provider unavailable 503',3),false)
})

test('Vietnamese AI outage retains its code and enters the durable retry queue', async () => {
 const { DurableGradingQueue } = await import('../src/modules/grading/engine/application/queue/durable-grading-queue.js')
 const { globalJobManager } = await import('../src/modules/grading/engine/application/queue/SubmissionJobManager.js')
 let values: any[] = []
 const db: any = {
   $queryRaw: async () => [{ Status: 'running' }],
   $executeRaw: async (_sql: any, ...parameters: any[]) => { values = parameters; return 1 },
   submission: { updateMany: async () => ({ count: 1 }) },
 }
 const queue = new DurableGradingQueue(db) as any
 try {
   await queue.run({ SubmissionId: 'ai-outage-test', Lane: 'batch', Attempts: 1, LeaseOwner: 'test', RequestedAt: new Date(), LeaseUntil: new Date(Date.now()+120000) }, async () => {
     throw Object.assign(new Error('Dịch vụ AI chưa trả được kết quả.'), { code: 'AI_UNAVAILABLE', statusCode: 503 })
   })
   assert.equal(values[0], 'pending')
   assert.match(values[1], /^AI_UNAVAILABLE:/)
   assert.match(globalJobManager.getJob('ai-outage-test')!.logs!.at(-1)!.message, /AI_UNAVAILABLE/)
 } finally { globalJobManager.clearJob('ai-outage-test') }
})
