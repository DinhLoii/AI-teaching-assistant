import bcrypt from 'bcryptjs'
import type { IHashService } from '../application/ports/i-hash-service.js'

const SALT_ROUNDS = 10

/**
 * Bcrypt-based implementation of IHashService.
 */
export class BcryptHashService implements IHashService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS)
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed)
  }
}
