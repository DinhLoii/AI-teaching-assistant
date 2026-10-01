import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type UserStatusType = 'Active' | 'Inactive' | 'Suspended'
export type UserRoleType = 'ADMIN' | 'LECTURER' | 'STUDENT'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string | null
  ) {
    super('UserCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      email: this.email,
      occurredAt: this.occurredAt,
    }
  }
}

export class UserDeactivatedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super('UserDeactivatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      occurredAt: this.occurredAt,
    }
  }
}

export class UserSuspendedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super('UserSuspendedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      occurredAt: this.occurredAt,
    }
  }
}

export class UserLoginEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string | null
  ) {
    super('UserLoginEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      userId: this.userId,
      email: this.email,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: User
// ──────────────────────────────────────────────────────────────

/**
 * Core user entity mapped to Prisma User model.
 * Fields use camelCase (Prisma uses PascalCase).
 */
export class User extends AggregateRoot {
  id: string
  email: string | null
  passwordHash: string | null
  fullName: string | null
  studentCode: string | null
  lecturerCode: string | null
  phone: string | null
  avatar: string | null
  status: UserStatusType | null
  lastLoginAt: Date | null
  resetPasswordOtp: string | null
  resetPasswordOtpExpiry: Date | null
  roles: UserRoleType[]

  private constructor(
    id: string,
    email: string | null,
    passwordHash: string | null,
    fullName: string | null,
    studentCode: string | null,
    lecturerCode: string | null,
    phone: string | null,
    avatar: string | null,
    status: UserStatusType | null,
    lastLoginAt: Date | null,
    resetPasswordOtp: string | null,
    resetPasswordOtpExpiry: Date | null,
    roles: UserRoleType[]
  ) {
    super()
    this.id = id
    this.email = email
    this.passwordHash = passwordHash
    this.fullName = fullName
    this.studentCode = studentCode
    this.lecturerCode = lecturerCode
    this.phone = phone
    this.avatar = avatar
    this.status = status
    this.lastLoginAt = lastLoginAt
    this.resetPasswordOtp = resetPasswordOtp
    this.resetPasswordOtpExpiry = resetPasswordOtpExpiry
    this.roles = roles
  }

  // ── Factory Methods ──

  static create(
    id: string,
    email: string,
    fullName: string,
    passwordHash: string,
    role: UserRoleType = 'STUDENT'
  ): User {
    const user = new User(
      id, email, passwordHash, fullName,
      null, null, null, null, 'Active', null, null, null, [role]
    )
    user.addDomainEvent(new UserCreatedEvent(user.id, user.email))
    return user
  }

  static restore(
    id: string,
    email: string | null,
    passwordHash: string | null,
    fullName: string | null,
    studentCode: string | null,
    lecturerCode: string | null,
    phone: string | null,
    avatar: string | null,
    status: UserStatusType | null,
    lastLoginAt: Date | null,
    resetPasswordOtp: string | null,
    resetPasswordOtpExpiry: Date | null,
    roles: UserRoleType[]
  ): User {
    return new User(id, email, passwordHash, fullName, studentCode, lecturerCode, phone, avatar, status, lastLoginAt, resetPasswordOtp, resetPasswordOtpExpiry, roles)
  }

  // ── Business Logic ──

  isActive(): boolean {
    return this.status?.toLowerCase() === 'active'
  }

  isAdmin(): boolean {
    return this.roles.includes('ADMIN')
  }

  isLecturer(): boolean {
    return this.roles.includes('LECTURER')
  }

  isStudent(): boolean {
    return this.roles.includes('STUDENT')
  }

  hasRole(role: UserRoleType): boolean {
    return this.roles.includes(role)
  }

  recordLogin(): void {
    this.lastLoginAt = new Date()
    this.addDomainEvent(new UserLoginEvent(this.id, this.email))
  }

  updateProfile(params: {
    fullName?: string
    phone?: string
    avatar?: string
    studentCode?: string
    lecturerCode?: string
  }): void {
    if (params.fullName !== undefined) this.fullName = params.fullName
    if (params.phone !== undefined) this.phone = params.phone
    if (params.avatar !== undefined) this.avatar = params.avatar
    if (params.studentCode !== undefined) this.studentCode = params.studentCode
    if (params.lecturerCode !== undefined) this.lecturerCode = params.lecturerCode
  }

  deactivate(): void {
    this.status = 'Inactive'
    this.addDomainEvent(new UserDeactivatedEvent(this.id))
  }

  suspend(): void {
    this.status = 'Suspended'
    this.addDomainEvent(new UserSuspendedEvent(this.id))
  }

  activate(): void {
    this.status = 'Active'
  }

  changePassword(newHash: string): void {
    this.passwordHash = newHash
  }

  setResetPasswordOtp(otp: string | null, expiry: Date | null): void {
    this.resetPasswordOtp = otp
    this.resetPasswordOtpExpiry = expiry
  }

  assignRole(role: UserRoleType): void {
    if (!this.roles.includes(role)) {
      this.roles.push(role)
    }
  }

  removeRole(role: UserRoleType): void {
    this.roles = this.roles.filter(r => r !== role)
  }
}
