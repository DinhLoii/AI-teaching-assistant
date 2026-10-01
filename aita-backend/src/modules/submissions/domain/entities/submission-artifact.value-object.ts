// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type ArtifactTypeValue = 'SourceCode' | 'Screenshot' | 'Video' | 'APK' | 'Build' | 'Diagram' | 'Document'

// ──────────────────────────────────────────────────────────────
// Value Object: SubmissionArtifact
// ──────────────────────────────────────────────────────────────

/**
 * Represents an artifact (file) submitted by a student as part of a submission.
 */
export class SubmissionArtifact {
  readonly id: string
  readonly submissionId: string | null
  readonly artifactType: ArtifactTypeValue | null
  readonly artifactLabel: string | null
  readonly fileName: string | null
  readonly fileUrl: string | null
  readonly fileSizeBytes: bigint | null
  readonly hashSha256: string | null
  readonly extractedPath: string | null
  readonly mimeType: string | null

  private constructor(
    id: string,
    submissionId: string | null,
    artifactType: ArtifactTypeValue | null,
    artifactLabel: string | null,
    fileName: string | null,
    fileUrl: string | null,
    fileSizeBytes: bigint | null,
    hashSha256: string | null,
    extractedPath: string | null,
    mimeType: string | null
  ) {
    this.id = id
    this.submissionId = submissionId
    this.artifactType = artifactType
    this.artifactLabel = artifactLabel
    this.fileName = fileName
    this.fileUrl = fileUrl
    this.fileSizeBytes = fileSizeBytes
    this.hashSha256 = hashSha256
    this.extractedPath = extractedPath
    this.mimeType = mimeType
  }

  // ── Factory Methods ──

  static create(
    id: string,
    submissionId: string,
    artifactType: ArtifactTypeValue,
    fileName: string,
    fileUrl: string,
    params?: {
      artifactLabel?: string
      fileSizeBytes?: bigint
      hashSha256?: string
      extractedPath?: string
      mimeType?: string
    }
  ): SubmissionArtifact {
    return new SubmissionArtifact(
      id, submissionId, artifactType,
      params?.artifactLabel ?? null,
      fileName, fileUrl,
      params?.fileSizeBytes ?? null,
      params?.hashSha256 ?? null,
      params?.extractedPath ?? null,
      params?.mimeType ?? null
    )
  }

  static restore(
    id: string,
    submissionId: string | null,
    artifactType: ArtifactTypeValue | null,
    artifactLabel: string | null,
    fileName: string | null,
    fileUrl: string | null,
    fileSizeBytes: bigint | null,
    hashSha256: string | null,
    extractedPath: string | null,
    mimeType: string | null
  ): SubmissionArtifact {
    return new SubmissionArtifact(
      id, submissionId, artifactType, artifactLabel,
      fileName, fileUrl, fileSizeBytes, hashSha256,
      extractedPath, mimeType
    )
  }

  equals(other: SubmissionArtifact): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      submissionId: this.submissionId,
      artifactType: this.artifactType,
      artifactLabel: this.artifactLabel,
      fileName: this.fileName,
      fileUrl: this.fileUrl,
      fileSizeBytes: this.fileSizeBytes?.toString() ?? null,
      hashSha256: this.hashSha256,
      extractedPath: this.extractedPath,
      mimeType: this.mimeType,
    }
  }
}
