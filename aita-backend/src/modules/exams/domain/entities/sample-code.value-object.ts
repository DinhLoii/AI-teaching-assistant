// ──────────────────────────────────────────────────────────────
// Value Object: SampleCode
// ──────────────────────────────────────────────────────────────

/**
 * Represents sample code provided as reference for an exam.
 */
export class SampleCode {
  readonly id: string
  readonly examId: string | null
  readonly language: string | null
  readonly code: string | null
  readonly explanation: string | null

  private constructor(
    id: string,
    examId: string | null,
    language: string | null,
    code: string | null,
    explanation: string | null
  ) {
    this.id = id
    this.examId = examId
    this.language = language
    this.code = code
    this.explanation = explanation
  }

  // ── Factory Methods ──

  static create(
    id: string,
    examId: string,
    language: string,
    code: string,
    explanation?: string
  ): SampleCode {
    return new SampleCode(id, examId, language, code, explanation ?? null)
  }

  static restore(
    id: string,
    examId: string | null,
    language: string | null,
    code: string | null,
    explanation: string | null
  ): SampleCode {
    return new SampleCode(id, examId, language, code, explanation)
  }

  // ── Equality ──

  equals(other: SampleCode): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      examId: this.examId,
      language: this.language,
      code: this.code,
      explanation: this.explanation,
    }
  }
}
