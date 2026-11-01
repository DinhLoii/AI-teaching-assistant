import assert from 'node:assert/strict';
import test from 'node:test';
import { consoleFunctionalScore } from '../src/modules/grading/engine/application/evaluator/console-functional-score.js';
const rule = {category: 'Functional', weight: 3, scoringStrategy: 'AICodeReview'};
const result = (passedCases: number) => ({status: 'completed', totalCases: 10, passedCases, compilationPassed: true});
test('zero passing tests cannot earn functional points from AI review', () => {
 assert.equal(consoleFunctionalScore(rule, result(0))?.score, 0);
 assert.equal(consoleFunctionalScore(rule, result(0))?.passed, false);
});
test('execution awards proportional points within the existing budget', () => {
 assert.equal(consoleFunctionalScore(rule, result(5))?.score, 1.5);
 assert.equal(consoleFunctionalScore(rule, result(10))?.score, 3);
});
test('quality criteria remain separate from functional tests', () => {
 for (const category of ['CodeQuality', 'Architecture', 'Security']) assert.equal(consoleFunctionalScore({...rule, category}, result(0)), null);
});
test('blocked or invalid execution requires review', () => {
 for (const verification of [{status: 'blocked'}, {status: 'missing_tests'}, result(11), {...result(0), totalCases: 0}]) assert.equal(consoleFunctionalScore(rule, verification)?.needsReview, true);
});
test('criterion probes retain their own test scoring', () => {
 assert.equal(consoleFunctionalScore({...rule, scoringStrategy: 'StdInOutProbe'}, result(0)), null);
});
