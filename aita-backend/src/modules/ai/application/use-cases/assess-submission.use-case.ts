import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class AssessSubmissionUseCase {
    constructor(
        private readonly uow: IUnitOfWork,
        private readonly aiService: IAIService,
        private readonly aiRepo: IAiRepository
    ) { }

    async execute(submissionId: string) {
        const sub = await this.uow.resolve<any>(Symbol.for('SubmissionRepository')).findById(submissionId)
        if (!sub) throw new NotFoundError(MESSAGES.SUBMISSION_NOT_FOUND)

        const result = await this.aiService.assess({
            content: '',
            assignmentTitle: (sub as any).Exam?.Title ?? undefined,
            assignmentDescription: (sub as any).Exam?.Description ?? undefined,
        })

        await this.aiRepo.logInteraction((sub as any).StudentId ?? '', 'assess', submissionId, JSON.stringify(result))

        // Update submission with AI score and feedback
        const prisma = (this.uow as any).prisma || await this.uow.resolve<any>(Symbol.for('PrismaClient'))
        if (prisma && prisma.submission) {
            await prisma.submission.update({
                where: { Id: submissionId },
                data: {
                    TotalScore: (result as any).aiScore,
                    InstructorFeedback: (result as any).feedback,
                    GradingStatus: 'GRADED_BY_AI',
                }
            })
        }

        return { submission: sub, aiScore: (result as any).aiScore, feedback: (result as any).feedback }
    }
}
