import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate } from '../../../middleware/auth.js'
import { uploadAvatarMiddleware } from '../../../middleware/upload.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { AuthController } from './auth.controller.js'

export class AuthRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const authController = container.get<AuthController>(TOKENS.AuthController)

    this.router.post('/login', asyncHandler((req, res) => authController.login(req, res)))
    this.router.post('/register', asyncHandler((req, res) => authController.register(req, res)))
    this.router.post('/refresh-token', asyncHandler((req, res) => authController.refreshToken(req, res)))
    
    this.router.get('/me', authenticate, asyncHandler((req, res) => authController.getMe(req, res)))
    this.router.patch('/profile', authenticate, uploadAvatarMiddleware.single('avatar'), asyncHandler((req, res) => authController.updateProfile(req, res)))
    this.router.post('/change-password', authenticate, asyncHandler((req, res) => authController.changePassword(req, res)))
    this.router.post('/forgot-password', asyncHandler((req, res) => authController.forgotPassword(req, res)))
    this.router.post('/reset-password', asyncHandler((req, res) => authController.resetPassword(req, res)))
    this.router.post('/dismiss-password-change', authenticate, asyncHandler((req, res) => authController.dismissPasswordChange(req, res)))
    this.router.post('/logout', authenticate, asyncHandler((req, res) => authController.logout(req, res)))
  }
}
