import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import type { ITokenService, TokenPayload } from '../application/ports/i-token-service.js'

/**
 * JWT-based implementation of ITokenService.
 */
export class JwtTokenService implements ITokenService {
  sign(payload: TokenPayload): string {
    if (!payload.credentialVersion) throw new Error('Credential version is required for access tokens')
    return jwt.sign(
      { sub: payload.userId, email: payload.email, role: payload.role, fullName: payload.fullName, cv: payload.credentialVersion, issuedAt: Date.now() },
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
      cv?: string
      issuedAt?: number
    }
    if (typeof decoded.sub !== 'string' || !decoded.sub || typeof decoded.role !== 'string' || !decoded.role) throw new Error('Invalid access token claims')
    if (typeof decoded.cv !== 'string' || !/^[a-f0-9]{64}$/.test(decoded.cv) || !Number.isFinite(decoded.issuedAt)) throw new Error('Access token must be renewed')
    return {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
      credentialVersion: decoded.cv,
      issuedAt: decoded.issuedAt,
    }
  }
}
