import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { IEmailService } from '../../../../shared/application/email.service.interface.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { AppError } from '../../../../shared/application/app.error.js'
import crypto from 'crypto'

export class ResetPasswordUseCase {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly hashService: IHashService,
        private readonly emailService: IEmailService,
        private readonly logger: ILogger
    ) {}

    async execute(userId: string): Promise<void> {
        const user = await this.userRepo.findById(userId)
        if (!user) {
            throw new AppError('NOT_FOUND', 'Không tìm thấy người dùng', 404)
        }

        const rawPassword = crypto.randomBytes(4).toString('hex') // 8 chars
        const passwordHash = await this.hashService.hash(rawPassword)

        user.changePassword(passwordHash)
        await this.userRepo.save(user)

        this.logger.info(`Admin reset password for user ${userId}`)

        if (user.email) {
            const emailContent = `
                <p>Xin chào ${user.fullName || user.email},</p>
                <p>Tài khoản học tập của bạn đã được khởi tạo lại mật khẩu thành công.</p>
                <p>Mật khẩu mới: <span style="font-size: 1.2em; font-family: monospace; color: #d32f2f;">${rawPassword}</span></p>
                <div style="margin-top: 20px; padding: 15px; border-left: 4px solid #f57c00; background-color: #fff3e0;">
                    Vui lòng đăng nhập vào hệ thống và đổi mật khẩu ngay trong lần đăng nhập đầu tiên.
                </div>
                <p>Trân trọng,<br>AITA System.</p>
            `
            await this.emailService.sendEmail(user.email, 'Khôi phục mật khẩu tài khoản AITA', emailContent)
        }
    }
}
