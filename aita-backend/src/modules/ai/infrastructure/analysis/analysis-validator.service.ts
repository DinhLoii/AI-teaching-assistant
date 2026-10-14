import { z } from 'zod'
import type { AdaptiveAnalysisOutput, AnalyzedRubricCriterion } from '../../domain/analysis/analysis.types.js'

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
  detectedLanguage: z.enum(['C', 'C++', 'Java', 'Python', 'SQL', 'C#']),
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
  testCases: z.array(AnalyzedTestCaseSchema).min(1),
  rubricCriteria: z.array(AnalyzedRubricCriterionSchema).min(1),
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

    // For Branch B (AI_GENERATED), scale points if mismatch exists
    if (output.provenanceReport.rubricSourceType === 'AI_GENERATED') {
      if (Math.abs(currentSum - targetMaxScore) > 0.05 && currentSum > 0) {
        warnings.push(`Tự động căn chỉnh tổng điểm Rubric đề xuất (${currentSum}đ -> ${targetMaxScore}đ).`)
        this.scaleRubricCriteria(rubricCriteria, targetMaxScore)
      }
    } else {
      // For Branch A (ORIGINAL_DOCUMENT), keep original points but flag warning if mismatch
      if (Math.abs(currentSum - targetMaxScore) > 0.05) {
        output.provenanceReport.pointsSumDelta = Number(Math.abs(currentSum - targetMaxScore).toFixed(2))
        warnings.push(
          `Barem gốc từ tài liệu có tổng điểm là ${currentSum}đ (khác mức ${targetMaxScore}đ dự kiến). Giữ nguyên điểm gốc theo tài liệu để giảng viên xác nhận.`
        )
      }
    }

    // 3. Validate Test Cases
    if (output.testCases.length === 0) {
      warnings.push('Không có test cases nào trong đề bài. Đã bổ sung bộ test cases mặc định.')
      output.testCases = [
        {
          id: `tc-def-1`,
          input: '1\n2',
          expectedOutput: '3',
          points: 1,
          isHidden: false,
          comparisonMode: 'trim_whitespace',
          source: 'DEFAULT',
          notes: 'Test case mặc định bổ sung do tài liệu chưa có kịch bản mẫu.',
        },
      ]
    }

    // Ensure at least one hidden test case exists for automated sandbox integrity
    const hasHidden = output.testCases.some(t => t.isHidden)
    if (!hasHidden && output.testCases.length >= 2) {
      // Mark last test case as hidden
      output.testCases[output.testCases.length - 1].isHidden = true
    }

    return {
      isValid: errors.length === 0,
      output,
      warnings,
      errors,
    }
  }

  private static scaleRubricCriteria(criteria: AnalyzedRubricCriterion[], targetMaxScore: number): void {
    const currentSum = criteria.reduce((sum, c) => sum + (c.maxPoints || 0), 0)
    if (currentSum <= 0) return

    const factor = targetMaxScore / currentSum
    let runningSum = 0

    for (let i = 0; i < criteria.length; i++) {
      if (i === criteria.length - 1) {
        criteria[i].maxPoints = Number(Math.max(0.5, targetMaxScore - runningSum).toFixed(1))
      } else {
        const basePts = typeof criteria[i].maxPoints === 'number' ? criteria[i].maxPoints : 1
        const scaled = Number((basePts * factor).toFixed(1))
        runningSum += scaled
        criteria[i].maxPoints = scaled
      }
    }
  }
}
