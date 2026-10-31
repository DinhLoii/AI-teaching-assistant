import bcrypt from 'bcryptjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { constants } from 'node:fs'
import { ACCOUNTS } from './dev-seed.js'
import { prisma } from './prisma.js'
import { runtimeDataRoot, publicUploadsRoot, artifactFilesRoot } from '../shared/infrastructure/runtime-storage.js'
import { privateSubmissionRoot } from '../modules/submissions/infrastructure/submission-storage.js'

export async function findDefaultDemoAccounts(db: any = prisma) {
  const rows = await db.user.findMany({ where: { OR: ACCOUNTS.map(a => ({ Email: { equals: a.email, mode: 'insensitive' } })) }, select: { Id: true, Email: true, PasswordHash: true, Status: true } })
  const affected = []
  for (const row of rows) {
    const fixture = ACCOUNTS.find(a => a.email === row.Email?.toLowerCase())
    if (fixture && row.PasswordHash && await bcrypt.compare(fixture.password, row.PasswordHash)) affected.push({ id: row.Id, email: row.Email, role: fixture.role, active: row.Status?.toUpperCase() === 'ACTIVE' })
  }
  return affected
}

export async function assertProductionPreflight(db: any = prisma) {
  const defaults = await findDefaultDemoAccounts(db)
  // The owner explicitly chose to retain the current accounts and passwords.
  // Report the risk without mutating accounts or blocking deployment.
  if (defaults.some(a => a.active)) console.warn('[Preflight] Known demo passwords remain active; accounts are preserved as requested by the owner.')
  const ledger = await db.$queryRaw`SELECT to_regclass('"_prisma_migrations"')::text AS ledger`
  if (!ledger[0]?.ledger) throw new Error('Production blocked: migration baseline is not recorded. Follow docs/PRODUCTION_DEPLOYMENT.md; do not reset the database.')
  const rows = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
  const expected = (await fs.readdir(path.resolve('prisma/migrations'), { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name)
  if (expected.some(name => !rows.some((r: any) => r.migration_name === name))) throw new Error('Production blocked: pending migrations. Review npm run db:preflight before deployment.')
  if (process.env.RENDER && !process.env.RUNTIME_DATA_DIR) throw new Error('Render requires RUNTIME_DATA_DIR on a persistent disk for uploads, submissions and artifacts.')
  for (const dir of [runtimeDataRoot(), publicUploadsRoot(), artifactFilesRoot(), privateSubmissionRoot()]) {
    await fs.mkdir(dir, { recursive: true })
    await fs.access(dir, constants.R_OK | constants.W_OK)
  }
  if (!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) && !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) throw new Error('Production requires a configured email provider for account recovery.')
  if (process.env.RENDER && (process.env.SANDBOX_ENABLED === 'true' || process.env.STDIO_SANDBOX_ENABLED === 'true')) throw new Error('Run execution sandboxes on a dedicated grading host, not inside the Render API container. See deployment documentation.')
}
