import {
  StructuredRubricCriteria,
  CriterionEvaluationResult,
  TestExecutionEvidence,
} from '../../domain/rag/rag.types.js'

export class ScoreAggregatorService {
  /**
   * Deterministically aggregate scores based on structured criteria weights,
   * empirical test execution evidence, and AI semantic achievement ratios.
   * Enforces mathematical consistency and anti-double-penalty rules.
   */
  aggregate(
    criteria: StructuredRubricCriteria[],
    aiEvaluations: Array<{
      ruleId?: string
      criterionName: string
      achievementRatio: number // 0.0 -> 1.0 (clamped)
      reasoning: string
      codeEvidence?: Array<{ filePath: string; lineStart?: number; lineEnd?: number; codeSnippet: string; explanation: string }>
    }>,
    testEvidence?: TestExecutionEvidence,
    targetMaxScore = 10.0
  ): {
    totalScore: number
    maxPossibleScore: number
    criteriaResults: CriterionEvaluationResult[]
  } {
    if (!criteria || criteria.length === 0) {
      return {
        totalScore: 0,
        maxPossibleScore: targetMaxScore,
        criteriaResults: [],
      }
    }

    const aiEvalMap = new Map<string, typeof aiEvaluations[0]>()
    aiEvaluations.forEach((evalItem) => {
      if (evalItem.ruleId) {
        aiEvalMap.set(evalItem.ruleId, evalItem)
      }
      aiEvalMap.set(evalItem.criterionName.trim().toLowerCase(), evalItem)
    })

    const isCompilationFailed = testEvidence?.compilationSuccess === false
    const testPassRatio =
      testEvidence && testEvidence.totalTests > 0
        ? Math.max(0, Math.min(1, testEvidence.passedTests / testEvidence.totalTests))
        : undefined

    const criteriaResults: CriterionEvaluationResult[] = []
    let rawTotalEarned = 0
    let rawTotalPossible = 0

    for (const rule of criteria) {
      const match =
        aiEvalMap.get(rule.ruleId) ||
        aiEvalMap.get(rule.name.trim().toLowerCase()) ||
        aiEvaluations.find((e) => e.criterionName.toLowerCase().includes(rule.name.toLowerCase().substring(0, 15)))

      let ratio = match ? Math.max(0, Math.min(1, Number(match.achievementRatio) || 0)) : 0

      // Anti-double-penalty logic:
      // If code failed to compile, test cases and runtime probes cannot run.
      // We evaluate syntax/intent, but don't penalize multiple dependent functional rules repeatedly.
      if (isCompilationFailed) {
        if (rule.category === 'TEST_CASE' || rule.category === 'FUNCTIONAL') {
          // If failure is solely due to compilation, allow static inspection ratio but cap penalty
          ratio = Math.min(ratio, 0.3)
        }
      } else if (testPassRatio !== undefined && rule.category === 'TEST_CASE') {
        // Calibrate automated test-backed rules with empirical test runner pass rate
        ratio = testPassRatio * 0.8 + ratio * 0.2
      }

      const maxPts = Number(rule.maxPoints) || 1
      const awarded = Math.round(maxPts * ratio * 10) / 10
      const passed = ratio >= 0.5

      rawTotalEarned += awarded
      rawTotalPossible += maxPts

      criteriaResults.push({
        ruleId: rule.ruleId,
        criterionName: rule.name,
        category: rule.category || 'FUNCTIONAL',
        maxScore: maxPts,
        scoreAwarded: awarded,
        achievementRatio: Math.round(ratio * 100) / 100,
        passed,
        reasoning:
          match?.reasoning ||
          (isCompilationFailed
            ? 'Không thể kiểm thử tính năng do mã nguồn gặp lỗi biên dịch.'
            : 'Đã hoàn thành kiểm tra theo tiêu chí đề bài.'),
        codeEvidence: match?.codeEvidence || [],
        isAutomatedTestBacked: rule.category === 'TEST_CASE' || Boolean(testEvidence?.totalTests),
      })
    }

    // Scale deterministically to targetMaxScore (10.0)
    let finalScore = targetMaxScore
    if (rawTotalPossible > 0) {
      finalScore = (rawTotalEarned / rawTotalPossible) * targetMaxScore
    } else {
      finalScore = rawTotalEarned
    }

    finalScore = Math.max(0, Math.min(targetMaxScore, Math.round(finalScore * 10) / 10))

    return {
      totalScore: finalScore,
      maxPossibleScore: targetMaxScore,
      criteriaResults,
    }
  }
}
