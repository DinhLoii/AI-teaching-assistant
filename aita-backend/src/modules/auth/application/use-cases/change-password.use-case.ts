import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { UnauthorizedError, NotFoundError } from '../../../../shared/application/app.error.js'
import type { ChangePasswordRequestDto } from '../dtos/auth.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export interface ChangePasswordInput {
  userId: string
  dto: ChangePasswordRequestDto
}

export class ChangePasswordUseCase implements IUseCase<ChangePasswordInput, void> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hashService: IHashService,
    private readonly logger: ILogger,
  ) {}

  async execute({ userId, dto }: ChangePasswordInput): Promise<void> {
    this.logger.info(`User ${userId} attempting to change password`)

    const user = await this.userRepo.findById(userId)
    if (!user || !user.isActive()) {
      throw new NotFoundError(MESSAGES.USER_NOT_FOUND)
    }

    if (!user.passwordHash || !(await this.hashService.compare(dto.oldPassword, user.passwordHash))) {
      this.logger.warn(`Change password failed: Wrong old password for user ${userId}`)
      throw new UnauthorizedError(MESSAGES.AUTH_WRONG_OLD_PASSWORD)
    }

    const hashedNewPassword = await this.hashService.hash(dto.newPassword)
    user.changePassword(hashedNewPassword)
    await this.userRepo.save(user)
    // Đã tự đổi mật khẩu → gỡ cờ ép đổi lần đầu (đặt bởi luồng import sinh viên)
    await this.userRepo.setRequirePasswordChange(userId, false)

    this.logger.info(`Password successfully changed for user ${userId}`)
  }
}
