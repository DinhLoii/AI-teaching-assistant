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
