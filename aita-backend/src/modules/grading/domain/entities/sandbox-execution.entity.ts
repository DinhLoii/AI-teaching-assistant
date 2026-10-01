import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type SandboxStatusValue = 'Running' | 'Completed' | 'Failed' | 'Timeout' | 'Killed'

// ──────────────────────────────────────────────────────────────
// Entity: SandboxExecution
// ──────────────────────────────────────────────────────────────

/**
 * Represents a sandboxed execution environment for running student code.
 * Tracks container lifecycle, resource usage, and execution logs.
 */
export class SandboxExecution extends AggregateRoot {
  id: string
  gradingSessionId: string | null
  containerId: string | null
  sandboxImage: string | null
  status: SandboxStatusValue | null
  exitCode: number | null
  cpuTimeMs: bigint | null
  peakMemoryKb: bigint | null
  networkDisabled: boolean | null
  startedAt: Date | null
  finishedAt: Date | null
  runLog: string | null

  private constructor(
    id: string,
    gradingSessionId: string | null,
    containerId: string | null,
    sandboxImage: string | null,
    status: SandboxStatusValue | null,
    exitCode: number | null,
    cpuTimeMs: bigint | null,
    peakMemoryKb: bigint | null,
    networkDisabled: boolean | null,
    startedAt: Date | null,
    finishedAt: Date | null,
    runLog: string | null
  ) {
    super()
    this.id = id
    this.gradingSessionId = gradingSessionId
    this.containerId = containerId
    this.sandboxImage = sandboxImage
    this.status = status
    this.exitCode = exitCode
    this.cpuTimeMs = cpuTimeMs
    this.peakMemoryKb = peakMemoryKb
    this.networkDisabled = networkDisabled
    this.startedAt = startedAt
    this.finishedAt = finishedAt
    this.runLog = runLog
  }

  // ── Factory Methods ──

  static create(
    id: string,
    gradingSessionId: string,
    sandboxImage: string,
    params?: {
      networkDisabled?: boolean
    }
  ): SandboxExecution {
    return new SandboxExecution(
      id, gradingSessionId, null, sandboxImage,
      'Running', null, null, null,
      params?.networkDisabled ?? true,
      new Date(), null, null
    )
  }

  static restore(
    id: string,
    gradingSessionId: string | null,
    containerId: string | null,
    sandboxImage: string | null,
    status: SandboxStatusValue | null,
    exitCode: number | null,
    cpuTimeMs: bigint | null,
    peakMemoryKb: bigint | null,
    networkDisabled: boolean | null,
    startedAt: Date | null,
    finishedAt: Date | null,
    runLog: string | null
  ): SandboxExecution {
    return new SandboxExecution(
      id, gradingSessionId, containerId, sandboxImage,
      status, exitCode, cpuTimeMs, peakMemoryKb,
      networkDisabled, startedAt, finishedAt, runLog
    )
  }

  // ── Business Logic ──

  assignContainer(containerId: string): void {
    this.containerId = containerId
  }

  complete(exitCode: number, runLog: string, cpuTimeMs?: bigint, peakMemoryKb?: bigint): void {
    this.status = 'Completed'
    this.exitCode = exitCode
    this.runLog = runLog
    this.finishedAt = new Date()
    if (cpuTimeMs !== undefined) this.cpuTimeMs = cpuTimeMs
    if (peakMemoryKb !== undefined) this.peakMemoryKb = peakMemoryKb
  }

  fail(exitCode: number, runLog: string): void {
    this.status = 'Failed'
    this.exitCode = exitCode
    this.runLog = runLog
    this.finishedAt = new Date()
  }

  timeout(): void {
    this.status = 'Timeout'
    this.finishedAt = new Date()
  }

  kill(): void {
    this.status = 'Killed'
    this.finishedAt = new Date()
  }

  isRunning(): boolean {
    return this.status === 'Running'
  }

  isCompleted(): boolean {
    return this.status === 'Completed'
  }

  getDurationMs(): number | null {
    if (!this.startedAt || !this.finishedAt) return null
    return this.finishedAt.getTime() - this.startedAt.getTime()
  }
}
