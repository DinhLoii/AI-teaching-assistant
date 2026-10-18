import { prisma } from '../../../database/prisma.js'
import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'

/** Batch the legacy reconciliation; repeated list reads share one pass per minute. */
export function syncPendingEnrollments(db: any = prisma, cache = memoryCache): Promise<number> {
  return cache.wrap('pending_enrollment_sync', 60, async () => {
    const pending = await db.pendingEnrollment.findMany({ where: { Status: 'Pending' } })
    if (!pending.length) return 0
    const [classes, enrollments] = await Promise.all([
      db.class.findMany({
        where: { ClassCode: { in: [...new Set(pending.map((p: any) => p.ClassCode))] } },
        include: { Semester: { select: { Code: true } }, Subject: { select: { SubjectCode: true } } },
      }),
      db.studentClass.findMany({
        where: { UserId: { in: [...new Set(pending.map((p: any) => p.UserId))] } },
        select: { UserId: true, Class: { select: { SubjectId: true, SemesterId: true } } },
      }),
    ])
    const key = (user: string, subject: string, semester: string) => JSON.stringify([user, subject, semester])
    const enrolled = new Set(enrollments.map((e: any) => key(e.UserId, e.Class.SubjectId, e.Class.SemesterId)))
    const byCode = new Map<string, any[]>()
    for (const cls of classes) {
      const list = byCode.get(cls.ClassCode) || []
      list.push(cls)
      byCode.set(cls.ClassCode, list)
    }
    const data = []
    for (const pe of pending) {
      for (const cls of byCode.get(pe.ClassCode) || []) {
        const pendingNumber = pe.SemesterCode?.match(/\d+/)?.[0]
        const classNumber = cls.Semester?.Code?.match(/\d+/)?.[0]
        const semesterMatches = cls.Semester?.Code === pe.SemesterCode ||
          (pendingNumber !== undefined && classNumber !== undefined && Number(pendingNumber) === Number(classNumber))
        const subjectMatches = !pe.SubjectCode || cls.Subject?.SubjectCode?.toLowerCase() === pe.SubjectCode.toLowerCase()
        const scope = key(pe.UserId, cls.SubjectId, cls.SemesterId)
        if (semesterMatches && subjectMatches && !enrolled.has(scope)) {
          data.push({ UserId: pe.UserId, ClassId: cls.Id, EnrolledAt: new Date() })
          enrolled.add(scope)
        }
      }
    }
    if (!data.length) return 0
    const result = await db.studentClass.createMany({ data, skipDuplicates: true })
    if (result.count) {
      for (const prefix of ['classes_', 'class_', 'student_', 'exams_list_']) cache.invalidatePrefix(prefix)
    }
    return result.count
  })
}
