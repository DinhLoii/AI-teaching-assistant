import type { RequestHandler } from 'express'
import type { AuthUser } from '../../../../types/express.js'
import { prisma } from '../../../../database/prisma.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../../../shared/application/app.error.js'

/** The database predicate is shared by list and record authorization. */
export function assignmentScope(user: AuthUser, write = false): any {
  const role = user.role.toUpperCase()
  if (role === 'ADMIN') return {}
  const instructor = { Class: { InstructorClass: { some: { UserId: user.id } } } }
  if (role === 'LECTURER') return { OR: [
    { CreatedBy: user.id },
    { ExamClass: { some: instructor, ...(write ? { every: instructor } : {}) } },
  ] }
  if (role === 'STUDENT' && !write) return {
    IsDeleted: { not: true }, Status: { in: ['Published', 'Active', 'PUBLISHED', 'ACTIVE'] },
    ExamClass: { some: { Class: { StudentClass: { some: { UserId: user.id } } } } },
  }
  throw new ForbiddenError('Bạn không có quyền thao tác bài tập này.')
}

export async function assertAssignmentAccess(id: string, user: AuthUser, write = false, db: any = prisma) {
  if (typeof id !== 'string' || !id || id.length > 128) throw new ValidationError('Mã bài tập không hợp lệ.')
  const exam = id && await db.exam.findFirst({ where: { AND: [{ Id: id }, assignmentScope(user, write)] }, select: { Id: true } })
  const legacy = !exam && user.role.toUpperCase() === 'ADMIN' && id && await db.publishedAssignment?.findUnique({ where: { Id: id }, select: { Id: true } })
  if (!exam && !legacy) {
    throw new NotFoundError('Không tìm thấy bài tập trong phạm vi được phép.')
  }
}

export async function assertClassAccess(ids: unknown, user: AuthUser, db: any = prisma) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || !id || id.length > 128)) throw new ValidationError('Vui lòng chọn lớp học hợp lệ.')
  if (!['ADMIN', 'LECTURER'].includes(user.role.toUpperCase())) throw new ForbiddenError()
  const unique = [...new Set(ids)]
  const count = await db.class.count({ where: { Id: { in: unique }, ...(user.role.toUpperCase() === 'ADMIN' ? {} : { InstructorClass: { some: { UserId: user.id } } }) } })
  if (count !== unique.length) throw new ForbiddenError('Bạn chỉ được giao bài cho lớp mình phụ trách.')
}

export function staffSubmissionScope(user: AuthUser): any {
  if (user.role.toUpperCase() === 'ADMIN') return {}
  if (user.role.toUpperCase() !== 'LECTURER') throw new ForbiddenError()
  return { OR: [{ Exam: { CreatedBy: user.id } }, { Class: { InstructorClass: { some: { UserId: user.id } } } }] }
}

export async function assertClassesMatchSubject(ids: string[], subjectId: string, db: any = prisma) {
  if (!subjectId || await db.class.count({ where: { Id: { in: [...new Set(ids)] }, SubjectId: subjectId } }) !== new Set(ids).size) throw new ValidationError('Lớp học và môn học không khớp. Vui lòng chọn đúng môn của lớp.')
}

export function requireAssignmentAccess(write = false, bulk = false, db: any = prisma): RequestHandler {
  return async (req, _res, next) => {
    try {
      const ids = bulk ? req.body.ids : [req.params.id]
      if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || !id)) throw new ValidationError('Danh sách bài tập không hợp lệ.')
      for (const id of new Set(ids)) await assertAssignmentAccess(String(id), req.user!, write, db)
      next()
    } catch (error) { next(error) }
  }
}

export const requirePublishClasses: RequestHandler = async (req, _res, next) => {
  try { await assertClassAccess(req.body?.metadata?.classIds, req.user!); next() } catch (error) { next(error) }
}

/** Students may read the rubric, never answer keys, hidden probes or classmates' grades. */
export function studentAssignmentView(assignment: any) {
  return {
    id: assignment.id, version: assignment.version,
    metadata: Object.fromEntries(['title', 'description', 'content', 'subject', 'subjectCode', 'projectType', 'dueDate', 'assignmentType', 'category', 'allowLateSubmission', 'latePenaltyType', 'latePenaltyValue', 'maxLatePenalty'].filter(key => assignment.metadata?.[key] !== undefined).map(key => [key, assignment.metadata[key]])),
    rubric: assignment.rubric ? {
      totalWeight: assignment.rubric.totalWeight,
      rules: (assignment.rubric.rules || []).map((r: any) => ({ id: r.id, title: r.title, description: r.description, weight: r.weight, scoringStrategy: r.scoringStrategy })),
    } : null,
    allowLateSubmission: assignment.allowLateSubmission, latePenaltyType: assignment.latePenaltyType,
    latePenaltyValue: assignment.latePenaltyValue, maxLatePenalty: assignment.maxLatePenalty,
  }
}
