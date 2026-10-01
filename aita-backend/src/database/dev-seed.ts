import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'
import { syncClassSemesters } from './sync-class-semesters.js'

/**
 * Dev-only bootstrap: upsert the three demo accounts on server start so a fresh
 * DB is immediately loginable (mobile/web review) without running `npm run db:seed`.
 * Idempotent — safe to run on every boot. Full demo data (class, enrollment, exams)
 * still comes from `prisma/seed.ts` via `npm run setup`.
 */
const ACCOUNTS = [
  { role: 'ADMIN', email: 'admin@fpt.edu.vn', password: 'admin123', fullName: 'Quản trị AITA', code: 'ADM001' },
  { role: 'LECTURER', email: 'lecturer@fpt.edu.vn', password: 'lecturer123', fullName: 'Nguyễn Văn Giảng', code: 'GV001' },
  { role: 'STUDENT', email: 'student@fpt.edu.vn', password: 'student123', fullName: 'Trần Thị Sinh', code: 'HE170001' },
] as const

export async function seedTestAccounts(): Promise<void> {
  try {
    // Proactively connect to test the connection and prevent verbose Prisma query stack traces on failure.
    await prisma.$connect()
  } catch (error: any) {
    if (error?.message?.includes("Can't reach database server") || error?.code === 'P1001') {
      throw new Error("Cannot reach SQL Server at localhost:1433. Please verify SQL Server (SQLEXPRESS) service is running and TCP/IP port 1433 is enabled.")
    }
    throw new Error(error?.message?.split('\n').pop() || 'Database connection failed.')
  }

  try {
    for (const acc of ACCOUNTS) {
      const role = await prisma.role.upsert({
        where: { RoleName: acc.role },
        update: {},
        create: { RoleName: acc.role },
      })
      const user = await prisma.user.upsert({
        where: { Email: acc.email },
        update: {},
        create: {
          Email: acc.email,
          PasswordHash: await bcrypt.hash(acc.password, 10),
          FullName: acc.fullName,
          StudentCode: acc.code,
          Status: 'Active',
        },
      })
      await prisma.userRole.upsert({
        where: { UserId_RoleId: { UserId: user.Id, RoleId: role.Id } },
        update: {},
        create: { UserId: user.Id, RoleId: role.Id },
      })
    }
    await syncClassSemesters()
  } catch (error: any) {
    // If it fails during upsert, also sanitize the error message to keep console clean
    const cleanMsg = error?.message?.split('\n').pop() || 'Error seeding database.'
    throw new Error(`Seed failed: ${cleanMsg}`)
  }
}

