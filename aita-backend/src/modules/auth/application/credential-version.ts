import { createHash, randomBytes } from 'node:crypto'

export function credentialVersion(passwordHash: string | null | undefined): string {
  return createHash('sha256').update(passwordHash || '').digest('hex')
}

export function newRefreshToken(passwordHash: string | null | undefined): string {
  return `${credentialVersion(passwordHash)}.${randomBytes(64).toString('hex')}`
}

export function refreshMatchesCredentials(token: string, passwordHash: string | null | undefined) {
  return token.startsWith(credentialVersion(passwordHash) + '.')
}
