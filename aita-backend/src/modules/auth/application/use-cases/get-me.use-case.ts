import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { UnauthorizedError } from '../../../../shared/application/app.error.js'
import { UserResponseDto } from '../../../users/application/dtos/user.dto.js'

export class GetMeUseCase implements IUseCase<string, UserResponseDto> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(userId: string): Promise<UserResponseDto> {
    this.logger.info(`Fetching current user details for user ID: ${userId}`)

    const user = await this.userRepo.findById(userId)
    if (!user) {
      this.logger.warn(`User not found for ID: ${userId}`)
      throw new UnauthorizedError()
    }

    return UserResponseDto.from(user)
  }
}
