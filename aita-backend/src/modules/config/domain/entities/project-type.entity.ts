import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Aggregate Root: ProjectType
// ──────────────────────────────────────────────────────────────

/**
 * Defines a project type (e.g., Java, Python, Fullstack) with its
 * sandbox configuration and build/run commands.
 */
export class ProjectType extends AggregateRoot {
  id: string
  code: string | null
  displayName: string | null
  requiresSandbox: boolean | null
  sandboxImage: string | null
  buildCommand: string | null
  runCommand: string | null

  private constructor(
    id: string,
    code: string | null,
    displayName: string | null,
    requiresSandbox: boolean | null,
    sandboxImage: string | null,
    buildCommand: string | null,
    runCommand: string | null
  ) {
    super()
    this.id = id
    this.code = code
    this.displayName = displayName
    this.requiresSandbox = requiresSandbox
    this.sandboxImage = sandboxImage
    this.buildCommand = buildCommand
    this.runCommand = runCommand
  }

  // ── Factory Methods ──

  static create(
    id: string,
    code: string,
    displayName: string,
    params?: {
      requiresSandbox?: boolean
      sandboxImage?: string
      buildCommand?: string
      runCommand?: string
    }
  ): ProjectType {
    return new ProjectType(
      id, code, displayName,
      params?.requiresSandbox ?? false,
      params?.sandboxImage ?? null,
      params?.buildCommand ?? null,
      params?.runCommand ?? null
    )
  }

  static restore(
    id: string,
    code: string | null,
    displayName: string | null,
    requiresSandbox: boolean | null,
    sandboxImage: string | null,
    buildCommand: string | null,
    runCommand: string | null
  ): ProjectType {
    return new ProjectType(id, code, displayName, requiresSandbox, sandboxImage, buildCommand, runCommand)
  }

  // ── Business Logic ──

  needsSandbox(): boolean {
    return this.requiresSandbox === true
  }

  updateConfig(params: {
    displayName?: string
    requiresSandbox?: boolean
    sandboxImage?: string
    buildCommand?: string
    runCommand?: string
  }): void {
    if (params.displayName !== undefined) this.displayName = params.displayName
    if (params.requiresSandbox !== undefined) this.requiresSandbox = params.requiresSandbox
    if (params.sandboxImage !== undefined) this.sandboxImage = params.sandboxImage
    if (params.buildCommand !== undefined) this.buildCommand = params.buildCommand
    if (params.runCommand !== undefined) this.runCommand = params.runCommand
  }
}
