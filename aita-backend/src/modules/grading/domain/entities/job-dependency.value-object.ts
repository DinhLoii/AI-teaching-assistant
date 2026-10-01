// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type DependencyTypeValue = 'Hard' | 'Soft'

// ──────────────────────────────────────────────────────────────
// Value Object: JobDependency
// ──────────────────────────────────────────────────────────────

/**
 * Represents a dependency between two grading jobs.
 * Composite key: (jobId, dependsOnJobId).
 */
export class JobDependency {
  readonly jobId: string
  readonly dependsOnJobId: string
  readonly dependencyType: DependencyTypeValue | null

  private constructor(
    jobId: string,
    dependsOnJobId: string,
    dependencyType: DependencyTypeValue | null
  ) {
    this.jobId = jobId
    this.dependsOnJobId = dependsOnJobId
    this.dependencyType = dependencyType
  }

  static create(
    jobId: string,
    dependsOnJobId: string,
    dependencyType: DependencyTypeValue = 'Hard'
  ): JobDependency {
    return new JobDependency(jobId, dependsOnJobId, dependencyType)
  }

  static restore(
    jobId: string,
    dependsOnJobId: string,
    dependencyType: DependencyTypeValue | null
  ): JobDependency {
    return new JobDependency(jobId, dependsOnJobId, dependencyType)
  }

  equals(other: JobDependency): boolean {
    return this.jobId === other.jobId && this.dependsOnJobId === other.dependsOnJobId
  }

  isHard(): boolean {
    return this.dependencyType === 'Hard'
  }

  toJSON() {
    return {
      jobId: this.jobId,
      dependsOnJobId: this.dependsOnJobId,
      dependencyType: this.dependencyType,
    }
  }
}
