import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Entity: Role
// ──────────────────────────────────────────────────────────────

/**
 * Represents a system role (ADMIN, LECTURER, STUDENT).
 */
export class Role extends AggregateRoot {
  id: string
  roleName: string | null

  private constructor(id: string, roleName: string | null) {
    super()
    this.id = id
    this.roleName = roleName
  }

  static create(id: string, roleName: string): Role {
    return new Role(id, roleName)
  }

  static restore(id: string, roleName: string | null): Role {
    return new Role(id, roleName)
  }

  isAdmin(): boolean {
    return this.roleName === 'ADMIN'
  }

  isLecturer(): boolean {
    return this.roleName === 'LECTURER'
  }

  isStudent(): boolean {
    return this.roleName === 'STUDENT'
  }

  rename(newName: string): void {
    this.roleName = newName
  }
}
