import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import type { ITokenService } from '../../../../shared/application/ports/i-token-service.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import type { IRefreshTokenRepository } from '../../domain/repositories/refresh-token-repository.interface.js'
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js'
import { randomUUID, randomBytes } from 'crypto'
import { UnauthorizedError } from '../../../../shared/application/app.error.js'
import type { LoginRequestDto } from '../dtos/auth.dto.js'
import { AuthResponseDto } from '../dtos/auth.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export interface LoginInput {
  dto: LoginRequestDto
}

export class LoginUseCase implements IUseCase<LoginInput, AuthResponseDto> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly logger: ILogger,
  ) {}

  async execute({ dto }: LoginInput): Promise<AuthResponseDto> {
    this.logger.info(`Login attempt for email: ${dto.email}`)

    const user = await this.userRepo.findByEmail(dto.email)
    if (!user || !user.isActive()) {
      this.logger.warn(`Login failed: User not found or inactive for email: ${dto.email}`)
      throw new UnauthorizedError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    if (!user.passwordHash || !(await this.hashService.compare(dto.password, user.passwordHash))) {
      this.logger.warn(`Login failed: Invalid password for user: ${user.id}`)
      throw new UnauthorizedError(MESSAGES.AUTH_INVALID_CREDENTIALS)
    }

    // Record login via domain logic
    user.recordLogin()
    await this.userRepo.save(user)

    const primaryRole = user.roles[0] ?? 'STUDENT'
    const token = this.tokenService.sign({
      userId: user.id,
      email: user.email ?? '',
      role: primaryRole,
      fullName: user.fullName ?? '',
    })

    const refreshTokenString = randomBytes(64).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days valid

    const refreshToken = RefreshToken.create(
      randomUUID(),
      user.id,
      refreshTokenString,
      expiresAt
    )
    await this.refreshTokenRepo.save(refreshToken)

    this.logger.info(`Login successful for user: ${user.id}`)
    return AuthResponseDto.from(token, refreshTokenString, user, primaryRole)
  }
}
