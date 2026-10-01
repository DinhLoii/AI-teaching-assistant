import type { RefreshToken } from '../entities/refresh-token.entity.js'

export interface IRefreshTokenRepository {
  /**
   * Find a refresh token by its token string.
   */
  findByToken(token: string): Promise<RefreshToken | null>

  /**
   * Save a refresh token (create or update).
   */
  save(refreshToken: RefreshToken): Promise<void>

  /**
   * Revoke all active refresh tokens for a specific user.
   * Useful for "logout from all devices" or when an account is locked.
   */
  revokeAllForUser(userId: string): Promise<void>
}
