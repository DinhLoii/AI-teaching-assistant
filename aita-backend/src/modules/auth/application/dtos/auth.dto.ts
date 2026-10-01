import { z } from 'zod'
import { User } from '../../domain/entities/user.entity.js'

export class LoginRequestDto {
  email!: string
  password!: string

  static readonly schema = z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(6, 'Mật khẩu phải chứa ít nhất 6 ký tự'),
  })

  static from(data: unknown): LoginRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new LoginRequestDto()
    dto.email = parsed.email
    dto.password = parsed.password
    return dto
  }
}

export class RegisterStudentRequestDto {
  email!: string
  password!: string
  fullName!: string
  externalId?: string

  static readonly schema = z.object({
    email: z
      .string()
      .email('Email không hợp lệ')
      .refine(
        (e) => e.toLowerCase().endsWith('@gmail.com'),
        'Chỉ chấp nhận email Gmail (@gmail.com)',
      ),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
    externalId: z.string().optional(),
  })

  static from(data: unknown): RegisterStudentRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new RegisterStudentRequestDto()
    dto.email = parsed.email
    dto.password = parsed.password
    dto.fullName = parsed.fullName
    dto.externalId = parsed.externalId
    return dto
  }
}

export class RefreshTokenRequestDto {
  refreshToken!: string

  static readonly schema = z.object({
    refreshToken: z.string().min(1, 'Refresh token là bắt buộc'),
  })

  static from(data: unknown): RefreshTokenRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new RefreshTokenRequestDto()
    dto.refreshToken = parsed.refreshToken
    return dto
  }
}

export class LogoutRequestDto {
  refreshToken!: string

  static readonly schema = z.object({
    refreshToken: z.string().min(1, 'Refresh token là bắt buộc'),
  })

  static from(data: unknown): LogoutRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new LogoutRequestDto()
    dto.refreshToken = parsed.refreshToken
    return dto
  }
}

export class ChangePasswordRequestDto {
  oldPassword!: string
  newPassword!: string

  static readonly schema = z.object({
    oldPassword: z.string().min(1, 'Mật khẩu cũ là bắt buộc'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  })

  static from(data: unknown): ChangePasswordRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new ChangePasswordRequestDto()
    dto.oldPassword = parsed.oldPassword
    dto.newPassword = parsed.newPassword
    return dto
  }
}

export class ForgotPasswordRequestDto {
  email!: string

  static readonly schema = z.object({
    email: z.string().email('Email không hợp lệ'),
  })

  static from(data: unknown): ForgotPasswordRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new ForgotPasswordRequestDto()
    dto.email = parsed.email
    return dto
  }
}

export class ResetPasswordRequestDto {
  email!: string
  otp!: string
  newPassword!: string

  static readonly schema = z.object({
    email: z.string().email('Email không hợp lệ'),
    otp: z.string().length(6, 'Mã xác thực phải gồm 6 chữ số'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  })

  static from(data: unknown): ResetPasswordRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new ResetPasswordRequestDto()
    dto.email = parsed.email
    dto.otp = parsed.otp
    dto.newPassword = parsed.newPassword
    return dto
  }
}

export class UpdateProfileRequestDto {
  fullName?: string
  phone?: string

  static readonly schema = z.object({
    fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
  })

  static from(data: unknown): UpdateProfileRequestDto {
    const parsed = this.schema.parse(data)
    const dto = new UpdateProfileRequestDto()
    if (parsed.fullName) dto.fullName = parsed.fullName
    if (parsed.phone) dto.phone = parsed.phone
    return dto
  }
}

export class AuthResponseDto {
  token!: string
  refreshToken!: string
  user!: {
    id: string
    email: string | null
    fullName: string | null
    studentCode: string | null
    lecturerCode: string | null
    phone: string | null
    avatar: string | null
    role: string
    status: string | null
    requirePasswordChange: boolean
  }

  static from(token: string, refreshToken: string, user: User, primaryRole?: string): AuthResponseDto {
    const dto = new AuthResponseDto()
    dto.token = token
    dto.refreshToken = refreshToken
    
    // Default to the first assigned role or 'STUDENT'
    const role = primaryRole || user.roles[0] || 'STUDENT'

    dto.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      studentCode: user.studentCode,
      lecturerCode: user.lecturerCode,
      phone: user.phone,
      avatar: user.avatar,
      role: role.toLowerCase(),
      status: (user.status || 'active').toLowerCase(),
      requirePasswordChange: (user as any).requirePasswordChange ?? false
    }
    return dto
  }
}
