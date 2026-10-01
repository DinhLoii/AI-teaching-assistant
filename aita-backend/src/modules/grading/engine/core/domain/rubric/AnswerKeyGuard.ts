/**
 * Publish-time check: every SQL-graded rule must carry test cases from an answer key.
 *
 * Test cases for a SqlExecutionProbe rule appear only after a lecturer uploads a .sql answer
 * key (parse-sql-key / update-answer-key). Publishing without one is silently destructive:
 * RubricEvaluator returns score 0 for the rule with "Hệ thống chưa tạo test case tự động cho
 * câu hỏi này", so every student loses those marks and nobody notices until submissions are
 * already graded.
 *
 * Rules graded by any other strategy are untouched - a database assignment marked by AI review
 * has no SqlExecutionProbe rules and so is not affected.
 */

export interface RubricRuleLike {
    id?: string;
    title?: string;
    scoringStrategy?: string;
    requiredEvidence?: Array<{ sqlProbe?: { testCases?: unknown[] } }>;
}

export const SQL_SCORING_STRATEGY = 'SqlExecutionProbe';

/** True when this rule is graded by running SQL against a database. */
export function isSqlGradedRule(rule: RubricRuleLike | null | undefined): boolean {
    return rule?.scoringStrategy === SQL_SCORING_STRATEGY;
}

/** True when the rule already carries at least one test case from an answer key. */
export function hasAnswerKeyTestCases(rule: RubricRuleLike | null | undefined): boolean {
    return (rule?.requiredEvidence ?? []).some(evidence => (evidence?.sqlProbe?.testCases?.length ?? 0) > 0);
}

/**
 * The SQL-graded rules that would score every student 0 because no answer key covers them.
 * Empty array means the rubric is safe to publish.
 */
export function findSqlRulesMissingAnswerKey(rules: RubricRuleLike[] | null | undefined): RubricRuleLike[] {
    return (rules ?? []).filter(rule => isSqlGradedRule(rule) && !hasAnswerKeyTestCases(rule));
}

/** Message shown to the lecturer, naming the rules that still need an answer key. */
export function buildMissingAnswerKeyMessage(missing: RubricRuleLike[], totalSqlRules: number): string {
    const titles = missing.map(rule => rule?.title || rule?.id || 'Không rõ tiêu chí').join(', ');
    return (
        `Bài tập dạng cơ sở dữ liệu (SQL) phải có file đáp án (answer key) trước khi phát hành. ` +
        `${missing.length}/${totalSqlRules} tiêu chí chưa có test case: ${titles}. ` +
        `Hãy tải lên file .sql đáp án để hệ thống sinh test case chấm bài.`
    );
}
