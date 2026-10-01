import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class RefreshTokenCreatedEvent extends DomainEvent {
  constructor(
    public readonly tokenId: string,
    public readonly userId: string | null
  ) {
    super('RefreshTokenCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      tokenId: this.tokenId,
      userId: this.userId,
      occurredAt: this.occurredAt,
    }
  }
}

export class RefreshTokenRevokedEvent extends DomainEvent {
  constructor(public readonly tokenId: string) {
    super('RefreshTokenRevokedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      tokenId: this.tokenId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: RefreshToken
// ──────────────────────────────────────────────────────────────

/**
 * Manages refresh token lifecycle with expiry and revocation logic.
 */
export class RefreshToken extends AggregateRoot {
  id: string
  userId: string | null
  token: string | null
  expiresAt: Date | null
  isRevoked: boolean | null

  private constructor(
    id: string,
    userId: string | null,
    token: string | null,
    expiresAt: Date | null,
    isRevoked: boolean | null
  ) {
    super()
    this.id = id
    this.userId = userId
    this.token = token
    this.expiresAt = expiresAt
    this.isRevoked = isRevoked
  }

  // ── Factory Methods ──

  static create(
    id: string,
    userId: string,
    token: string,
    expiresAt: Date
  ): RefreshToken {
    const refreshToken = new RefreshToken(id, userId, token, expiresAt, false)
    refreshToken.addDomainEvent(new RefreshTokenCreatedEvent(refreshToken.id, refreshToken.userId))
    return refreshToken
  }

  static restore(
    id: string,
    userId: string | null,
    token: string | null,
    expiresAt: Date | null,
    isRevoked: boolean | null
  ): RefreshToken {
    return new RefreshToken(id, userId, token, expiresAt, isRevoked)
  }

  // ── Business Logic ──

  isExpired(): boolean {
    if (!this.expiresAt) return true
    return new Date() > this.expiresAt
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired()
  }

  revoke(): void {
    this.isRevoked = true
    this.addDomainEvent(new RefreshTokenRevokedEvent(this.id))
  }
}
