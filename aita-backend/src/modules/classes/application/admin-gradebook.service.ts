import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../../../database/prisma.js'
import { databaseTransactionOptions } from '../../../database/transaction-options.js'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/application/app.error.js'
import { publishNotification } from '../../../shared/infrastructure/publish-notification.js'
import { invalidateAnalytics } from '../../../shared/infrastructure/analytics-realtime.js'
import type { AuthUser } from '../../../types/express.js'
import { effectiveGrade, gradeRevision, gradeRevisionSelect, weightedGrade, weightsRevision } from './gradebook-policy.js'

const changesSchema = z.object({
  reason: z.string().trim().min(5).max(2000),
  changes: z.array(z.object({
    submissionId: z.string().min(1),
    revision: z.string().length(64),
    finalScore: z.number().finite().nonnegative().multipleOf(0.01).optional(),
    feedback: z.string().max(5000).optional(),
    published: z.boolean().optional(),
  }).strict().refine(c => c.finalScore !== undefined || c.feedback !== undefined || c.published !== undefined, 'Chưa có thay đổi')).min(1).max(200),
}).strict()

const studentSelect = { Id: true, FullName: true, StudentCode: true, Email: true } as const
const numberOrNull = (value: unknown) => value == null ? null : Number(value)

export class AdminGradebookService {
  constructor(private readonly db: PrismaClient = prisma) {}

  private authorize(user: AuthUser) {
    if (user.role.toUpperCase() !== 'ADMIN') throw new ForbiddenError('Chỉ quản trị viên được quản lý bảng điểm toàn hệ thống')
  }

  async catalog(user: AuthUser) {
    this.authorize(user)
    const semesters = await this.db.semester.findMany({
      orderBy: [{ StartDate: 'desc' }, { Code: 'desc' }, { Season: 'asc' }],
      include: { Class: {
        orderBy: [{ ClassCode: 'asc' }],
        include: { Subject: true, InstructorClass: { include: { User: { select: { FullName: true } } } }, _count: { select: { StudentClass: true } } },
      } },
    })
    return semesters.map(s => ({
      id: s.Id, code: s.Code, season: s.Season, active: s.IsActive === true, startDate: s.StartDate, endDate: s.EndDate,
      classes: s.Class.map(c => ({
        id: c.Id, code: c.ClassCode || 'Chưa đặt mã lớp', subjectId: c.SubjectId,
        subjectCode: c.Subject?.SubjectCode || '', subjectName: c.Subject?.SubjectName || 'Chưa gán môn',
        students: c._count.StudentClass, lecturers: c.InstructorClass.map(i => i.User.FullName).filter(Boolean), status: c.Status,
      })),
    }))
  }

  async get(classId: string, user: AuthUser) {
    this.authorize(user)
    const cls = await this.db.class.findUnique({
      where: { Id: classId },
      include: {
        Semester: true, Subject: true,
        InstructorClass: { include: { User: { select: { FullName: true } } } },
        StudentClass: { include: { User: { select: studentSelect } } },
        ExamClass: { where: { Exam: { OR: [{ IsDeleted: false }, { IsDeleted: null }] } }, include: { Exam: true } },
      },
    })
    if (!cls) throw new NotFoundError('Không tìm thấy lớp học phần')
    const settings = await this.db.systemConfig.findUnique({ where: { Key: `gradebook_weights:${classId}` } })
    const configuredWeights: Record<string, number> | null = settings?.Value ? JSON.parse(settings.Value) : null
    const exams = cls.ExamClass.filter(e => !e.Exam.SubjectId || e.Exam.SubjectId === cls.SubjectId).map(({ Exam: e, DueDate }) => ({
      id: e.Id, title: e.Title || 'Bài đánh giá', type: e.ExamType, maxScore: numberOrNull(e.TotalPoints),
      weight: configuredWeights ? configuredWeights[e.Id] ?? null : numberOrNull(e.WeightPercentage), dueDate: DueDate ?? e.DueDate,
    })).sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0) || a.title.localeCompare(b.title))
    const submissions = await this.db.submission.findMany({
      where: { ClassId: classId, ExamId: { in: exams.map(e => e.id) }, StudentId: { in: cls.StudentClass.map(s => s.UserId) } },
      select: {
        Id: true, ExamId: true, StudentId: true, AttemptNumber: true, SubmittedAt: true, LatePenaltyAmount: true,
        ReviewedBy: true, ...gradeRevisionSelect,
      },
      orderBy: [{ AttemptNumber: 'desc' }, { SubmittedAt: 'desc' }, { Id: 'desc' }],
    })
    // Prefer the explicit current attempt; legacy records may not have IsLatest set.
    const current = new Map<string, typeof submissions[number]>()
    for (const s of submissions) {
      if (s.IsLatest === false) continue
      const key = `${s.StudentId}:${s.ExamId}`
      const previous = current.get(key)
      if (!previous || (s.IsLatest === true && previous.IsLatest !== true)) current.set(key, s)
    }
    const rows = cls.StudentClass.map(({ User: student }) => {
      const grades = exams.map(e => {
        const sub = current.get(`${student.Id}:${e.id}`)
        return {
          examId: e.id, submissionId: sub?.Id ?? null, attempt: sub?.AttemptNumber ?? null, submittedAt: sub?.SubmittedAt ?? null,
          score: sub ? effectiveGrade(sub) : null, rawScore: sub ? numberOrNull(sub.RawScore ?? sub.TotalScore) : null,
          penalty: sub ? numberOrNull(sub.LatePenaltyAmount) : null, feedback: sub?.InstructorFeedback ?? '',
          status: sub?.GradingStatus ?? 'NOT_SUBMITTED', published: sub?.ReviewStatus?.toUpperCase() === 'PUBLISHED',
          reviewedAt: sub?.ReviewedAt ?? null,
          revision: sub ? gradeRevision(sub) : null,
        }
      })
      return { id: student.Id, code: student.StudentCode, name: student.FullName, email: student.Email, grades,
        total: weightedGrade(exams, grades), publishedTotal: weightedGrade(exams, grades.map(g => ({ ...g, score: g.published ? g.score : null }))),
      }
    }).sort((a, b) => (a.code || a.name || '').localeCompare(b.code || b.name || ''))
    return {
      class: { id: cls.Id, code: cls.ClassCode, semester: `${cls.Semester?.Season ?? ''} ${cls.Semester?.Code ?? ''}`.trim(),
        semesterId: cls.SemesterId, subjectCode: cls.Subject?.SubjectCode, subjectName: cls.Subject?.SubjectName,
        lecturers: cls.InstructorClass.map(i => i.User.FullName).filter(Boolean) },
      exams, rows, weightTotal: exams.reduce((sum, e) => sum + (e.weight ?? 0), 0),
      weightsRevision: weightsRevision(settings?.Value), weightsSource: configuredWeights ? 'class' : 'exam', generatedAt: new Date().toISOString(),
    }
  }

  async history(classId: string, submissionId: string, user: AuthUser) {
    this.authorize(user)
    if (!await this.db.submission.findFirst({ where: { Id: submissionId, ClassId: classId }, select: { Id: true } })) throw new NotFoundError('Không tìm thấy bài nộp trong lớp')
    const logs = await this.db.auditLog.findMany({
      where: { EntityName: 'Submission', EntityId: submissionId, Action: 'ADMIN_GRADEBOOK_UPDATE' },
      orderBy: { CreatedAt: 'desc' }, take: 100,
      include: { User: { select: { FullName: true, Email: true } } },
    })
    return logs.map(l => ({ id: l.Id, at: l.CreatedAt, actor: l.User?.FullName || l.User?.Email || 'Quản trị viên',
      before: JSON.parse(l.OldValue || '{}'), after: JSON.parse(l.NewValue || '{}') }))
  }

  async update(classId: string, body: unknown, user: AuthUser, ip?: string) {
    this.authorize(user)
    const parsed = changesSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('Vui lòng nhập điểm hợp lệ, lý do từ 5 ký tự và tối đa 200 bài mỗi lần', parsed.error.flatten())
    const { reason, changes } = parsed.data
    if (new Set(changes.map(c => c.submissionId)).size !== changes.length) throw new ValidationError('Danh sách bài nộp bị trùng')
    const notifications = await this.db.$transaction(async tx => {
      const notices = []
      // Stable order prevents deadlocks between two bulk operations.
      for (const change of [...changes].sort((a, b) => a.submissionId.localeCompare(b.submissionId))) {
        await tx.$queryRaw`SELECT "Id" FROM "Submission" WHERE "Id" = ${change.submissionId} FOR UPDATE`
        const sub = await tx.submission.findFirst({
          where: { Id: change.submissionId, ClassId: classId },
          include: { Exam: true, Class: { include: { StudentClass: { select: { UserId: true } } } } },
        })
        if (!sub || !sub.Exam || !sub.StudentId || !sub.Class) throw new NotFoundError('Bài nộp không thuộc lớp đã chọn')
        if (!sub.Class.StudentClass.some(s => s.UserId === sub.StudentId)) throw new ValidationError('Sinh viên không còn trong lớp')
        const assigned = await tx.examClass.findUnique({ where: { ExamId_ClassId: { ExamId: sub.Exam.Id, ClassId: classId } } })
        if (!assigned || sub.Exam.IsDeleted || (sub.Exam.SubjectId && sub.Exam.SubjectId !== sub.Class.SubjectId)) throw new ValidationError('Bài đánh giá không thuộc môn học của lớp')
        const newer = await tx.submission.findFirst({ where: { ClassId: classId, ExamId: sub.ExamId, StudentId: sub.StudentId,
          OR: [{ IsLatest: true, Id: { not: sub.Id } }, { AttemptNumber: { gt: sub.AttemptNumber ?? 0 } }] }, select: { Id: true } })
        if (sub.IsLatest === false || newer) throw new ConflictError('Sinh viên đã có lần nộp mới. Hãy tải lại bảng điểm.')
        const revision = gradeRevision(sub)
        if (revision !== change.revision) throw new ConflictError('Điểm vừa được cập nhật bởi người khác. Hãy tải lại bảng điểm trước khi lưu.')
        if (String(sub.GradingStatus).toLowerCase() !== 'graded') throw new ValidationError('Chỉ được điều chỉnh hoặc công bố bài đã chấm xong')
        const max = numberOrNull(sub.Exam.TotalPoints)
        const finalScore = change.finalScore ?? effectiveGrade(sub)
        if (finalScore == null || !Number.isFinite(finalScore) || finalScore < 0 || max == null || max <= 0 || finalScore > max) throw new ValidationError(`Điểm phải nằm trong thang điểm đã cấu hình (${max ?? 'chưa cấu hình'})`)
        const published = change.published ?? sub.ReviewStatus?.toUpperCase() === 'PUBLISHED'
        const feedback = change.feedback ?? sub.InstructorFeedback
        const before = { score: effectiveGrade(sub), published: sub.ReviewStatus?.toUpperCase() === 'PUBLISHED', feedback: sub.InstructorFeedback }
        await tx.submission.update({ where: { Id: sub.Id }, data: {
          FinalScore: finalScore, ReviewStatus: published ? 'PUBLISHED' : 'DRAFT',
          InstructorFeedback: feedback, ReviewedBy: user.id, ReviewedAt: new Date(),
        } })
        await tx.auditLog.create({ data: {
          EntityName: 'Submission', EntityId: sub.Id, Action: 'ADMIN_GRADEBOOK_UPDATE',
          OldValue: JSON.stringify(before), NewValue: JSON.stringify({ score: finalScore, published, feedback, reason, classId }),
          UserId: user.id, IpAddress: ip, CreatedAt: new Date(),
        } })
        if (published || before.published) {
          const notice = await tx.notification.create({ data: {
            Title: published ? 'Cập nhật kết quả học tập' : 'Thu hồi công bố điểm',
            Message: published ? `Kết quả bài "${sub.Exam.Title || 'Bài đánh giá'}" đã được cập nhật. Nhấn để xem chi tiết.` : `Điểm bài "${sub.Exam.Title || 'Bài đánh giá'}" đang được rà soát và tạm ẩn.`,
            Type: 'GRADE_PUBLISHED', ReferenceId: sub.ExamId, ReferenceType: 'ASSIGNMENT', CreatedBy: user.id, CreatedAt: new Date(),
            NotificationRecipient: { create: { UserId: sub.StudentId, IsRead: false } },
          } })
          notices.push({ studentId: sub.StudentId, notice })
        }
      }
      return notices
    }, databaseTransactionOptions)
    invalidateAnalytics()
    for (const { studentId, notice } of notifications) publishNotification([studentId], notice)
    return { updated: changes.length }
  }

  async updateWeights(classId: string, body: unknown, user: AuthUser, ip?: string) {
    this.authorize(user)
    const parsed = z.object({
      reason: z.string().trim().min(5).max(2000), revision: z.string().length(64),
      weights: z.array(z.object({ examId: z.string().min(1), weight: z.number().finite().min(0).max(100).multipleOf(0.01) }).strict()).min(1).max(200),
    }).strict().safeParse(body)
    if (!parsed.success) throw new ValidationError('Vui lòng nhập trọng số hợp lệ và lý do từ 5 ký tự')
    const { weights, revision, reason } = parsed.data
    if (new Set(weights.map(w => w.examId)).size !== weights.length || Math.abs(weights.reduce((sum, w) => sum + w.weight, 0) - 100) > 0.001) throw new ValidationError('Mỗi bài chỉ xuất hiện một lần và tổng trọng số phải bằng 100%')
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "Id" FROM "Class" WHERE "Id" = ${classId} FOR UPDATE`
      const cls = await tx.class.findUnique({ where: { Id: classId }, include: { ExamClass: { include: { Exam: true } } } })
      if (!cls) throw new NotFoundError('Không tìm thấy lớp học phần')
      const exams = cls.ExamClass.filter(e => !e.Exam.IsDeleted && (!e.Exam.SubjectId || e.Exam.SubjectId === cls.SubjectId))
      if (exams.length !== weights.length || exams.some(e => !weights.some(w => w.examId === e.ExamId))) throw new ConflictError('Danh sách bài đánh giá đã thay đổi. Hãy tải lại bảng điểm.')
      const key = `gradebook_weights:${classId}`
      const previous = await tx.systemConfig.findUnique({ where: { Key: key } })
      if (weightsRevision(previous?.Value) !== revision) throw new ConflictError('Trọng số đã được cập nhật. Hãy tải lại bảng điểm.')
      const value = JSON.stringify(Object.fromEntries(weights.map(w => [w.examId, w.weight])))
      await tx.systemConfig.upsert({ where: { Key: key }, create: { Key: key, Value: value, Description: 'Trọng số bảng điểm riêng của lớp học phần' }, update: { Value: value } })
      await tx.auditLog.create({ data: {
        EntityName: 'Class', EntityId: classId, Action: 'ADMIN_GRADEBOOK_WEIGHTS',
        OldValue: JSON.stringify(previous?.Value ? JSON.parse(previous.Value) : Object.fromEntries(exams.map(e => [e.ExamId, numberOrNull(e.Exam.WeightPercentage)]))),
        NewValue: JSON.stringify({ weights: JSON.parse(value), reason }), UserId: user.id, IpAddress: ip, CreatedAt: new Date(),
      } })
    }, databaseTransactionOptions)
    invalidateAnalytics()
    return { updated: weights.length }
  }
}
