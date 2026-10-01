import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import type { IActivityRepository } from '../../domain/repositories/activity-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { ITokenService } from '../../../../shared/application/ports/i-token-service.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { User } from '../../domain/entities/user.entity.js'
import type { RegisterStudentRequestDto } from '../dtos/auth.dto.js'
import { AuthResponseDto } from '../dtos/auth.dto.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js'
import type { IRefreshTokenRepository } from '../../domain/repositories/refresh-token-repository.interface.js'
import { randomBytes } from 'crypto'

export interface RegisterInput {
  dto: RegisterStudentRequestDto
}

export class RegisterStudentUseCase implements IUseCase<RegisterInput, AuthResponseDto> {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly uow: IUnitOfWork,
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly logger: ILogger,
  ) {}

  async execute({ dto }: RegisterInput): Promise<AuthResponseDto> {
    this.logger.info(`Attempting student registration for email: ${dto.email}`)

    const existingUser = await this.userRepo.findByEmail(dto.email)
    if (existingUser) {
      this.logger.warn(`Registration failed: Email already in use: ${dto.email}`)
      throw new ConflictError(MESSAGES.AUTH_EMAIL_IN_USE)
    }

    const hashedPassword = await this.hashService.hash(dto.password)

    return this.uow.runInTransaction(async (txUow) => {
      // Create domain entity via factory method
      const user = User.create(
        randomUUID(),
        dto.email.toLowerCase(),
        dto.fullName,
        hashedPassword,
        'STUDENT',
      )

      const txUserRepo = txUow.resolve<IUserRepository>(TOKENS.UserRepository)
      const txActivityRepo = txUow.resolve<IActivityRepository>(TOKENS.ActivityRepository)

      this.logger.info('Creating user in transaction')
      await txUserRepo.create(user)

      // Assign STUDENT role
      const studentRole = await txUserRepo.findRoleByName('STUDENT')
      if (studentRole) {
        this.logger.info(`Assigning STUDENT role to user: ${user.id}`)
        await txUserRepo.assignRole(user.id, studentRole.id)
      } else {
        this.logger.warn('STUDENT role not found in database')
      }

      // Audit trail
      await txActivityRepo.create({
        userId: user.id,
        action: 'STUDENT_REGISTER',
        entity: 'User',
        entityId: user.id,
      })

      const token = this.tokenService.sign({
        userId: user.id,
        email: user.email ?? '',
        role: 'STUDENT',
        fullName: user.fullName ?? '',
      })

      const txRefreshTokenRepo = txUow.resolve<IRefreshTokenRepository>(TOKENS.RefreshTokenRepository)
      const refreshTokenString = randomBytes(64).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const refreshToken = RefreshToken.create(
        randomUUID(),
        user.id,
        refreshTokenString,
        expiresAt
      )
      await txRefreshTokenRepo.save(refreshToken)

      this.logger.info(`Student registered successfully: ${user.id}`)
      return AuthResponseDto.from(token, refreshTokenString, user, 'STUDENT')
    })
  }
}
