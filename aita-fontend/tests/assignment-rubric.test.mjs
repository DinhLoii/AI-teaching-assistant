import test from 'node:test'
import assert from 'node:assert/strict'
import { createLoader } from './helpers/load-typescript.mjs'

const { assignmentRubricRules, assignmentMaxScore } = createLoader()('features/assignments/rubric-content.ts')

test('empty grading rules and aiRubrics do not mask the relational lecturer rubric', () => {
  const summary = { aiRubrics: [], rubrics: [{ title: 'CRUD', maxPoints: 3 }] }
  const grading = { rubric: { rules: [] } }
  assert.equal(assignmentRubricRules(summary, grading)[0].title, 'CRUD')
  assert.equal(assignmentMaxScore(summary, grading), 3)
})

test('published grading rubric takes priority and score scale follows the assignment', () => {
  const grading = { rubric: { rules: [{ title: 'Room', weight: 5, passCondition: 'Offline data persists' }] } }
  const summary = { maxScore: '20', rubrics: [{ title: 'Old', maxPoints: 10 }] }
  assert.equal(assignmentRubricRules(summary, grading)[0].passCondition, 'Offline data persists')
  assert.equal(assignmentMaxScore(summary, grading), 20)
  assert.equal(assignmentRubricRules({}, {}).length, 0)
})
