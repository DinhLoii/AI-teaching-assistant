import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Entity: ExamSection
// ──────────────────────────────────────────────────────────────

/**
 * Represents a section within an exam.
 * Each section groups rubric rules and has its own max points.
 */
export class ExamSection extends AggregateRoot {
  id: string
  examId: string | null
  sectionCode: string | null
  title: string | null
  description: string | null
  maxPoints: number | null
  sortOrder: number | null

  private constructor(
    id: string,
    examId: string | null,
    sectionCode: string | null,
    title: string | null,
    description: string | null,
    maxPoints: number | null,
    sortOrder: number | null
  ) {
    super()
    this.id = id
    this.examId = examId
    this.sectionCode = sectionCode
    this.title = title
    this.description = description
    this.maxPoints = maxPoints
    this.sortOrder = sortOrder
  }

  // ── Factory Methods ──

  static create(
    id: string,
    examId: string,
    sectionCode: string,
    title: string,
    params?: {
      description?: string
      maxPoints?: number
      sortOrder?: number
    }
  ): ExamSection {
    return new ExamSection(
      id,
      examId,
      sectionCode,
      title,
      params?.description ?? null,
      params?.maxPoints ?? null,
      params?.sortOrder ?? null
    )
  }

  static restore(
    id: string,
    examId: string | null,
    sectionCode: string | null,
    title: string | null,
    description: string | null,
    maxPoints: number | null,
    sortOrder: number | null
  ): ExamSection {
    return new ExamSection(id, examId, sectionCode, title, description, maxPoints, sortOrder)
  }

  // ── Business Logic ──

  updateInfo(params: {
    title?: string
    description?: string
    maxPoints?: number
    sortOrder?: number
  }): void {
    if (params.title !== undefined) this.title = params.title
    if (params.description !== undefined) this.description = params.description
    if (params.maxPoints !== undefined) this.maxPoints = params.maxPoints
    if (params.sortOrder !== undefined) this.sortOrder = params.sortOrder
  }
}
