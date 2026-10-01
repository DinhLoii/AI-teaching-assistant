import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class ImportBatchCreatedEvent extends DomainEvent {
  constructor(
    public readonly batchId: string,
    public readonly fileName: string | null
  ) {
    super('ImportBatchCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      batchId: this.batchId,
      fileName: this.fileName,
      occurredAt: this.occurredAt,
    }
  }
}

export class ImportBatchCompletedEvent extends DomainEvent {
  constructor(
    public readonly batchId: string,
    public readonly successCount: number,
    public readonly errorCount: number
  ) {
    super('ImportBatchCompletedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      batchId: this.batchId,
      successCount: this.successCount,
      errorCount: this.errorCount,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Entity: ImportBatch
// ──────────────────────────────────────────────────────────────

/**
 * Tracks a batch import operation (e.g., importing students from CSV).
 */
export class ImportBatch extends AggregateRoot {
  id: string
  fileName: string | null
  fileUrl: string | null
  status: string | null
  totalRows: number | null
  successCount: number | null
  errorCount: number | null
  errorDetails: string | null
  importedBy: string | null

  private constructor(
    id: string,
    fileName: string | null,
    fileUrl: string | null,
    status: string | null,
    totalRows: number | null,
    successCount: number | null,
    errorCount: number | null,
    errorDetails: string | null,
    importedBy: string | null
  ) {
    super()
    this.id = id
    this.fileName = fileName
    this.fileUrl = fileUrl
    this.status = status
    this.totalRows = totalRows
    this.successCount = successCount
    this.errorCount = errorCount
    this.errorDetails = errorDetails
    this.importedBy = importedBy
  }

  // ── Factory Methods ──

  static create(
    id: string,
    fileName: string,
    fileUrl: string,
    importedBy: string
  ): ImportBatch {
    const batch = new ImportBatch(id, fileName, fileUrl, 'Processing', null, 0, 0, null, importedBy)
    batch.addDomainEvent(new ImportBatchCreatedEvent(batch.id, batch.fileName))
    return batch
  }

  static restore(
    id: string,
    fileName: string | null,
    fileUrl: string | null,
    status: string | null,
    totalRows: number | null,
    successCount: number | null,
    errorCount: number | null,
    errorDetails: string | null,
    importedBy: string | null
  ): ImportBatch {
    return new ImportBatch(id, fileName, fileUrl, status, totalRows, successCount, errorCount, errorDetails, importedBy)
  }

  // ── Business Logic ──

  setTotalRows(total: number): void {
    this.totalRows = total
  }

  recordSuccess(count: number): void {
    this.successCount = (this.successCount ?? 0) + count
  }

  recordError(count: number, details?: string): void {
    this.errorCount = (this.errorCount ?? 0) + count
    if (details) {
      this.errorDetails = this.errorDetails
        ? `${this.errorDetails}\n${details}`
        : details
    }
  }

  complete(): void {
    this.status = 'Completed'
    this.addDomainEvent(
      new ImportBatchCompletedEvent(
        this.id,
        this.successCount ?? 0,
        this.errorCount ?? 0
      )
    )
  }

  fail(errorDetails: string): void {
    this.status = 'Failed'
    this.errorDetails = errorDetails
  }

  isCompleted(): boolean {
    return this.status === 'Completed'
  }

  isFailed(): boolean {
    return this.status === 'Failed'
  }

  getSuccessRate(): number {
    if (!this.totalRows || this.totalRows === 0) return 0
    return (this.successCount ?? 0) / this.totalRows
  }
}
