import assert from 'node:assert/strict'
import test from 'node:test'
import {hasExecutableCriterionTests} from '../src/modules/grading/engine/application/evaluator/console-verification.js'
test('no rules and code quality rules never imply that console tests will run elsewhere',()=>{
 assert.equal(hasExecutableCriterionTests([]),false)
 assert.equal(hasExecutableCriterionTests([{category:'CodeQuality',scoringStrategy:'AICodeReview'}]),false)
 assert.equal(hasExecutableCriterionTests([{category:'Algorithm',scoringStrategy:'StdInOutProbe',requiredEvidence:[]}]),false)
})
test('skip separate runner only when every criterion has actual executable probes',()=>{
 const probe={scoringStrategy:'StdInOutProbe',requiredEvidence:[{stdInOutProbe:{testCases:[{id:'test'}]}}]}
 assert.equal(hasExecutableCriterionTests([probe]),true)
 assert.equal(hasExecutableCriterionTests([probe,{scoringStrategy:'AICodeReview'}]),false)
})
