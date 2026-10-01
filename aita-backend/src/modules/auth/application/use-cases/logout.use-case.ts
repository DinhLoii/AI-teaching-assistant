import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IRefreshTokenRepository } from '../../domain/repositories/refresh-token-repository.interface.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import type { LogoutRequestDto } from '../dtos/auth.dto.js'

export interface LogoutInput {
  dto: LogoutRequestDto
}

export class LogoutUseCase implements IUseCase<LogoutInput, void> {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly logger: ILogger,
  ) {}

  async execute({ dto }: LogoutInput): Promise<void> {
    this.logger.info('Attempting to logout and revoke token')

    const currentToken = await this.refreshTokenRepo.findByToken(dto.refreshToken)
    if (currentToken && !currentToken.isRevoked) {
      currentToken.revoke()
      await this.refreshTokenRepo.save(currentToken)
      this.logger.info(`Successfully revoked refresh token id: ${currentToken.id}`)
    } else {
      this.logger.warn('Token not found or already revoked during logout')
    }
  }
}
