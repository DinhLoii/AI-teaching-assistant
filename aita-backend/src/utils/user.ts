import type { User as PrismaUser, UserRole as PrismaUserRole, Role } from '@prisma/client'

type UserWithRoles = PrismaUser & { UserRole: (PrismaUserRole & { Role: Role })[] }

export function toPublicUser(u: UserWithRoles) {
  const { PasswordHash: _, ...rest } = u
  const primaryRole = u.UserRole?.[0]?.Role?.RoleName ?? 'STUDENT'
  return {
    ...rest,
    name: u.FullName,
    role: primaryRole.toLowerCase(),
    status: u.Status?.toLowerCase() ?? 'active',
  }
}
