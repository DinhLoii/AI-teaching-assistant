import fs from 'node:fs/promises'
import bcrypt from '../../aita-backend/node_modules/bcryptjs/index.js'
import { prisma } from '../../aita-backend/src/database/prisma.ts'

try {
  const source = await fs.readFile(new URL('../../aita-backend/src/database/dev-seed.ts', import.meta.url), 'utf8')
  const fixtures = [...source.matchAll(/role: '([^']+)', email: '([^']+)', password: '([^']+)'/g)].map(m => ({ role: m[1], email: m[2], password: m[3] }))
  const rows = await prisma.user.findMany({ where: { Email: { in: fixtures.map(f => f.email) } }, select: { Email: true, PasswordHash: true, Status: true, RequirePasswordChange: true } })
  const findings = []
  for (const row of rows) {
    const fixture = fixtures.find(f => f.email === row.Email)
    if (row.PasswordHash && await bcrypt.compare(fixture.password, row.PasswordHash)) findings.push({ role: fixture.role, active: row.Status?.toLowerCase() === 'active', forcedPasswordChange: row.RequirePasswordChange === true })
  }
  const result = { mode: 'read-only', date: '2026-10-31', knownDemoAccountsPresent: rows.length, accountsStillUsingPublishedDemoPasswords: findings }
  await fs.writeFile(new URL('./database-readonly-check.json', import.meta.url), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally { await prisma.$disconnect() }
