import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { RagCodeAssessmentUseCase } from './rag-code-assessment.use-case.js'

export class AssessSubmissionUseCase {
    private readonly ragAssessor: RagCodeAssessmentUseCase

    constructor(
        private readonly uow: IUnitOfWork,
        private readonly aiService: IAIService,
        private readonly aiRepo: IAiRepository,
        ragAssessor?: RagCodeAssessmentUseCase
    ) {
        this.ragAssessor = ragAssessor || new RagCodeAssessmentUseCase();
        (this.aiService as any);
    }

    async execute(submissionId: string) {
        const sub = await this.uow.resolve<any>(Symbol.for('SubmissionRepository')).findById(submissionId)
        if (!sub) throw new NotFoundError(MESSAGES.SUBMISSION_NOT_FOUND)

        // Execute deep grounded RAG Assessment
        const ragResult = await this.ragAssessor.execute(submissionId)

        await this.aiRepo.logInteraction(
            (sub as any).StudentId ?? '',
            'rag-assess',
            submissionId,
            JSON.stringify(ragResult)
        )

        // Update submission with AI score, feedback, and grading status
        const prisma = (this.uow as any).prisma || await this.uow.resolve<any>(Symbol.for('PrismaClient'))
        if (prisma && prisma.submission) {
            const rubricSourceLabel =
                ragResult.rubricSource === 'OFFICIAL_TEACHER_RUBRIC'
                    ? 'Barem chính thức của giảng viên'
                    : ragResult.rubricSource === 'AI_PROPOSED_RUBRIC'
                    ? 'Barem do AI đề xuất từ đề bài (chưa phải chính thức)'
                    : 'Tiêu chuẩn Clean Code tổng quát'

            const formattedFeedback = [
                `🤖 [Đánh giá tự động từ AITA RAG - ${ragResult.aiScore}/10]`,
                `Tiêu chí: ${rubricSourceLabel}`,
                ragResult.disclaimer ? `⚠️ Lưu ý: ${ragResult.disclaimer}` : '',
                ragResult.overallVerdict,
                ragResult.pedagogicalSummary ? `\n💡 Hướng dẫn cải thiện: ${ragResult.pedagogicalSummary}` : '',
                ragResult.strengths?.length ? `\n✅ Điểm mạnh:\n${ragResult.strengths.map(s => `- ${s}`).join('\n')}` : '',
                ragResult.areasForImprovement?.length ? `\n⚠️ Cần tối ưu:\n${ragResult.areasForImprovement.map(a => `- ${a}`).join('\n')}` : ''
            ].filter(Boolean).join('\n')

            await prisma.submission.update({
                where: { Id: submissionId },
                data: {
                    TotalScore: ragResult.aiScore,
                    FinalScore: ragResult.aiScore,
                    RawScore: ragResult.aiScore,
                    InstructorFeedback: formattedFeedback,
                    GradingStatus: 'GRADED_BY_AI',
                    ReportData: JSON.stringify({
                        ragAssessment: ragResult,
                        evaluatedAt: new Date().toISOString(),
                    }),
                }
            })
        }

        return {
            submission: sub,
            aiScore: ragResult.aiScore,
            feedback: ragResult.pedagogicalSummary || ragResult.overallVerdict,
            ragAssessment: ragResult
        }
    }
}
