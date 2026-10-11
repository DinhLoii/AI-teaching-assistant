import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../shared/infrastructure/logger.js'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
})

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    logger.info('Database connection healthy')
    return true
  } catch (error) {
    logger.error('Database connection failed', error as Error)
    return false
  }
}

// ─── Neon Serverless Postgres Warm-up & Keep-Alive ───────────────────────────
// Neon computes auto-suspend after 5 mins of inactivity. A periodic lightweight
// ping ensures 0ms cold-start latency for all user requests.
const KEEP_ALIVE_INTERVAL_MS = 3 * 60 * 1000 // 3 minutes
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (_) {
    // Ignore ping errors in background
  }
}, KEEP_ALIVE_INTERVAL_MS).unref?.()

export { Prisma }

export type {
  User,
  Class,
  Submission,
  Subject,
  Notification,
  Exam,
  AssignmentTemplate,
  Semester,
  StudentClass,
  InstructorClass,
  UserRole,
  Role,
  AuditLog,
  SystemConfig,
  GradingSession,
  GradingJob,
  AiApiKey,
  AiUsageLog,
} from '@prisma/client'
