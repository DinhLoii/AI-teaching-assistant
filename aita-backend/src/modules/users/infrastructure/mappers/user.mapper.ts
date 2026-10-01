import { User } from '../../../auth/domain/entities/user.entity.js'
import type { UserRoleType } from '../../../auth/domain/entities/user.entity.js'

/**
 * Maps between Prisma User model (PascalCase) and Domain User entity (camelCase).
 */

type PrismaUserWithRoles = {
  Id: string
  Email: string | null
  PasswordHash: string | null
  FullName: string | null
  StudentCode: string | null
  LecturerCode: string | null
  Phone: string | null
  Avatar: string | null
  Status: string | null
  LastLoginAt: Date | null
  ResetPasswordOtp: string | null
  ResetPasswordOtpExpiry: Date | null
  UserRole?: Array<{ Role: { RoleName: string | null } | null }> | null
}

export class UserMapper {
  /**
   * Map a Prisma user record (with eager-loaded roles) to a domain User entity.
   */
  static toDomain(raw: PrismaUserWithRoles): User {
    const roles: UserRoleType[] = (raw.UserRole ?? [])
      .map((ur) => ur.Role?.RoleName as UserRoleType)
      .filter(Boolean)

    const user = User.restore(
      raw.Id,
      raw.Email,
      raw.PasswordHash,
      raw.FullName,
      raw.StudentCode,
      raw.LecturerCode,
      raw.Phone,
      raw.Avatar,
      raw.Status as any,
      raw.LastLoginAt,
      raw.ResetPasswordOtp,
      raw.ResetPasswordOtpExpiry,
      roles,
    )
    // Cờ ép đổi mật khẩu lần đầu — gắn ngoài entity (pattern như subjectName ở ExamMapper)
    ;(user as any).requirePasswordChange = (raw as any).RequirePasswordChange ?? false
    return user
  }

  /**
   * Map a domain User entity back to Prisma-compatible create data.
   */
  static toCreateData(user: User): Record<string, unknown> {
    return {
      Id: user.id,
      Email: user.email,
      PasswordHash: user.passwordHash,
      FullName: user.fullName,
      StudentCode: user.studentCode,
      LecturerCode: user.lecturerCode,
      Phone: user.phone,
      Avatar: user.avatar,
      Status: user.status,
      LastLoginAt: user.lastLoginAt,
      ResetPasswordOtp: user.resetPasswordOtp,
      ResetPasswordOtpExpiry: user.resetPasswordOtpExpiry,
    }
  }

  /**
   * Map a domain User entity to Prisma-compatible update data.
   */
  static toUpdateData(user: User): Record<string, unknown> {
    return {
      Email: user.email,
      PasswordHash: user.passwordHash,
      FullName: user.fullName,
      StudentCode: user.studentCode,
      LecturerCode: user.lecturerCode,
      Phone: user.phone,
      Avatar: user.avatar,
      Status: user.status,
      LastLoginAt: user.lastLoginAt,
      ResetPasswordOtp: user.resetPasswordOtp,
      ResetPasswordOtpExpiry: user.resetPasswordOtpExpiry,
    }
  }
}
