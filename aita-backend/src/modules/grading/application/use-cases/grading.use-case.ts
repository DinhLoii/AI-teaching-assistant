import { IGradingRepository } from '../../domain/repositories/grading-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { container } from '../../../../shared/infrastructure/di-container.js'
import { globalAssignmentRepository } from '../../engine/assignment/PublishedAssignmentRepository.js'

export class GetGradingSessionStatusUseCase {
    constructor(private readonly gradingRepo: IGradingRepository) { }

    async execute(sessionId: string) {
        const session = await this.gradingRepo.getSession(sessionId)
        if (!session) throw new NotFoundError(MESSAGES.GRADING_SESSION_NOT_FOUND)

        const jobs = await this.gradingRepo.findJobsBySession(sessionId)
        return { ...session, jobs }
    }
}

export class StartGradingSessionUseCase {
    constructor(private readonly gradingRepo: IGradingRepository) { 
        (this.gradingRepo as any); // Prevent TS unused variable error
    }

    async execute(assignmentId: string) {
        // Fetch assignment metadata from the engine
        const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId)
        if (!publishedAssignment) {
            throw new NotFoundError('Assignment chưa được publish hoặc không tồn tại trong Engine.')
        }

        // Fetch all pending submissions for this assignment from Prisma
        const uow = container.get<any>(Symbol.for('UnitOfWork'))
        const submissionRepo = uow.resolve(Symbol.for('SubmissionRepository'))
        const pendingSubmissions = await submissionRepo.findMany({ examId: assignmentId })
        // Filter those that need grading (e.g. status isn't graded)
        // Here we just grade all of them for this batch session, or filter by Pending if your domain supports it.
        const toGrade = pendingSubmissions.filter((s: any) => !['graded', 'processing'].includes(String(s.gradingStatus || s.status || '').toLowerCase()))

        if (toGrade.length === 0) {
            throw new Error('Không có bài nộp nào đang chờ chấm.')
        }

        // Get the engine's SubmissionController instance to reuse its enqueue method
        const { engineSubmissionController } = await import('../../engine/modules/submissions/routes/index.js')
        if (!engineSubmissionController) throw new Error('Engine controller is not initialized.')

        for (const sub of toGrade) {
            if (sub.zipFileUrl) await engineSubmissionController.executeGradingForSubmission(sub.id)
        }
        
        return { message: `Đã đưa ${toGrade.length} bài nộp vào hàng đợi chấm điểm.` }
    }
}
