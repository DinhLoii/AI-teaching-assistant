import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import type { IRefreshTokenRepository } from '../../domain/repositories/refresh-token-repository.interface.js'
import type { ITokenService } from '../../../../shared/application/ports/i-token-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { UnauthorizedError } from '../../../../shared/application/app.error.js'
import type { RefreshTokenRequestDto } from '../dtos/auth.dto.js'
import { AuthResponseDto } from '../dtos/auth.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js'
import { randomUUID, randomBytes } from 'crypto'

export interface RefreshTokenInput {
  dto: RefreshTokenRequestDto
}

export class RefreshTokenUseCase implements IUseCase<RefreshTokenInput, AuthResponseDto> {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly logger: ILogger,
  ) {}

  async execute({ dto }: RefreshTokenInput): Promise<AuthResponseDto> {
    this.logger.info('Attempting to refresh token')

    const currentToken = await this.refreshTokenRepo.findByToken(dto.refreshToken)
    if (!currentToken || !currentToken.isValid() || !currentToken.userId) {
      this.logger.warn('Refresh token is invalid, expired or revoked')
      throw new UnauthorizedError(MESSAGES.AUTH_INVALID_REFRESH_TOKEN)
    }

    const user = await this.userRepo.findById(currentToken.userId)
    if (!user || !user.isActive()) {
      this.logger.warn(`User ${currentToken.userId} not found or inactive during token refresh`)
      throw new UnauthorizedError(MESSAGES.AUTH_INVALID_REFRESH_TOKEN)
    }

    // Revoke old refresh token (Rotation strategy)
    currentToken.revoke()
    await this.refreshTokenRepo.save(currentToken)

    // Generate new tokens
    const primaryRole = user.roles[0] ?? 'STUDENT'
    const newAccessToken = this.tokenService.sign({
      userId: user.id,
      email: user.email ?? '',
      role: primaryRole,
      fullName: user.fullName ?? '',
    })

    const newRefreshTokenString = randomBytes(64).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const newRefreshToken = RefreshToken.create(
      randomUUID(),
      user.id,
      newRefreshTokenString,
      expiresAt
    )
    await this.refreshTokenRepo.save(newRefreshToken)

    this.logger.info(`Successfully refreshed token for user: ${user.id}`)
    return AuthResponseDto.from(newAccessToken, newRefreshTokenString, user, primaryRole)
  }
}
