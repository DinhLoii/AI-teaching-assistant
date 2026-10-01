// ──────────────────────────────────────────────────────────────
// Value Object: ExamAttachment
// ──────────────────────────────────────────────────────────────

/**
 * Represents a file attachment associated with an exam.
 * Value object because it has no independent identity beyond its parent exam.
 */
export class ExamAttachment {
  readonly id: string
  readonly examId: string | null
  readonly fileName: string | null
  readonly fileUrl: string | null
  readonly fileType: string | null

  private constructor(
    id: string,
    examId: string | null,
    fileName: string | null,
    fileUrl: string | null,
    fileType: string | null
  ) {
    this.id = id
    this.examId = examId
    this.fileName = fileName
    this.fileUrl = fileUrl
    this.fileType = fileType
  }

  // ── Factory Methods ──

  static create(
    id: string,
    examId: string,
    fileName: string,
    fileUrl: string,
    fileType: string
  ): ExamAttachment {
    return new ExamAttachment(id, examId, fileName, fileUrl, fileType)
  }

  static restore(
    id: string,
    examId: string | null,
    fileName: string | null,
    fileUrl: string | null,
    fileType: string | null
  ): ExamAttachment {
    return new ExamAttachment(id, examId, fileName, fileUrl, fileType)
  }

  // ── Equality ──

  equals(other: ExamAttachment): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      examId: this.examId,
      fileName: this.fileName,
      fileUrl: this.fileUrl,
      fileType: this.fileType,
    }
  }
}
