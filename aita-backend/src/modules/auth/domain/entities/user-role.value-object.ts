import { DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class UserRoleAssignedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly roleId: string
  ) {
    super('UserRoleAssignedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      roleId: this.roleId,
      occurredAt: this.occurredAt,
    }
  }
}

export class UserRoleRemovedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly roleId: string
  ) {
    super('UserRoleRemovedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      roleId: this.roleId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Value Object: UserRole (junction table)
// ──────────────────────────────────────────────────────────────

/**
 * Represents the User-Role junction table.
 * Composite key: (userId, roleId).
 */
export class UserRole {
  readonly userId: string
  readonly roleId: string
  readonly assignedAt: Date | null

  private constructor(userId: string, roleId: string, assignedAt: Date | null) {
    this.userId = userId
    this.roleId = roleId
    this.assignedAt = assignedAt
  }

  static create(userId: string, roleId: string): UserRole {
    return new UserRole(userId, roleId, new Date())
  }

  static restore(userId: string, roleId: string, assignedAt: Date | null): UserRole {
    return new UserRole(userId, roleId, assignedAt)
  }

  equals(other: UserRole): boolean {
    return this.userId === other.userId && this.roleId === other.roleId
  }

  toJSON() {
    return {
      userId: this.userId,
      roleId: this.roleId,
      assignedAt: this.assignedAt,
    }
  }
}
