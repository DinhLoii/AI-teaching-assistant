/**
 * Port interface for token operations (JWT).
 * Application layer depends on this abstraction;
 * Infrastructure layer provides the concrete implementation.
 */
export interface TokenPayload {
  userId: string
  email: string
  role: string
  fullName: string
}

export interface ITokenService {
  /** Create a signed token from a payload */
  sign(payload: TokenPayload): string

  /** Verify and decode a token, throws on invalid/expired */
  verify(token: string): TokenPayload
}
