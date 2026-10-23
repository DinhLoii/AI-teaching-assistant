import { publishNotification } from '../../../../shared/infrastructure/publish-notification.js'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError } from '../../../../shared/application/app.error.js'
import { ReopenSubmissionRequestDto } from '../dtos/submission.dto.js'
import { prisma } from '../../../../database/prisma.js'
import { assertAssignmentAccess } from '../../../grading/engine/assignment/assignment-access.js'

export class ReopenSubmissionUseCase implements IUseCase<{ dto: ReopenSubmissionRequestDto; user: AuthUser }, any> {
  constructor(private readonly db: any = prisma) {}
  async execute({ dto, user }: { dto: ReopenSubmissionRequestDto; user: AuthUser }) {
    const prisma = this.db
    const { examId, studentId, classId, extendedDueDate, penaltyMode, customPenaltyRate, flatPenaltyAmount, scoreCap, reason } = dto.data

    if (!examId || !studentId) {
      throw new ValidationError('examId và studentId là bắt buộc')
    }

    await assertAssignmentAccess(examId, user, true, prisma)
    const exam = await prisma.exam.findUnique({
      where: { Id: examId },
      select: { Id: true, Title: true, DueDate: true, SubjectId: true, ExamClass: { select: { ClassId: true } } }
    })
    if (!exam) {
      throw new NotFoundError('Không tìm thấy bài tập/đề thi')
    }

    const parsedDueDate = new Date(extendedDueDate)
    if (isNaN(parsedDueDate.getTime())) {
      throw new ValidationError('Ngày gia hạn hạn nộp không hợp lệ')
    }
    if (parsedDueDate.getTime() <= Date.now()) throw new ValidationError('Hạn gia hạn phải ở tương lai')
    const student = await prisma.user.findUnique({ where: { Id: studentId }, select: { Id: true } })
    if (!student) throw new ValidationError('Không tìm thấy tài khoản sinh viên. Vui lòng tải lại danh sách và thử lại.')
    if (!exam.ExamClass.length && !exam.SubjectId) throw new ValidationError('Bài tập chưa được gắn với lớp học hoặc môn học')
    const enrollment = await prisma.studentClass.findFirst({
      where: {
        UserId: studentId,
        ...(classId ? { ClassId: classId } : {}),
        Class: exam.ExamClass.length
          ? { Id: { in: exam.ExamClass.map((entry: any) => entry.ClassId) } }
          : { SubjectId: exam.SubjectId },
      }, select: { ClassId: true },
    })
    if (!enrollment) throw new ValidationError('Sinh viên không thuộc lớp được giao bài tập này')

    const override = await prisma.$transaction(async (tx: any) => {
    // Upsert Submission Override record
    const override = await tx.submissionOverride.upsert({
      where: {
        ExamId_StudentId: {
          ExamId: examId,
          StudentId: studentId,
        }
      },
      create: {
        ExamId: examId,
        StudentId: studentId,
        ClassId: enrollment.ClassId,
        ExtendedDueDate: parsedDueDate,
        PenaltyMode: penaltyMode,
        CustomPenaltyRate: customPenaltyRate !== undefined ? customPenaltyRate : null,
        FlatPenaltyAmount: flatPenaltyAmount !== undefined ? flatPenaltyAmount : null,
        ScoreCap: scoreCap !== undefined ? scoreCap : null,
        Reason: reason || 'Giảng viên cho phép nộp lại',
        CreatedBy: user.id,
      },
      update: {
        ClassId: enrollment.ClassId,
        ExtendedDueDate: parsedDueDate,
        PenaltyMode: penaltyMode,
        CustomPenaltyRate: customPenaltyRate !== undefined ? customPenaltyRate : null,
        FlatPenaltyAmount: flatPenaltyAmount !== undefined ? flatPenaltyAmount : null,
        ScoreCap: scoreCap !== undefined ? scoreCap : null,
        Reason: reason || 'Giảng viên cho phép nộp lại',
        CreatedBy: user.id,
      }
    })

    // Update existing submission if present to mark IsReopened = true
    const existingSubmission = await tx.submission.findFirst({
      where: {
        ExamId: examId,
        StudentId: studentId,
        ClassId: enrollment.ClassId,
      },
      orderBy: { AttemptNumber: 'desc' }
    })

    if (existingSubmission) {
      await tx.submission.update({
        where: { Id: existingSubmission.Id },
        data: {
          IsReopened: true,
          ReopenReason: reason || 'Giảng viên cho phép nộp lại',
        }
      })
    }
    return override
    })

    // Create Notification for the student
    try {
      const notif = await prisma.notification.create({
        data: {
          Title: `Gia hạn nộp bài: ${exam.Title}`,
          Message: `Giảng viên đã mở lại bài nộp "${exam.Title}" cho bạn. Hạn nộp mới: ${parsedDueDate.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.`,
          Type: 'ASSIGNMENT_REOPENED',
          CreatedAt: new Date(),
          ReferenceId: examId,
          ReferenceType: 'EXAM',
          CreatedBy: user.id,
        }
      })

      await prisma.notificationRecipient.create({
        data: {
          NotificationId: notif.Id,
          UserId: studentId,
          IsRead: false,
        }
      })
      publishNotification([studentId], notif)
    } catch (notifErr) {
      console.error('Failed to create notification for reopened submission:', notifErr)
    }

    return {
      success: true,
      message: 'Đã mở lại bài nộp và cập nhật hạn nộp mới thành công',
      override: {
        id: override.Id,
        examId: override.ExamId,
        studentId: override.StudentId,
        extendedDueDate: override.ExtendedDueDate,
        penaltyMode: override.PenaltyMode,
        customPenaltyRate: override.CustomPenaltyRate,
        flatPenaltyAmount: override.FlatPenaltyAmount,
        scoreCap: override.ScoreCap,
        reason: override.Reason,
      }
    }
  }
}
