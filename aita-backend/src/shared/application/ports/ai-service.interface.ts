/**
 * Port interface for AI microservice operations.
 * All input/output types are domain-owned — no leaking of external API shapes.
 */

// ── Input Types ──────────────────────────────────────────────

export interface GenerateExerciseInput {
  classId?: string
  type: string
  topic: string
  difficulty?: string
  questionCount?: number
  language?: string
  extra?: string
  userId?: string
}

export interface AssessInput {
  content: string
  language?: string
  assignmentTitle?: string
  assignmentDescription?: string
}

export interface GeneratePromptTemplateInput {
  name: string
  description?: string
  category?: string
  subjectCode?: string
  draftContent?: string
  // ── Educational params (from AI config form) ──
  questionCount?: number
  difficulty?: string
  topic?: string
  language?: string
  additionalNotes?: string
}

export interface RefinePromptTemplateInput {
  content: string
}

// ── Output Types ─────────────────────────────────────────────

export interface GenerateExerciseOutput {
  title: string
  description: string
  content: Record<string, unknown>
}

export interface AssessFeedback {
  testCases?: { passed: number; total: number }
  codingStyle?: string
  logic?: string
  performance?: string
  suggestions?: string[]
  language?: string
  length?: number
}

export interface AssessOutput {
  aiScore: number
  feedback: AssessFeedback
}

export interface LearningRecommendation {
  type: string
  title: string
}

export interface LearningFeedbackOutput {
  studentId: string
  weakTopics: string[]
  recommendations: LearningRecommendation[]
}

export interface GenerateRubricInput {
  topic: string
  difficulty?: string
  totalScore?: number
  file?: {
    filename: string
    buffer: Buffer
    mimetype: string
  }
}

export interface GenerateRubricOutput {
  criteria: Array<{
    name: string
    description: string
    maxScore: number
  }>
  totalScore: number
}

export interface GeneratePromptTemplateOutput {
  prompt: string
}

// ── Service Interface ────────────────────────────────────────

export interface IAIService {
  generateExercise(input: GenerateExerciseInput): Promise<GenerateExerciseOutput>
  assess(input: AssessInput): Promise<AssessOutput>
  learningFeedback(studentId: string): Promise<LearningFeedbackOutput>
  generateRubric(input: GenerateRubricInput): Promise<GenerateRubricOutput>
  generatePromptTemplate(input: GeneratePromptTemplateInput): Promise<GeneratePromptTemplateOutput>
  refinePromptTemplate(input: RefinePromptTemplateInput): Promise<GeneratePromptTemplateOutput>
}
