import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs/promises'

// Every fixture is isolated in a schema created by this invocation. Application tables are untouched.
const source = process.env.TEST_DATABASE_URL
if (!source) throw new Error('Configure TEST_DATABASE_URL for an isolated PostgreSQL test schema.')
const url = new URL(source)
if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL is required.')
const schema = 'aita_test_' + randomBytes(10).toString('hex')
const admin = new PrismaClient({ datasourceUrl: source })
let created = false
let temporaryMigration
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  created = true
  url.searchParams.set('schema', schema)
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), TEST_DATABASE_URL: url.toString(), GRADING_WORKER_ENABLED: 'false' }
  const isolated = new PrismaClient({ datasourceUrl: url.toString() })
  try {
    const result = await isolated.$queryRaw`SELECT current_schema()::text AS name`
    if (result[0]?.name !== schema) throw new Error('Test schema isolation could not be verified.')
  } finally { await isolated.$disconnect() }
  let migrationFile = 'prisma/migrations/20261016000000_postgresql_baseline/migration.sql'
  if (process.env.TEST_SKIP_PGVECTOR === 'true') {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Vector-free module tests require a local temporary database.')
    const sql = (await fs.readFile(migrationFile, 'utf8')).replace('CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;', '').replace('"Embedding" public.vector(768)', '"Embedding" TEXT')
    await fs.mkdir('temp', { recursive: true })
    temporaryMigration = path.join('temp', schema + '.sql')
    await fs.writeFile(temporaryMigration, sql)
    migrationFile = temporaryMigration
    console.log('Local relational-module tests: pgvector column omitted. CI uses the full pgvector migration.')
  }
  for (const file of [migrationFile, 'prisma/migrations/20261017000000_durable_grading_realtime/migration.sql']) {
    const migrate = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', file], { env, encoding: 'utf8', timeout: 120000 })
    if (migrate.status !== 0) {
      console.error((migrate.stderr || migrate.stdout || String(migrate.error || '')).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[test connection]'))
      throw new Error('Isolated test migration failed. No application table was modified.')
    }
  }
  const test = spawnSync(process.execPath, ['--import', 'tsx', '--test', path.join('tests', 'production-postgres.test.ts')], { env, stdio: 'inherit', timeout: 120000 })
  if (test.status !== 0) process.exitCode = 1
} finally {
  if (created && /^aita_test_[a-f0-9]{20}$/.test(schema)) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await admin.$disconnect()
  if (temporaryMigration) await fs.unlink(temporaryMigration).catch(() => {})
}
