import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import type { ResetPasswordRequestDto } from '../dtos/auth.dto.js'
import { NotFoundError, ValidationError } from '../../../../shared/application/app.error.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import { createHash } from 'node:crypto'
import { PasswordResetAttempts } from '../password-reset-attempts.js'
import { assertEmailEnabled } from '../../../../shared/application/email-policy.js'

export interface ResetPasswordInput {
  dto: ResetPasswordRequestDto
}

export class ResetPasswordUseCase implements IUseCase<ResetPasswordInput, void> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly attempts = new PasswordResetAttempts(),
  ) {}

  async execute({ dto }: ResetPasswordInput): Promise<void> {
    assertEmailEnabled()
    const { email, otp, newPassword } = dto
    
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản với email này')
    }

    if (!user.isActive()) {
      throw new ValidationError('Tài khoản đã bị khoá hoặc chưa kích hoạt')
    }

    await this.attempts.consume(user.id)
    if (!user.resetPasswordOtp || user.resetPasswordOtp !== createHash('sha256').update(otp).digest('hex')) {
      throw new ValidationError('Mã xác thực không hợp lệ')
    }

    if (!user.resetPasswordOtpExpiry || new Date() > user.resetPasswordOtpExpiry) {
      throw new ValidationError('Mã xác thực đã hết hạn')
    }

    const hashedPassword = await this.hashService.hash(newPassword)

    user.changePassword(hashedPassword)
    user.setResetPasswordOtp(null, null)

    await this.userRepository.save(user)
    await this.userRepository.setRequirePasswordChange(user.id, false)
    await this.attempts.clear(user.id)
  }
}
