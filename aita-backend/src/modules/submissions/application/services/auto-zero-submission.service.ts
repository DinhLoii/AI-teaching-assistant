import { prisma } from '../../../../database/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../../../shared/infrastructure/logger.js'

export class AutoZeroSubmissionService {
  private static lastSyncStudent = new Map<string, number>()
  private static lastSyncExam = new Map<string, number>()

  /**
   * Đồng bộ tạo điểm 0 cho một học sinh đối với tất cả các bài tập đã quá hạn mà học sinh chưa nộp.
   */
  async syncZeroScoresForStudent(studentId: string): Promise<number> {
    try {
      const now = new Date()

      // Throttle: chỉ chạy tối đa 1 lần mỗi 60 giây cho mỗi student để tránh nghẽn database roundtrips
      const last = AutoZeroSubmissionService.lastSyncStudent.get(studentId)
      if (last && now.getTime() - last < 60000) {
        return 0
      }
      AutoZeroSubmissionService.lastSyncStudent.set(studentId, now.getTime())

      // 1. Lấy danh sách các lớp học mà sinh viên đang tham gia
      const enrollments = await prisma.studentClass.findMany({
        where: { UserId: studentId },
        select: { ClassId: true }
      })

      if (!enrollments || enrollments.length === 0) return 0
      const enrolledClassIds = enrollments.map(e => e.ClassId)

      // 2. Lấy danh sách các bài thi đã xuất bản và đã quá hạn của các lớp này
      const expiredExams: any[] = await (prisma.exam as any).findMany({
        where: {
          Status: { in: ['Published', 'published', 'PUBLISHED'] },
          DueDate: { lt: now },
          ExamClass: {
            some: {
              ClassId: { in: enrolledClassIds }
            }
          }
        },
        include: {
          ExamClass: {
            where: {
              ClassId: { in: enrolledClassIds }
            },
            select: { ClassId: true, DueDate: true }
          },
          SubmissionOverride: {
            where: { StudentId: studentId },
            select: { ExtendedDueDate: true }
          }
        }
      })

      if (!expiredExams || expiredExams.length === 0) return 0

      // 3. Lấy các bài nộp đã có của sinh viên cho các bài thi này
      const examIds = expiredExams.map(e => e.Id)
      const [existingSubmissions, publishedRows] = await Promise.all([
        prisma.submission.findMany({
          where: {
            StudentId: studentId,
            ExamId: { in: examIds }
          },
          select: { ExamId: true }
        }),
        (prisma as any).publishedAssignment.findMany({
          where: { Id: { in: examIds } },
          select: { Id: true, Data: true }
        }).catch(() => [])
      ])
      const submittedExamIds = new Set(existingSubmissions.map(s => s.ExamId))

      const publishedMetaMap = new Map<string, any>()
      for (const pub of (publishedRows || [])) {
        try {
          if (pub?.Data) {
            publishedMetaMap.set(pub.Id, JSON.parse(pub.Data)?.metadata)
          }
        } catch {}
      }

      let createdCount = 0

      for (const exam of expiredExams) {
        if (submittedExamIds.has(exam.Id)) continue

        // Kiểm tra nếu có gia hạn riêng cho sinh viên này (SubmissionOverride)
        const override = exam.SubmissionOverride?.[0]
        if (override?.ExtendedDueDate && new Date(override.ExtendedDueDate) > now) {
          // Sinh viên vẫn còn trong thời gian gia hạn
          continue
        }

        const publishedMeta = publishedMetaMap.get(exam.Id)

        const allowLate = exam.AllowLateSubmission ?? publishedMeta?.allowLateSubmission ?? true
        const latePenaltyType = (exam.LatePenaltyType && exam.LatePenaltyType !== 'NONE') ? exam.LatePenaltyType : (publishedMeta?.latePenaltyType || 'NONE')
        const statusLower = (exam.Status || '').toLowerCase()

        const isLateAllowed = allowLate && latePenaltyType !== 'NONE_LOCKED' && statusLower !== 'closed'
        if (isLateAllowed) {
          const lateSubmitHours = (exam.LateSubmitHours !== undefined && exam.LateSubmitHours !== null)
            ? Number(exam.LateSubmitHours)
            : (publishedMeta?.lateSubmitHours !== undefined ? Number(publishedMeta.lateSubmitHours) : 24)
          const dueDate = exam.DueDate ? new Date(exam.DueDate) : null
          if (dueDate && lateSubmitHours > 0) {
            const lateCutoff = new Date(dueDate.getTime() + lateSubmitHours * 60 * 60 * 1000)
            if (new Date() < lateCutoff) {
              continue
            }
          } else {
            continue
          }
        }

        const classId = exam.ExamClass?.[0]?.ClassId || enrolledClassIds[0]

        // Tạo bản ghi nộp bài 0 điểm với trạng thái Graded & PUBLISHED
        await prisma.submission.create({
          data: {
            Id: uuidv4(),
            ExamId: exam.Id,
            StudentId: studentId,
            ClassId: classId,
            AttemptNumber: 1,
            IsLatest: true,
            SubmittedAt: exam.DueDate || now,
            GradingStatus: 'Graded',
            ReviewStatus: 'PUBLISHED',
            TotalScore: 0,
            RawScore: 0,
            LatePenaltyAmount: 0,
            FinalScore: 0,
            GradedAt: now,
            ReviewedAt: now,
            InstructorFeedback: 'Hệ thống tự động ghi nhận 0 điểm do quá hạn nộp bài (Quá hạn deadline).',
            ReportData: JSON.stringify({
              overallFeedback: 'Hệ thống tự động ghi nhận 0 điểm do học sinh không nộp bài trước thời hạn quy định.',
              isAutoZero: true,
              score: 0,
              passedRules: 0,
              totalRules: 0
            })
          }
        }).catch((err) => {
          // Bỏ qua lỗi duplicate nếu đồng thời đã được tạo
          if (err?.code !== 'P2002') {
            logger.warn(`Lỗi tạo auto-zero submission cho student ${studentId}, exam ${exam.Id}: ${err.message}`)
          }
        })

        createdCount++
      }

      return createdCount
    } catch (error: any) {
      logger.error(`Error in syncZeroScoresForStudent for student ${studentId}:`, error)
      return 0
    }
  }

  /**
   * Đồng bộ tạo điểm 0 cho tất cả học sinh chưa nộp bài của một bài tập đã hết hạn.
   */
  async syncZeroScoresForExam(examId: string): Promise<number> {
    try {
      const now = new Date()

      // Throttle: chỉ chạy tối đa 1 lần mỗi 60 giây cho mỗi exam
      const last = AutoZeroSubmissionService.lastSyncExam.get(examId)
      if (last && now.getTime() - last < 60000) {
        return 0
      }
      AutoZeroSubmissionService.lastSyncExam.set(examId, now.getTime())

      // 1. Tìm thông tin bài thi
      const exam: any = await (prisma.exam as any).findUnique({
        where: { Id: examId },
        include: {
          ExamClass: {
            include: {
              Class: {
                include: {
                  StudentClass: true
                }
              }
            }
          },
          SubmissionOverride: true
        }
      })

      if (!exam || !exam.DueDate || new Date(exam.DueDate) >= now) {
        return 0 // Chưa hết hạn hoặc không tồn tại
      }

      // LƯU Ý: Nếu bài tập cho phép nộp trễ và CÓ CHỌN hình thức trừ điểm (LatePenaltyType !== 'NONE')
      // Thì sinh viên vẫn được phép nộp trễ (và bị trừ điểm khi nộp), KHÔNG tự động chốt 0 điểm
      // Chỉ chốt 0 điểm khi bài tập không cho nộp trễ hoặc bài đã Closed
      let publishedMeta: any = null
      try {
        const pubRow = await prisma.publishedAssignment.findUnique({
          where: { Id: exam.Id },
          select: { Data: true },
        })
        if (pubRow?.Data) {
          publishedMeta = JSON.parse(pubRow.Data)?.metadata
        }
      } catch (e) {}

      const allowLate = exam.AllowLateSubmission ?? publishedMeta?.allowLateSubmission ?? true
      const latePenaltyType = (exam.LatePenaltyType && exam.LatePenaltyType !== 'NONE') ? exam.LatePenaltyType : (publishedMeta?.latePenaltyType || 'NONE')
      const statusLower = (exam.Status || '').toLowerCase()

      const isLateAllowed = allowLate && latePenaltyType !== 'NONE_LOCKED' && statusLower !== 'closed'
      if (isLateAllowed) {
        const lateSubmitHours = (exam.LateSubmitHours !== undefined && exam.LateSubmitHours !== null)
          ? Number(exam.LateSubmitHours)
          : (publishedMeta?.lateSubmitHours !== undefined ? Number(publishedMeta.lateSubmitHours) : 24)
        const dueDate = exam.DueDate ? new Date(exam.DueDate) : null
        if (dueDate && lateSubmitHours > 0) {
          const lateCutoff = new Date(dueDate.getTime() + lateSubmitHours * 60 * 60 * 1000)
          if (new Date() < lateCutoff) {
            return 0
          }
        } else {
          return 0
        }
      }

      // 2. Thu thập danh sách sinh viên thuộc các lớp được giao bài
      const studentClassMap = new Map<string, string>() // studentId -> classId
      if (exam.ExamClass && Array.isArray(exam.ExamClass)) {
        for (const ec of exam.ExamClass) {
          if (ec.Class?.StudentClass) {
            for (const sc of ec.Class.StudentClass) {
              studentClassMap.set(sc.UserId, ec.ClassId)
            }
          }
        }
      }

      if (studentClassMap.size === 0) return 0

      // 3. Tìm các sinh viên đã có bài nộp
      const studentIds = Array.from(studentClassMap.keys())
      const existingSubmissions = await prisma.submission.findMany({
        where: {
          ExamId: examId,
          StudentId: { in: studentIds }
        },
        select: { StudentId: true }
      })
      const submittedStudentIds = new Set(existingSubmissions.map(s => s.StudentId))

      const overrideMap = new Map<string, any>((exam.SubmissionOverride || []).map((o: any) => [o.StudentId, o.ExtendedDueDate]))

      let createdCount = 0

      for (const [studentId, classId] of studentClassMap.entries()) {
        if (submittedStudentIds.has(studentId)) continue

        const extendedDue = overrideMap.get(studentId)
        if (extendedDue && new Date(extendedDue as any) > now) {
          continue // Còn trong thời gian gia hạn
        }

        await prisma.submission.create({
          data: {
            Id: uuidv4(),
            ExamId: exam.Id,
            StudentId: studentId,
            ClassId: classId,
            AttemptNumber: 1,
            IsLatest: true,
            SubmittedAt: exam.DueDate,
            GradingStatus: 'Graded',
            ReviewStatus: 'PUBLISHED',
            TotalScore: 0,
            RawScore: 0,
            LatePenaltyAmount: 0,
            FinalScore: 0,
            GradedAt: now,
            ReviewedAt: now,
            InstructorFeedback: 'Hệ thống tự động ghi nhận 0 điểm do quá hạn nộp bài (Quá hạn deadline).',
            ReportData: JSON.stringify({
              overallFeedback: 'Hệ thống tự động ghi nhận 0 điểm do học sinh không nộp bài trước thời hạn quy định.',
              isAutoZero: true,
              score: 0,
              passedRules: 0,
              totalRules: 0
            })
          }
        }).catch((err) => {
          if (err?.code !== 'P2002') {
            logger.warn(`Lỗi tạo auto-zero submission cho student ${studentId}, exam ${examId}: ${err.message}`)
          }
        })

        createdCount++
      }

      return createdCount
    } catch (error: any) {
      logger.error(`Error in syncZeroScoresForExam for exam ${examId}:`, error)
      return 0
    }
  }

  /**
   * Quét toàn bộ các bài thi đã quá hạn trên toàn hệ thống để tự động gán điểm 0 cho học sinh chưa nộp.
   */
  async sweepExpiredExams(): Promise<number> {
    try {
      const now = new Date()
      const expiredExams: any[] = await (prisma.exam as any).findMany({
        where: {
          Status: { in: ['Published', 'published', 'PUBLISHED'] },
          DueDate: { lt: now }
        },
        select: { Id: true }
      })

      if (!expiredExams || expiredExams.length === 0) return 0

      let totalCreated = 0
      for (const exam of expiredExams) {
        const count = await this.syncZeroScoresForExam(exam.Id)
        totalCreated += count
      }

      if (totalCreated > 0) {
        logger.info(`[AutoZeroSubmissionService] Đã tự động tạo ${totalCreated} bài nộp 0 điểm cho các bài thi quá hạn.`)
      }

      return totalCreated
    } catch (error: any) {
      logger.error('Error in sweepExpiredExams:', error)
      return 0
    }
  }
}

export const autoZeroSubmissionService = new AutoZeroSubmissionService()

