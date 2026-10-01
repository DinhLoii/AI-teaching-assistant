import type { Request, Response, NextFunction } from 'express'
import { UnauthorizedError, ForbiddenError } from '../shared/application/app.error.js'
import { JwtTokenService } from '../shared/infrastructure/jwt-token-service.js'
import { logger } from '../shared/infrastructure/logger.js'

/**
 * Singleton token service used by middleware.
 * Use cases should NOT use this directly — they receive ITokenService via DI.
 */
const tokenService = new JwtTokenService()

/**
 * Express middleware that verifies the Bearer token and attaches user info to `req.user`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  let token = '';

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    logger.debug('Authentication failed: Missing or invalid Authorization header')
    return next(new UnauthorizedError())
  }

  try {
    const payload = tokenService.verify(token)
    req.user = { id: payload.userId, email: payload.email, role: payload.role, fullName: payload.fullName }
    logger.debug('User authenticated successfully', { userId: payload.userId })
    next()
  } catch {
    logger.debug('Authentication failed: Token verification failed')
    next(new UnauthorizedError('Token không hợp lệ'))
  }
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
