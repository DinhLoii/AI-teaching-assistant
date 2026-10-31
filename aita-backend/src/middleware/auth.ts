import type { Request, Response, NextFunction } from 'express'
import { UnauthorizedError, ForbiddenError, ServiceUnavailableError } from '../shared/application/app.error.js'
import { JwtTokenService } from '../shared/infrastructure/jwt-token-service.js'
import { logger } from '../shared/infrastructure/logger.js'
import { prisma } from '../database/prisma.js'
import { credentialVersion } from '../modules/auth/application/credential-version.js'
import type { ITokenService } from '../shared/application/ports/i-token-service.js'

/**
 * Singleton token service used by middleware.
 * Use cases should NOT use this directly — they receive ITokenService via DI.
 */
const tokenService = new JwtTokenService()

/**
 * Express middleware that verifies the Bearer token and attaches user info to `req.user`.
 */
export function createAuthenticate(db: any = prisma, tokens: ITokenService = tokenService) {
return async function authenticateRequest(req: Request, _res: Response, next: NextFunction) {
  let token = '';

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    logger.debug('Authentication failed: Missing or invalid Authorization header')
    return next(new UnauthorizedError())
  }

  try {
    const payload = tokens.verify(token)
    const [user, revocation] = await Promise.all([
      db.user.findUnique({ where: { Id: payload.userId }, select: { Id: true, Status: true, PasswordHash: true, RequirePasswordChange: true, UserRole: { select: { Role: { select: { RoleName: true } } } } } }),
      db.systemConfig.findUnique({ where: { Key: `session_revocation:${payload.userId}` }, select: { Value: true } }),
    ]).catch(() => { throw new ServiceUnavailableError('Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.') })
    if (!user || user.Status?.toUpperCase() !== 'ACTIVE' || payload.credentialVersion !== credentialVersion(user.PasswordHash)
      || !payload.issuedAt || payload.issuedAt <= Number(revocation?.Value || 0)
      || !user.UserRole.some((entry: any) => entry.Role.RoleName.toUpperCase() === payload.role.toUpperCase())) return next(new UnauthorizedError('Phiên đã hết hiệu lực. Vui lòng đăng nhập lại.'))
    if (user.RequirePasswordChange && !['/api/auth/me', '/api/auth/change-password', '/api/auth/logout'].includes(req.originalUrl.split('?')[0])) return next(new ForbiddenError('Vui lòng đổi mật khẩu trước khi tiếp tục'))
    req.user = { id: payload.userId, email: payload.email, role: payload.role.toUpperCase(), fullName: payload.fullName }
    logger.debug('User authenticated successfully', { userId: payload.userId })
    next()
  } catch (error) {
    if (error instanceof ServiceUnavailableError) return next(error)
    logger.debug('Authentication failed: Token verification failed')
    next(new UnauthorizedError('Token không hợp lệ'))
  }
}
}

export const authenticate = createAuthenticate()

/** Reuse HTTP session policy for long-lived transports. */
export async function authenticateLiveToken(token: string) {
  const req = { headers: { authorization: `Bearer ${token}` }, originalUrl: '/api/notifications/stream' } as Request
  let failure: any
  await authenticate(req, {} as Response, (error?: any) => { failure = error })
  if (failure) throw failure
  return req.user!
}

/**
 * Express middleware that checks if the authenticated user has one of the required roles.
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn('Role authorization failed: User not authenticated')
      return next(new UnauthorizedError())
    }
    if (!roles.map(r => r.toLowerCase()).includes(req.user.role.toLowerCase())) {
      logger.warn('Role authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
      })
      return next(new ForbiddenError())
    }
    next()
  }
}
