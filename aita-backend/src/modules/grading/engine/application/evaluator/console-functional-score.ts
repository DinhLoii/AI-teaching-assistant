/** Points are derived from execution results, scoped to the declared question when available. */
export function consoleFunctionalScore(rule: { category?: string; weight: number; scoringStrategy: string; title?: string; description?: string }, verification: any) {
    if (!verification || !['Functional', 'Algorithm'].includes(rule.category || 'Functional') || rule.scoringStrategy === 'StdInOutProbe') return null;
    const file = ((rule.title || '') + ' ' + (rule.description || '')).match(/\bQ\d+\.c\b/i)?.[0];
    const scoped = file && Array.isArray(verification.caseResults) ? verification.caseResults.filter((test: any) => String(test.caseId).toUpperCase().startsWith(file.replace(/\.c$/i,'').toUpperCase() + '-')) : null;
    const total = scoped ? scoped.length : verification.totalCases;
    const passed = scoped ? scoped.filter((test: any) => test.passed === true).length : verification.passedCases;
    const valid = verification.status === 'completed' && Number.isInteger(total) && total > 0 && Number.isInteger(passed) && passed >= 0 && passed <= total;
    if (!valid) return { passed: false, score: 0, needsReview: true, reason: 'Chưa có kết quả testcase hợp lệ cho ' + (file || 'tiêu chí') + '; cần kiểm tra runner hoặc ánh xạ testcase.' };
    const ratio = !scoped && verification.compilationPassed === false ? 0 : passed / total;
    return { passed: ratio === 1, score: Math.round(rule.weight * ratio * 100) / 100,
        reason: 'Điểm chức năng ' + (file || 'theo bộ testcase chung của đề') + ': ' + passed + '/' + total + ' test đạt; ' + Math.round(rule.weight * ratio * 100) / 100 + '/' + rule.weight + ' điểm. Bằng chứng từ lượt thực thi bài nộp này.' };
}
