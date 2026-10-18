import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import type { AuthUser } from '../../../../types/express.js'
import { PublishGradeRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { prisma } from '../../../../database/prisma.js'
import { calculateLatePenalty } from '../../domain/utils/late-penalty-calculator.js'
import { publishNotification } from '../../../../shared/infrastructure/publish-notification.js'

export class PublishGradeUseCase implements IUseCase<{ id: string; dto: PublishGradeRequestDto, user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly submissionRepo: ISubmissionRepository) { }

  async execute({ id, dto, user }: { id: string; dto: PublishGradeRequestDto, user: AuthUser }) {
    const submission = await this.submissionRepo.findById(id)
    if (!submission) throw new NotFoundError(MESSAGES.SUBMISSION_NOT_FOUND)

    // Fetch Exam details & SubmissionOverride if any
    const dbSub = await prisma.submission.findUnique({
      where: { Id: id },
      include: {
        Exam: true,
      }
    })

    // Re-publishing without an edit must reuse the unpenalized score.
    const rawScoreInput = Number(dto.data.score ?? dbSub?.RawScore ?? submission.totalScore ?? 0)

    let override = null
    if (dbSub?.ExamId && dbSub?.StudentId) {
      override = await prisma.submissionOverride.findUnique({
        where: {
          ExamId_StudentId: {
            ExamId: dbSub.ExamId,
            StudentId: dbSub.StudentId,
          }
        }
      })
    }

    const penaltyCalc = calculateLatePenalty({
      rawScore: rawScoreInput,
      submittedAt: dbSub?.SubmittedAt || (submission as any).submittedAt || null,
      originalDueDate: dbSub?.Exam?.DueDate || null,
      override: override ? {
        extendedDueDate: override.ExtendedDueDate,
        penaltyMode: override.PenaltyMode,
        customPenaltyRate: override.CustomPenaltyRate ? Number(override.CustomPenaltyRate) : null,
        flatPenaltyAmount: override.FlatPenaltyAmount ? Number(override.FlatPenaltyAmount) : null,
        scoreCap: override.ScoreCap ? Number(override.ScoreCap) : null,
      } : null,
      examPenaltyType: dbSub?.Exam?.LatePenaltyType,
      examPenaltyValue: dbSub?.Exam?.LatePenaltyValue ? Number(dbSub.Exam.LatePenaltyValue) : null,
      maxLatePenalty: dbSub?.Exam?.MaxLatePenalty ? Number(dbSub.Exam.MaxLatePenalty) : null,
    })

    const finalScoreNum = dto.data.finalScore !== undefined ? Number(dto.data.finalScore) : penaltyCalc.finalScore

    // Complete grading sequence if not already marked as Graded
    if (!submission.isGraded()) {
      submission.completeGrading(rawScoreInput)
    }
    
    const shouldPublish = dto.data.isPublished !== false

    if (!shouldPublish) {
      submission.unpublish()
      await this.submissionRepo.save(submission)
      await prisma.submission.update({
        where: { Id: id },
        data: {
          ReviewStatus: 'DRAFT',
          RawScore: penaltyCalc.rawScore,
          LatePenaltyAmount: penaltyCalc.latePenaltyAmount,
          FinalScore: finalScoreNum,
          ...(dto.data.feedback !== undefined ? { InstructorFeedback: dto.data.feedback } : {}),
        }
      })
    } else {
      // Apply review & publish
      submission.review(
        user.id,
        finalScoreNum,
        dto.data.feedback
      )
      await this.submissionRepo.save(submission)

      // Update RawScore, LatePenaltyAmount and ReviewStatus in Prisma database
      await prisma.submission.update({
        where: { Id: id },
        data: {
          RawScore: penaltyCalc.rawScore,
          LatePenaltyAmount: penaltyCalc.latePenaltyAmount,
          FinalScore: finalScoreNum,
          ReviewStatus: 'PUBLISHED',
          ...(dto.data.feedback !== undefined ? { InstructorFeedback: dto.data.feedback } : {}),
        }
      })

      // Send a notification to the student about published grade
      if (dbSub?.StudentId && dbSub?.Exam) {
        try {
          const notif = await prisma.notification.create({
            data: {
              Title: `Điểm bài tập ${dbSub.Exam.Title || 'mới'} đã được công bố`,
              Message: `Giảng viên đã công bố kết quả chấm theo Barem Rubric AI cho bài "${dbSub.Exam.Title}". Nhấn để xem kết quả chi tiết.`,
              Type: 'GRADE_PUBLISHED',
              CreatedAt: new Date(),
              ReferenceId: dbSub.ExamId,
              ReferenceType: 'ASSIGNMENT',
              CreatedBy: user.id,
              NotificationRecipient: {
                create: {
                  UserId: dbSub.StudentId,
                  IsRead: false,
                },
              },
            },
          })
          // Push real-time SSE event to the student if they have an open connection
          publishNotification([dbSub.StudentId], notif)
        } catch (notifErr) {
          // ignore error to not block grading
        }
      }
    }

    const updatedSub = await prisma.submission.findUnique({
      where: { Id: id },
      include: {
        User_Submission_StudentIdToUser: true,
        Exam: true,
        Class: true,
      }
    })

    return SubmissionResponseDto.from(updatedSub || (submission as any), user.role)
  }
}
