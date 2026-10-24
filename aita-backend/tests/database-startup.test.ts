import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForDatabase } from '../src/database/startup.js'

test('database startup continues immediately when connected', async () => {
  let connected = false
  await waitForDatabase(async () => { connected = true }, () => assert.fail('Unexpected retry'))
  assert.equal(connected, true)
})

test('database startup retries transient failures and recovers', async () => {
  let attempts = 0
  const waits: number[] = []
  const warnings: string[] = []
  await waitForDatabase(async () => {
    if (++attempts < 3) throw { errorCode: 'P1001' }
  }, message => warnings.push(message), async ms => { waits.push(ms) })
  assert.equal(attempts, 3)
  assert.deepEqual(waits, [2000, 4000])
  assert.equal(warnings.length, 2)
})

test('database startup stops after five connection failures', async () => {
  let attempts = 0
  const failure = { code: 'P1002' }
  const waits: number[] = []
  await assert.rejects(waitForDatabase(async () => {
    attempts++
    throw failure
  }, () => {}, async ms => { waits.push(ms) }), error => error === failure)
  assert.equal(attempts, 5)
  assert.deepEqual(waits, [2000, 4000, 6000, 8000])
})

test('database startup fails immediately for invalid credentials or configuration', async () => {
  for (const failure of [{ errorCode: 'P1000' }, new Error('Invalid URL')]) {
    await assert.rejects(waitForDatabase(async () => { throw failure }, () => assert.fail('Unexpected retry')), error => error === failure)
  }
})
