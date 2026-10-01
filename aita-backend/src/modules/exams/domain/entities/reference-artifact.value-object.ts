// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type ReferenceArtifactTypeValue = 'SourceCode' | 'Screenshot' | 'Architecture' | 'ExpectedOutput' | 'Video'

// ──────────────────────────────────────────────────────────────
// Value Object: ReferenceArtifact
// ──────────────────────────────────────────────────────────────

/**
 * Represents a reference artifact (e.g., expected output, architecture diagram)
 * that is associated with an exam for grading reference.
 */
export class ReferenceArtifact {
  readonly id: string
  readonly examId: string | null
  readonly artifactType: ReferenceArtifactTypeValue | null
  readonly expectedFor: string | null
  readonly fileName: string | null
  readonly fileUrl: string | null
  readonly description: string | null
  readonly sortOrder: number | null

  private constructor(
    id: string,
    examId: string | null,
    artifactType: ReferenceArtifactTypeValue | null,
    expectedFor: string | null,
    fileName: string | null,
    fileUrl: string | null,
    description: string | null,
    sortOrder: number | null
  ) {
    this.id = id
    this.examId = examId
    this.artifactType = artifactType
    this.expectedFor = expectedFor
    this.fileName = fileName
    this.fileUrl = fileUrl
    this.description = description
    this.sortOrder = sortOrder
  }

  // ── Factory Methods ──

  static create(
    id: string,
    examId: string,
    artifactType: ReferenceArtifactTypeValue,
    params?: {
      expectedFor?: string
      fileName?: string
      fileUrl?: string
      description?: string
      sortOrder?: number
    }
  ): ReferenceArtifact {
    return new ReferenceArtifact(
      id, examId, artifactType,
      params?.expectedFor ?? null,
      params?.fileName ?? null,
      params?.fileUrl ?? null,
      params?.description ?? null,
      params?.sortOrder ?? null
    )
  }

  static restore(
    id: string,
    examId: string | null,
    artifactType: ReferenceArtifactTypeValue | null,
    expectedFor: string | null,
    fileName: string | null,
    fileUrl: string | null,
    description: string | null,
    sortOrder: number | null
  ): ReferenceArtifact {
    return new ReferenceArtifact(id, examId, artifactType, expectedFor, fileName, fileUrl, description, sortOrder)
  }

  equals(other: ReferenceArtifact): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      examId: this.examId,
      artifactType: this.artifactType,
      expectedFor: this.expectedFor,
      fileName: this.fileName,
      fileUrl: this.fileUrl,
      description: this.description,
      sortOrder: this.sortOrder,
    }
  }
}
