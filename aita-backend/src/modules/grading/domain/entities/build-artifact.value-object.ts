// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type BuildStatusValue = 'Success' | 'Failed' | 'Timeout'

// ──────────────────────────────────────────────────────────────
// Value Object: BuildArtifact
// ──────────────────────────────────────────────────────────────

/**
 * Represents the result of a build process within a grading session.
 */
export class BuildArtifact {
  readonly id: string
  readonly gradingSessionId: string | null
  readonly buildStatus: BuildStatusValue | null
  readonly buildLog: string | null
  readonly dockerImageId: string | null
  readonly executablePath: string | null
  readonly buildHash: string | null
  readonly durationMs: number | null

  private constructor(
    id: string,
    gradingSessionId: string | null,
    buildStatus: BuildStatusValue | null,
    buildLog: string | null,
    dockerImageId: string | null,
    executablePath: string | null,
    buildHash: string | null,
    durationMs: number | null
  ) {
    this.id = id
    this.gradingSessionId = gradingSessionId
    this.buildStatus = buildStatus
    this.buildLog = buildLog
    this.dockerImageId = dockerImageId
    this.executablePath = executablePath
    this.buildHash = buildHash
    this.durationMs = durationMs
  }

  static create(
    id: string,
    gradingSessionId: string,
    params?: {
      buildStatus?: BuildStatusValue
      buildLog?: string
      dockerImageId?: string
      executablePath?: string
      buildHash?: string
      durationMs?: number
    }
  ): BuildArtifact {
    return new BuildArtifact(
      id, gradingSessionId,
      params?.buildStatus ?? null,
      params?.buildLog ?? null,
      params?.dockerImageId ?? null,
      params?.executablePath ?? null,
      params?.buildHash ?? null,
      params?.durationMs ?? null
    )
  }

  static restore(
    id: string,
    gradingSessionId: string | null,
    buildStatus: BuildStatusValue | null,
    buildLog: string | null,
    dockerImageId: string | null,
    executablePath: string | null,
    buildHash: string | null,
    durationMs: number | null
  ): BuildArtifact {
    return new BuildArtifact(
      id, gradingSessionId, buildStatus, buildLog,
      dockerImageId, executablePath, buildHash, durationMs
    )
  }

  isSuccess(): boolean {
    return this.buildStatus === 'Success'
  }

  isFailed(): boolean {
    return this.buildStatus === 'Failed'
  }

  equals(other: BuildArtifact): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      gradingSessionId: this.gradingSessionId,
      buildStatus: this.buildStatus,
      buildLog: this.buildLog,
      dockerImageId: this.dockerImageId,
      executablePath: this.executablePath,
      buildHash: this.buildHash,
      durationMs: this.durationMs,
    }
  }
}
