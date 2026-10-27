import { z } from 'zod'
import type { AdaptiveAnalysisOutput } from '../../domain/analysis/analysis.types.js'

export const AnalyzedTestCaseSchema = z.object({
  id: z.string(),
  input: z.string(),
  expectedOutput: z.string(),
  points: z.number().min(0),
  isHidden: z.boolean(),
  comparisonMode: z.enum(['trim_whitespace', 'exact', 'flexible']),
  source: z.enum(['EXTRACTED', 'RULE_INFERRED', 'AI_SUGGESTED', 'DEFAULT', 'TEACHER_VERIFIED']),
  evidence: z.string().optional(),
  notes: z.string().optional(),
})

export const AnalyzedRubricCriterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  maxPoints: z.number().min(0),
  weight: z.number().optional(),
  method: z.enum(['test_runner', 'ai_assessment', 'deterministic_rule', 'hybrid']),
  passCondition: z.string(),
  failCondition: z.string(),
  aiGuidance: z.string(),
  source: z.enum(['EXTRACTED', 'RULE_INFERRED', 'AI_SUGGESTED', 'DEFAULT', 'TEACHER_VERIFIED']),
  evidence: z.string().optional(),
  rationale: z.string().optional(),
  reviewNeeded: z.boolean(),
  notes: z.string().optional(),
})

export const AdaptiveAnalysisOutputSchema = z.object({
  suggestedTitle: z.string().min(1),
  detectedLanguage: z.enum(['C', 'C++', 'Java', 'Python', 'SQL', 'C#', 'JavaScript', 'TypeScript', 'Kotlin', 'Dart', 'Swift', 'Go', 'Rust', 'PHP', 'Unknown']),
  allowedLanguages: z.array(z.string()).optional(),
  assignmentCategory: z.enum(['standard', 'sql', 'multimodule']),
  submissionFormat: z.object({
    submissionType: z.enum(['single_file', 'project_archive']),
    allowedFormats: z.array(z.string()).min(1),
    requiredLanguage: z.string(),
    entryFile: z.string(),
    directoryStructure: z.string(),
    resubmissionPolicy: z.enum(['highest', 'latest']),
  }),
  runtimeConfig: z.object({
    language: z.string(),
    version: z.string(),
    submissionStyle: z.enum(['single_file', 'project_archive']),
    buildCommand: z.string(),
    runCommand: z.string(),
    category: z.enum(['standard', 'sql', 'multimodule']),
  }),
  sqlConfig: z.object({
    dbms: z.enum(['postgresql', 'mysql', 'sqlserver', 'sqlite']),
    schemaDdl: z.string(),
    seedData: z.string(),
    expectedQuery: z.string(),
    comparisonMode: z.enum(['exact', 'ignore_order', 'structure_and_data']),
    constraintsNotes: z.string(),
  }).optional(),
  requirements: z.array(z.string()).min(1),
  inputSpecification: z.string().optional(),
  outputSpecification: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  testCases: z.array(AnalyzedTestCaseSchema),
  rubricCriteria: z.array(AnalyzedRubricCriterionSchema),
  edgeCasesAndPitfalls: z.object({
    edgeCases: z.array(z.string()),
    commonPitfalls: z.string(),
    referenceMaterials: z.string(),
  }),
  sampleSolution: z.string().optional(),
  summaryExplanation: z.string(),
  modelUsed: z.string(),
})

export class AnalysisValidatorService {
  /**
   * Validates and repairs the analysis payload against strict business rules
   */
  public static validateAndRepair(
    output: AdaptiveAnalysisOutput,
    targetMaxScore: number
  ): {
    isValid: boolean
    output: AdaptiveAnalysisOutput
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []

    // 1. Zod schema validation
    const parsed = AdaptiveAnalysisOutputSchema.safeParse(output)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`[Schema] ${issue.path.join('.')}: ${issue.message}`)
      }
    }

    // 2. Validate Rubric Points Math Consistency
    const rubricCriteria = output.rubricCriteria || []

    // Check for negative points and correct them first
    for (const c of rubricCriteria) {
      if (c.maxPoints < 0) {
        warnings.push(`Tiêu chí "${c.name}" có điểm âm (${c.maxPoints}). Đã điều chỉnh về 0.`)
        c.maxPoints = 0
      }
    }

    const currentSum = Number(
      rubricCriteria.reduce((acc, c) => acc + (Number(c.maxPoints) || 0), 0).toFixed(2)
    )

    // Check for duplicate criteria names
    const seenNames = new Set<string>()
    for (const c of rubricCriteria) {
      const lower = c.name.trim().toLowerCase()
      if (seenNames.has(lower)) {
        warnings.push(`Phát hiện tiêu chí trùng lặp tên: "${c.name}".`)
      }
      seenNames.add(lower)
    }

    // Source evidence remains unchanged; an inconsistent scale is distributed
    // evenly in hundredths so the grading rubric always totals the chosen score.
    if (rubricCriteria.length && Math.abs(currentSum - targetMaxScore) > 0.001) {
      const note = `Tổng điểm trích xuất ${currentSum}đ chưa khớp thang ${targetMaxScore}đ. Đã chia đều ${targetMaxScore}đ cho ${rubricCriteria.length} tiêu chí; giữ nguyên nội dung và trích dẫn gốc, cần giảng viên duyệt.`
      const units = Math.round(targetMaxScore * 100)
      const base = Math.floor(units / rubricCriteria.length)
      const remainder = units % rubricCriteria.length
      rubricCriteria.forEach((criterion, index) => {
        const originalPoints = criterion.maxPoints
        criterion.maxPoints = (base + (index < remainder ? 1 : 0)) / 100
        criterion.reviewNeeded = true
        criterion.notes = [criterion.notes, `Điểm trước phân bổ: ${originalPoints}. ${note}`].filter(Boolean).join('\n')
      })
      warnings.push(note)
      output.summaryExplanation = [output.summaryExplanation, note].filter(Boolean).join('\n')
      const review = (output as any).analysisReview
      if (review) review.warnings = [...(review.warnings || []), note]
    }
    output.provenanceReport.pointsSumDelta = Number(Math.abs(rubricCriteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0) - targetMaxScore).toFixed(2))

    // Missing execution evidence remains empty; never inject or hide invented cases.
    if (!output.testCases.length) warnings.push('Chưa có testcase thực thi được xác minh.');

    return {
      isValid: errors.length === 0,
      output,
      warnings,
      errors,
    }
  }

}
