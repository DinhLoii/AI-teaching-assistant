import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Entity: ExamGenerationHistory
// ──────────────────────────────────────────────────────────────

/**
 * Tracks the history of AI-generated content for an exam.
 * Each version records the prompt and generated output.
 */
export class ExamGenerationHistory extends AggregateRoot {
  id: string
  examId: string | null
  version: number | null
  prompt: string | null
  generatedContent: string | null
  generatedBy: string | null

  private constructor(
    id: string,
    examId: string | null,
    version: number | null,
    prompt: string | null,
    generatedContent: string | null,
    generatedBy: string | null
  ) {
    super()
    this.id = id
    this.examId = examId
    this.version = version
    this.prompt = prompt
    this.generatedContent = generatedContent
    this.generatedBy = generatedBy
  }

  // ── Factory Methods ──

  static create(
    id: string,
    examId: string,
    version: number,
    prompt: string,
    generatedContent: string,
    generatedBy: string
  ): ExamGenerationHistory {
    return new ExamGenerationHistory(id, examId, version, prompt, generatedContent, generatedBy)
  }

  static restore(
    id: string,
    examId: string | null,
    version: number | null,
    prompt: string | null,
    generatedContent: string | null,
    generatedBy: string | null
  ): ExamGenerationHistory {
    return new ExamGenerationHistory(id, examId, version, prompt, generatedContent, generatedBy)
  }

  // ── Business Logic ──

  updateGeneratedContent(content: string): void {
    this.generatedContent = content
  }
}
