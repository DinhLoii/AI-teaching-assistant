import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createInterface, emitKeypressEvents } from 'node:readline'
import { prisma } from '../src/database/prisma.js'
import { findDefaultDemoAccounts } from '../src/database/production-preflight.js'

async function secret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Run interactively in a terminal. Passwords must not be passed as command arguments.')
  process.stderr.write(prompt)
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true); process.stdin.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    const done = () => { process.stdin.removeListener('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stderr.write('\n') }
    const onKey = (text: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') { done(); reject(new Error('Cancelled; no accounts changed')) }
      else if (key.name === 'return') { done(); resolve(value) }
      else if (key.name === 'backspace') { value = value.slice(0, -1) }
      else if (text && !key.ctrl) value += text
    }
    process.stdin.on('keypress', onKey)
  })
}

try {
  const args = process.argv.slice(2)
  const keepEmail = args.includes('--keep-admin') ? args[args.indexOf('--keep-admin') + 1] : 'admin@fpt.edu.vn'
  const affected = await findDefaultDemoAccounts()
  console.log(JSON.stringify({ mode: args.includes('--apply') ? 'review-before-apply' : 'dry-run', keepAdmin: keepEmail, affected: affected.map(a => ({ email: a.email, role: a.role, active: a.active })) }, null, 2))
  if (args.includes('--apply')) {
    const keep = await prisma.user.findFirst({ where: { Email: { equals: keepEmail, mode: 'insensitive' }, UserRole: { some: { Role: { RoleName: 'ADMIN' } } } } })
    if (!keep) throw new Error('The selected account must already have the ADMIN role; no account was changed')
    const password = await secret('New password for the retained admin (hidden, 12–128 characters): ')
    if (password.length < 12 || password.length > 128) throw new Error('Password length must be 12–128 characters')
    if (password !== await secret('Repeat new password (hidden): ')) throw new Error('Passwords do not match; no accounts changed')
    const input = createInterface({ input: process.stdin, output: process.stdout })
    const confirmed = await new Promise<string>(resolve => input.question(`Type the retained admin email (${keepEmail}) to confirm retiring only insecure demo accounts: `, resolve))
    input.close()
    if (confirmed.trim().toLowerCase() !== keepEmail.toLowerCase()) throw new Error('Not confirmed; no accounts changed')
    const hash = await bcrypt.hash(password, 12)
    if (await bcrypt.compare(password, keep.PasswordHash || '') && affected.some(a => a.id === keep.Id)) throw new Error('Choose a password different from the existing demo password')
    await prisma.$transaction(async tx => {
      const targets = new Set([...affected.map(a => a.id), keep.Id])
      for (const id of targets) {
        await tx.user.update({ where: { Id: id }, data: id === keep.Id
          ? { PasswordHash: hash, Status: 'Active', RequirePasswordChange: false, ResetPasswordOtp: null, ResetPasswordOtpExpiry: null }
          : { Status: 'Inactive', RequirePasswordChange: true, ResetPasswordOtp: null, ResetPasswordOtpExpiry: null } })
        await tx.refreshToken.updateMany({ where: { UserId: id }, data: { IsRevoked: true } })
        const Key = `session_revocation:${id}`, Value = String(Date.now())
        await tx.systemConfig.upsert({ where: { Key }, create: { Key, Value }, update: { Value } })
        await tx.auditLog.create({ data: { EntityName: 'User', EntityId: id, UserId: keep.Id, Action: 'SECURE_DEMO_ACCOUNT', CreatedAt: new Date(), NewValue: JSON.stringify({ retainedAdmin: id === keep.Id, sessionsRevoked: true }) } })
      }
    })
    console.log('Completed. Sign in using the retained admin and the password you entered. No password has been printed or written to a file.')
  }
} finally { await prisma.$disconnect() }
