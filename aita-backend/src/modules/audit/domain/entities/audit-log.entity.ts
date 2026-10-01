import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type AuditActionValue = 'Created' | 'Updated' | 'Deleted' | 'StatusChanged'

// ──────────────────────────────────────────────────────────────
// Entity: AuditLog
// ──────────────────────────────────────────────────────────────

/**
 * Tracks all CRUD and status-change operations for audit trail.
 * Immutable once created — represents a historical record.
 */
export class AuditLog extends AggregateRoot {
  id: string
  entityName: string | null
  entityId: string | null
  action: AuditActionValue | null
  oldValue: string | null
  newValue: string | null
  userId: string | null
  ipAddress: string | null
  createdAt: Date | null

  private constructor(
    id: string,
    entityName: string | null,
    entityId: string | null,
    action: AuditActionValue | null,
    oldValue: string | null,
    newValue: string | null,
    userId: string | null,
    ipAddress: string | null,
    createdAt: Date | null
  ) {
    super()
    this.id = id
    this.entityName = entityName
    this.entityId = entityId
    this.action = action
    this.oldValue = oldValue
    this.newValue = newValue
    this.userId = userId
    this.ipAddress = ipAddress
    this.createdAt = createdAt
  }

  // ── Factory Methods ──

  static create(
    id: string,
    entityName: string,
    entityId: string,
    action: AuditActionValue,
    userId: string,
    params?: {
      oldValue?: string
      newValue?: string
      ipAddress?: string
    }
  ): AuditLog {
    return new AuditLog(
      id, entityName, entityId, action,
      params?.oldValue ?? null,
      params?.newValue ?? null,
      userId,
      params?.ipAddress ?? null,
      new Date()
    )
  }

  static restore(
    id: string,
    entityName: string | null,
    entityId: string | null,
    action: AuditActionValue | null,
    oldValue: string | null,
    newValue: string | null,
    userId: string | null,
    ipAddress: string | null,
    createdAt: Date | null
  ): AuditLog {
    return new AuditLog(id, entityName, entityId, action, oldValue, newValue, userId, ipAddress, createdAt)
  }
}
