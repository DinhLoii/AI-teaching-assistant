import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import type { ITokenService, TokenPayload } from '../application/ports/i-token-service.js'

/**
 * JWT-based implementation of ITokenService.
 */
export class JwtTokenService implements ITokenService {
  sign(payload: TokenPayload): string {
    return jwt.sign(
      { sub: payload.userId, email: payload.email, role: payload.role, fullName: payload.fullName },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    )
  }

  verify(token: string): TokenPayload {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      sub: string
      email: string
      role: string
      fullName: string
    }
    return {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
    }
  }
}
