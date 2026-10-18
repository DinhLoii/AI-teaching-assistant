type Score = number | string | null
type RubricRule = {
  id?: string
  title?: string
  name?: string
  description?: string
  weight?: Score
  maxPoints?: Score
  passCondition?: string
  failCondition?: string
}
type RubricSource = {
  aiRubrics?: RubricRule[] | null
  rubrics?: RubricRule[] | null
  rubric?: { rules?: RubricRule[] | null; totalWeight?: Score } | null
  metadata?: { totalPoints?: Score }
  maxScore?: Score
  totalPoints?: Score
}

/** An empty optional API response must not hide the lecturer's saved rubric. */
export function assignmentRubricRules(summary: RubricSource | null | undefined, grading?: RubricSource | null): RubricRule[] {
  const candidates = [grading?.rubric?.rules, summary?.aiRubrics, summary?.rubrics, summary?.rubric?.rules]
  return candidates.find(value => Array.isArray(value) && value.length > 0) || []
}

export function assignmentMaxScore(summary: RubricSource | null | undefined, grading?: RubricSource | null): number {
  for (const value of [summary?.maxScore, summary?.totalPoints, grading?.metadata?.totalPoints, grading?.rubric?.totalWeight]) {
    if (value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) > 0) return Number(value)
  }
  const sum = assignmentRubricRules(summary, grading).reduce((total, rule) => total + (Number(rule.weight ?? rule.maxPoints) || 0), 0)
  return sum || 10
}
