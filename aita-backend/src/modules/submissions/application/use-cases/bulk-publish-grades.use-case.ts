import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { prisma } from '../../../../database/prisma.js'
import { v4 as uuidv4 } from 'uuid'

export class BulkPublishGradesUseCase implements IUseCase<{ assignmentId: string; user: AuthUser }, { success: boolean, count: number }> {
  constructor(private readonly submissionRepo: ISubmissionRepository) { }

  async execute({ assignmentId, user }: { assignmentId: string; user: AuthUser }) {
    // Find all submissions for this assignment
    const submissions = await this.submissionRepo.findMany({ examId: assignmentId })
    
    let count = 0
    const publishedStudentIds = new Set<string>()

    for (const submission of submissions) {
      if (submission.reviewStatus === 'PUBLISHED') {
        continue // Skip if already published
      }

      // If it hasn't been graded formally, complete grading
      if (!submission.isGraded()) {
        submission.completeGrading(submission.totalScore ?? 0)
      }

      // Review logic: fallback to finalScore, then totalScore
      const effectiveScore = submission.finalScore ?? submission.totalScore ?? 0
      submission.review(user.id, effectiveScore)
      
      await this.submissionRepo.save(submission)
      count++

      if (submission.studentId) {
        publishedStudentIds.add(submission.studentId)
      }
    }

    // Send notification to students that grades have been published
    if (publishedStudentIds.size > 0) {
      try {
        const examRecord = await prisma.exam.findUnique({
          where: { Id: assignmentId },
          select: { Title: true }
        })
        const examTitle = examRecord?.Title || 'Bài tập'

        const notifId = uuidv4()
        await prisma.notification.create({
          data: {
            Id: notifId,
            Title: `Điểm số đã được công bố: ${examTitle}`,
            Message: `Giảng viên đã công bố kết quả điểm số cho bài tập "${examTitle}". Vui lòng nhấp vào đây để xem chi tiết điểm số và nhận xét.`,
            Type: 'GRADE_PUBLISHED',
            ReferenceId: assignmentId,
            ReferenceType: 'ASSIGNMENT',
            CreatedBy: user.id,
            CreatedAt: new Date(),
            NotificationRecipient: {
              create: Array.from(publishedStudentIds).map(stId => ({
                UserId: stId,
                IsRead: false
              }))
            }
          }
        })
      } catch (err) {
        console.error('[BulkPublishGrades] Failed to create grade published notification:', err)
      }
    }

    return { success: true, count }
  }
}

