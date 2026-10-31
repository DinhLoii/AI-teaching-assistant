import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import type { ForgotPasswordRequestDto } from '../dtos/auth.dto.js'
import { ServiceUnavailableError } from '../../../../shared/application/app.error.js'
import { randomInt, createHash } from 'node:crypto'
import type { IEmailService } from '../../../../shared/application/email.service.interface.js'

export interface ForgotPasswordInput {
  dto: ForgotPasswordRequestDto
}

export class ForgotPasswordUseCase implements IUseCase<ForgotPasswordInput, void> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute({ dto }: ForgotPasswordInput): Promise<void> {
    const { email } = dto
    
    // 1. Find user by email
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      return
    }

    if (!user.isActive()) {
      return
    }

    // 2. Generate a 6-digit OTP
    const otp = randomInt(100000, 1000000).toString()

    // 3. Set expiry to 10 minutes from now
    const expiry = new Date()
    expiry.setMinutes(expiry.getMinutes() + 10)

    // 4. Update user in DB
    user.setResetPasswordOtp(createHash('sha256').update(otp).digest('hex'), expiry)
    await this.userRepository.save(user)

    // 5. Send Email
    const subject = 'Yêu cầu khôi phục mật khẩu - AITA'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Khôi phục mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với địa chỉ email này.</p>
        <p>Mã xác thực (OTP) của bạn là:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</p>
        <hr />
        <p style="font-size: 12px; color: #888;">Hệ thống Hỗ trợ Giảng dạy AITA</p>
      </div>
    `
    if (!await this.emailService.sendEmail(email, subject, html)) throw new ServiceUnavailableError('Không gửi được email. Vui lòng thử lại sau.')
  }
}
