import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { collectNotificationTimestampRepairs } from '../src/modules/notifications/application/notification-timestamp-repair.ts'

const apply = process.argv.includes('--apply')
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw Error('Supported option: --apply. Default: read-only audit.')
const db = new PrismaClient()
try {
  const result = apply ? await db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`
    await tx.$executeRaw`ALTER TABLE "Notification" ALTER COLUMN "CreatedAt" SET DEFAULT CURRENT_TIMESTAMP`
    const plan = await collectNotificationTimestampRepairs(tx)
    const groups = new Map()
    for (const repair of plan.repairs) {
      const date = repair.createdAt.toISOString()
      groups.set(date, [...(groups.get(date) || []), repair.id])
    }
    let updated = 0
    for (const [date, ids] of groups) {
      updated += (await tx.notification.updateMany({ where: { Id: { in: ids }, CreatedAt: null }, data: { CreatedAt: new Date(date) } })).count
    }
    return { ...plan, updated }
  }, { timeout: 60000, isolationLevel: 'RepeatableRead' }) : { ...await collectNotificationTimestampRepairs(db), updated: 0 }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'read-only', missing: result.missing, recoverableFromSubmissionEvents: result.repairs.length, updated: result.updated, unresolved: result.unresolved, databaseDefaultApplied: apply }))
} catch (error) {
  // Do not print connection strings, notification content, or user identities.
  console.error(JSON.stringify({ error: 'Notification timestamp repair failed; transaction rolled back.', code: error.code || 'ERROR' }))
  process.exitCode = 1
} finally { await db.$disconnect() }
