/**
 * Port interface for password hashing.
 * Decouples bcrypt (or any hashing library) from application logic.
 */
export interface IHashService {
  /** Hash a plain-text password */
  hash(plain: string): Promise<string>

  /** Compare a plain-text password against a hashed password */
  compare(plain: string, hashed: string): Promise<boolean>
}
