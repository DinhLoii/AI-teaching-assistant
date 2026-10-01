/**
 * Unit tests for the publish-time answer key guard.
 *
 * The behaviour being locked down: a SQL-graded rule with no answer key scores every student 0,
 * so publishing must be refused - while rules graded any other way stay publishable as before.
 */

import { describe, test, expect } from '@jest/globals'
import { findSqlRulesMissingAnswerKey, isSqlGradedRule, hasAnswerKeyTestCases, buildMissingAnswerKeyMessage } from './AnswerKeyGuard.js'

const sqlRuleWithKey = {
    id: 'r1',
    title: 'Truy vấn danh sách sinh viên',
    scoringStrategy: 'SqlExecutionProbe',
    requiredEvidence: [{ sqlProbe: { setupScript: 'CREATE TABLE ...', testCases: [{ name: 'happy path' }] } }]
}

const sqlRuleWithoutKey = {
    id: 'r2',
    title: 'Stored procedure tính điểm',
    scoringStrategy: 'SqlExecutionProbe',
    requiredEvidence: [{ sqlProbe: { setupScript: '', testCases: [] } }]
}

const sqlRuleWithNoEvidence = {
    id: 'r3',
    title: 'Trigger cập nhật tồn kho',
    scoringStrategy: 'SqlExecutionProbe'
}

const aiReviewRule = {
    id: 'r4',
    title: 'Giải thích thiết kế chuẩn hoá',
    scoringStrategy: 'AiTextAnalysis'
}

describe('AnswerKeyGuard', () => {
    describe('findSqlRulesMissingAnswerKey', () => {
        test('flags a SQL rule whose probe has no test cases', () => {
            const missing = findSqlRulesMissingAnswerKey([sqlRuleWithoutKey])
            expect(missing).toHaveLength(1)
            expect(missing[0].id).toBe('r2')
        })

        test('flags a SQL rule with no requiredEvidence at all', () => {
            expect(findSqlRulesMissingAnswerKey([sqlRuleWithNoEvidence])).toHaveLength(1)
        })

        test('passes a SQL rule that has test cases', () => {
            expect(findSqlRulesMissingAnswerKey([sqlRuleWithKey])).toHaveLength(0)
        })

        test('ignores rules graded by anything other than SqlExecutionProbe', () => {
            // A database assignment marked by AI review must still be publishable.
            expect(findSqlRulesMissingAnswerKey([aiReviewRule])).toHaveLength(0)
        })

        test('flags only the uncovered rules in a mixed rubric', () => {
            const missing = findSqlRulesMissingAnswerKey([sqlRuleWithKey, sqlRuleWithoutKey, aiReviewRule])
            expect(missing.map(r => r.id)).toEqual(['r2'])
        })

        test('treats an empty or missing rubric as nothing to block', () => {
            expect(findSqlRulesMissingAnswerKey([])).toHaveLength(0)
            expect(findSqlRulesMissingAnswerKey(null)).toHaveLength(0)
            expect(findSqlRulesMissingAnswerKey(undefined)).toHaveLength(0)
        })
    })

    describe('helpers', () => {
        test('isSqlGradedRule recognises only the SQL strategy', () => {
            expect(isSqlGradedRule(sqlRuleWithKey)).toBe(true)
            expect(isSqlGradedRule(aiReviewRule)).toBe(false)
            expect(isSqlGradedRule(undefined)).toBe(false)
        })

        test('hasAnswerKeyTestCases reads through requiredEvidence', () => {
            expect(hasAnswerKeyTestCases(sqlRuleWithKey)).toBe(true)
            expect(hasAnswerKeyTestCases(sqlRuleWithoutKey)).toBe(false)
        })

        test('the message names the offending rules', () => {
            const message = buildMissingAnswerKeyMessage([sqlRuleWithoutKey], 2)
            expect(message).toContain('Stored procedure tính điểm')
            expect(message).toContain('1/2')
        })
    })
})
