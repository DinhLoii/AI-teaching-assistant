import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { LoginUseCase } from '../application/use-cases/login.use-case.js'
import { RegisterStudentUseCase } from '../application/use-cases/register.use-case.js'
import { GetMeUseCase } from '../application/use-cases/get-me.use-case.js'
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case.js'
import { LogoutUseCase } from '../application/use-cases/logout.use-case.js'
import { ChangePasswordUseCase } from '../application/use-cases/change-password.use-case.js'
import { ForgotPasswordUseCase } from '../application/use-cases/forgot-password.use-case.js'
import { ResetPasswordUseCase } from '../application/use-cases/reset-password.use-case.js'
import { UpdateProfileUseCase } from '../application/use-cases/update-profile.use-case.js'
import { DismissPasswordChangeUseCase } from '../application/use-cases/dismiss-password-change.use-case.js'
import { LoginRequestDto, RegisterStudentRequestDto, RefreshTokenRequestDto, LogoutRequestDto, ChangePasswordRequestDto, UpdateProfileRequestDto, ForgotPasswordRequestDto, ResetPasswordRequestDto } from '../application/dtos/auth.dto.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class AuthController extends BaseController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerStudentUseCase: RegisterStudentUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly dismissPasswordChangeUseCase: DismissPasswordChangeUseCase,
    private readonly logger: ILogger,
  ) {
    super()
  }

  async login(req: Request, res: Response): Promise<void> {
    this.logger.info('Received login request')
    const dto = LoginRequestDto.from(req.body)
    const result = await this.loginUseCase.execute({ dto })
    this.ok(res, result, MESSAGES.AUTH_LOGIN_SUCCESS)
  }

  async register(req: Request, res: Response): Promise<void> {
    this.logger.info('Received student registration request')
    const dto = RegisterStudentRequestDto.from(req.body)
    const result = await this.registerStudentUseCase.execute({ dto })
    this.created(res, result, MESSAGES.AUTH_REGISTER_SUCCESS)
  }

  async getMe(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received getMe request for user: ${req.user?.id}`)
    const result = await this.getMeUseCase.execute(req.user!.id)
    this.ok(res, result, MESSAGES.AUTH_GET_ME_SUCCESS)
  }

  async logout(req: Request, res: Response): Promise<void> {
    this.logger.info('Received logout request')
    const dto = LogoutRequestDto.from(req.body)
    await this.logoutUseCase.execute({ dto })
    this.ok(res, null, MESSAGES.AUTH_LOGOUT_SUCCESS)
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    this.logger.info('Received refresh token request')
    const dto = RefreshTokenRequestDto.from(req.body)
    const result = await this.refreshTokenUseCase.execute({ dto })
    this.ok(res, result, MESSAGES.AUTH_REFRESH_SUCCESS)
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received change password request for user: ${req.user?.id}`)
    const dto = ChangePasswordRequestDto.from(req.body)
    await this.changePasswordUseCase.execute({ userId: req.user!.id, dto })
    this.ok(res, null, MESSAGES.AUTH_PASSWORD_CHANGED_SUCCESS)
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received update profile request for user: ${req.user?.id}`)
    const dto = UpdateProfileRequestDto.from(req.body)
    
    // If an avatar was uploaded, req.file will be populated
    // We map the avatarUrl to the static route
    let avatarUrl: string | undefined = undefined
    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`
    }

    const result = await this.updateProfileUseCase.execute({ 
      userId: req.user!.id, 
      dto,
      avatarUrl
    })
    
    // AuthResponseDto contains the updated user
    this.ok(res, result.user, 'Cập nhật hồ sơ thành công')
  }

  async dismissPasswordChange(req: Request, res: Response): Promise<void> {
    this.logger.info(`Received dismiss password change request for user: ${req.user?.id}`)
    await this.dismissPasswordChangeUseCase.execute(req.user!.id)
    this.ok(res, null, 'Bỏ qua đổi mật khẩu thành công')
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    this.logger.info('Received forgot password request')
    const dto = ForgotPasswordRequestDto.from(req.body)
    await this.forgotPasswordUseCase.execute({ dto })
    this.ok(res, null, 'Mã xác thực đã được gửi đến email của bạn')
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    this.logger.info('Received reset password request')
    const dto = ResetPasswordRequestDto.from(req.body)
    await this.resetPasswordUseCase.execute({ dto })
    this.ok(res, null, 'Đổi mật khẩu thành công')
  }
}
