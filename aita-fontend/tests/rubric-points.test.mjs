import assert from 'node:assert/strict'
import test from 'node:test'
import { createLoader } from './helpers/load-typescript.mjs'

const { distributeRubricPoints } = createLoader()('utils/rubricPoints.ts')
test('equal rubric allocation preserves source details and totals ten after rounding', () => {
  for (const count of [3, 9, 24]) {
    const criteria = Array.from({ length: count }, (_, id) => ({ id, maxPoints: 2, evidence: `Source ${id}` }))
    const allocated = distributeRubricPoints(criteria, 10)
    const cents = allocated.map(row => Math.round(row.maxPoints * 100))
    assert.equal(cents.reduce((sum, value) => sum + value, 0), 1000)
    assert.ok(Math.max(...cents) - Math.min(...cents) <= 1)
    allocated.forEach((row, index) => assert.equal(row.evidence, criteria[index].evidence))
    assert.ok(criteria.every(row => row.maxPoints === 2), 'Source array remains unchanged')
  }
})

test('empty rubric stays empty', () => assert.equal(distributeRubricPoints([], 10).length, 0))
