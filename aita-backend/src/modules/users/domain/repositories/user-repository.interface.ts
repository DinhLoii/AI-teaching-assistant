import type { User, UserRoleType } from '../../../auth/domain/entities/user.entity.js'

/**
 * User repository port — domain-owned interface.
 * NO Prisma types allowed. All methods work with domain User entity.
 */

export interface UserFilter {
  role?: UserRoleType
  status?: string
  search?: string
  ids?: string[]
}

export interface Pagination {
  skip?: number
  take?: number
}

export interface RoleInfo {
  id: string
  name: string
}

/** Outcome of a bulk delete: ids already gone are skipped, not failures. */
export interface BulkDeleteResult {
  deleted: string[]
  skipped: string[]
  failed: Array<{ id: string; reason: string }>
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  findMany(filter?: UserFilter, pagination?: Pagination): Promise<User[]>
  save(user: User): Promise<void>
  create(user: User): Promise<void>
  delete(id: string): Promise<void>
  deleteMany(ids: string[]): Promise<BulkDeleteResult>
  count(filter?: UserFilter): Promise<number>
  findRoleByName(name: string): Promise<RoleInfo | null>
  assignRole(userId: string, roleId: string): Promise<void>
  setRequirePasswordChange(userId: string, value: boolean): Promise<void>
}
