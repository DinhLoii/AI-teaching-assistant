import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError } from '../../../../shared/application/app.error.js'
import { ReopenSubmissionRequestDto } from '../dtos/submission.dto.js'
import { prisma } from '../../../../database/prisma.js'

export class ReopenSubmissionUseCase implements IUseCase<{ dto: ReopenSubmissionRequestDto; user: AuthUser }, any> {
  async execute({ dto, user }: { dto: ReopenSubmissionRequestDto; user: AuthUser }) {
    const { examId, studentId, classId, extendedDueDate, penaltyMode, customPenaltyRate, flatPenaltyAmount, scoreCap, reason } = dto.data

    if (!examId || !studentId) {
      throw new ValidationError('examId và studentId là bắt buộc')
    }

    const exam = await prisma.exam.findUnique({
      where: { Id: examId },
      select: { Id: true, Title: true, DueDate: true }
    })
    if (!exam) {
      throw new NotFoundError('Không tìm thấy bài tập/đề thi')
    }

    const parsedDueDate = new Date(extendedDueDate)
    if (isNaN(parsedDueDate.getTime())) {
      throw new ValidationError('Ngày gia hạn hạn nộp không hợp lệ')
    }

    // Upsert Submission Override record
    const override = await prisma.submissionOverride.upsert({
      where: {
        ExamId_StudentId: {
          ExamId: examId,
          StudentId: studentId,
        }
      },
      create: {
        ExamId: examId,
        StudentId: studentId,
        ClassId: classId,
        ExtendedDueDate: parsedDueDate,
        PenaltyMode: penaltyMode,
        CustomPenaltyRate: customPenaltyRate !== undefined ? customPenaltyRate : null,
        FlatPenaltyAmount: flatPenaltyAmount !== undefined ? flatPenaltyAmount : null,
        ScoreCap: scoreCap !== undefined ? scoreCap : null,
        Reason: reason || 'Giảng viên cho phép nộp lại',
        CreatedBy: user.id,
      },
      update: {
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
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        ExamId: examId,
        StudentId: studentId,
      },
      orderBy: { AttemptNumber: 'desc' }
    })

    if (existingSubmission) {
      await prisma.submission.update({
        where: { Id: existingSubmission.Id },
        data: {
          IsReopened: true,
          ReopenReason: reason || 'Giảng viên cho phép nộp lại',
        }
      })
    }

    // Create Notification for the student
    try {
      const notif = await prisma.notification.create({
        data: {
          Title: `Gia hạn nộp bài: ${exam.Title}`,
          Message: `Giảng viên đã mở lại bài nộp "${exam.Title}" cho bạn. Hạn nộp mới: ${parsedDueDate.toLocaleString('vi-VN')}.`,
          Type: 'ASSIGNMENT_REOPENED',
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
