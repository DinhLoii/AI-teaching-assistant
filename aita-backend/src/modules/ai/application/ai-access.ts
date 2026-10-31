import type { AuthUser } from '../../../types/express.js'
import { prisma } from '../../../database/prisma.js'
import { ForbiddenError, NotFoundError } from '../../../shared/application/app.error.js'
import { staffSubmissionScope } from '../../grading/engine/assignment/assignment-access.js'

export async function assertAiSubmissionAccess(id: string, user: AuthUser, write = false, db: any = prisma) {
  const role = user.role.toUpperCase()
  if (write && !['ADMIN', 'LECTURER'].includes(role)) throw new ForbiddenError()
  const scope = role === 'STUDENT'
    ? { StudentId: user.id, ReviewStatus: 'PUBLISHED' }
    : staffSubmissionScope(user)
  const record = await db.submission.findFirst({ where: { AND: [{ Id: id }, scope] }, select: { Id: true, ExamId: true } })
  if (!record) throw new NotFoundError('Không tìm thấy bài nộp trong phạm vi được phép')
  return record
}
