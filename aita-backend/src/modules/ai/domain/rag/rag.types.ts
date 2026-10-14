/**
 * RAG Domain Types for AITA (AI-powered Teaching Assistant System)
 * Defines structured documents, chunks, query context, and responses.
 */

export enum RagDocumentType {
  ASSIGNMENT_SPEC = 'ASSIGNMENT_SPEC',       // Problem description, technical constraints, deadlines
  RUBRIC_CRITERIA = 'RUBRIC_CRITERIA',       // Rubric rules, sub-criteria, scoring weights
  TEST_SPECIFICATION = 'TEST_SPECIFICATION', // Test cases, expected inputs/outputs, edge cases
  SYLLABUS_CONCEPT = 'SYLLABUS_CONCEPT',     // Subject syllabus topics, expected competencies
  STUDENT_SOURCE_FILE = 'STUDENT_SOURCE_FILE', // Student source code file/module
  EXECUTION_LOG = 'EXECUTION_LOG',           // Test runner output, compiler errors, sandbox logs
  REFERENCE_SOLUTION = 'REFERENCE_SOLUTION', // Benchmark solution / sample code
}

export interface RagChunk {
  id: string
  docType: RagDocumentType
  title: string
  sourceRef: string // File path, rule ID, or assignment ID
  content: string
  score?: number // Computed relevance score
  metadata: {
    language?: string
    subjectCode?: string
    examId?: string
    submissionId?: string
    importanceWeight?: number // 1 to 5
    tags?: string[]
    lineStart?: number
    lineEnd?: number
  }
}

export interface RagDocument {
  id: string
  docType: RagDocumentType
  title: string
  sourceRef: string
  content: string
  metadata?: Record<string, unknown>
  chunks: RagChunk[]
}

export interface RagChatInput {
  query: string
  role: 'STUDENT' | 'LECTURER' | 'ADMIN'
  userId?: string
  subjectCode?: string
  examId?: string
  submissionId?: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface RagChatOutput {
  answer: string
  sourcesUsed: Array<{
    docType: RagDocumentType
    title: string
    sourceRef: string
  }>
  suggestedFollowUps?: string[]
}

export interface RagDiagnoseInput {
  submissionId: string
  ruleScoreId?: string
  testcaseName?: string
  errorMessage?: string
  userQuery?: string
}

export interface RagDiagnoseOutput {
  rootCause: string
  affectedFiles: string[]
  explanation: string
  pedagogicalHint: string
  suggestedActionPlan: string[]
}

export enum RubricEvaluationSource {
  OFFICIAL_TEACHER_RUBRIC = 'OFFICIAL_TEACHER_RUBRIC', // Kịch bản 1: Có rubric chính thức trong DB
  AI_PROPOSED_RUBRIC = 'AI_PROPOSED_RUBRIC',           // Kịch bản 2: Chưa có rubric nhưng có đề bài -> AI đề xuất
  UNIVERSAL_CODE_QUALITY = 'UNIVERSAL_CODE_QUALITY',   // Kịch bản 3: Không có rubric, không có đề bài rõ ràng
}

export interface StructuredRubricCriteria {
  ruleId: string
  ruleCode: string
  name: string
  description: string
  maxPoints: number
  weightPercentage: number
  category?: 'FUNCTIONAL' | 'VALIDATION' | 'CODE_QUALITY' | 'TEST_CASE' | 'ARCHITECTURE'
}

export interface TestExecutionEvidence {
  totalTests: number
  passedTests: number
  failedTests: number
  compilationSuccess: boolean
  compilationError?: string
  hasRuntimeError?: boolean
  runtimeErrorMessage?: string
  executionLogs?: string
}

export interface CodeEvaluationEvidence {
  filePath: string
  lineStart?: number
  lineEnd?: number
  codeSnippet: string
  explanation: string
}

export interface CriterionEvaluationResult {
  ruleId?: string
  criterionName: string
  category?: string
  maxScore: number
  scoreAwarded: number
  achievementRatio: number // 0.0 -> 1.0 (do AI đối chiếu mã nguồn thẩm định)
  passed: boolean
  reasoning: string
  codeEvidence: CodeEvaluationEvidence[]
  isAutomatedTestBacked?: boolean
}

export interface RagAssessmentOutput {
  aiScore: number // Điểm được tính toán tất định từ Bộ tổng hợp điểm (Deterministic Score Aggregator)
  maxPossibleScore: number
  rubricSource: RubricEvaluationSource
  isTeacherOfficial: boolean
  disclaimer?: string
  assumptions?: string[]
  overallVerdict: string
  criteriaEvaluations: CriterionEvaluationResult[]
  testEvidence?: TestExecutionEvidence
  strengths: string[]
  areasForImprovement: string[]
  pedagogicalSummary: string
  sourcesUsed?: Array<{
    docType: RagDocumentType
    title: string
    sourceRef: string
  }>
}

