import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { GetGradingSessionStatusUseCase, StartGradingSessionUseCase } from '../application/use-cases/grading.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'
import { assertAssignmentAccess } from '../engine/assignment/assignment-access.js'
import { prisma } from '../../../database/prisma.js'
import { NotFoundError } from '../../../shared/application/app.error.js'

export class GradingController extends BaseController {
    constructor(
        private readonly getGradingSessionStatusUseCase: GetGradingSessionStatusUseCase,
        private readonly startGradingSessionUseCase: StartGradingSessionUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async getSessionStatus(req: Request, res: Response): Promise<void> {
        const sessionId = req.params.sessionId as string
        const session = await prisma.gradingSession.findUnique({ where: { Id: sessionId }, select: { Submission: { select: { ExamId: true } } } })
        if (!session) throw new NotFoundError('Không tìm thấy phiên chấm.')
        if (req.user?.role.toUpperCase() !== 'ADMIN') {
            if (!session.Submission?.ExamId) throw new NotFoundError('Không tìm thấy bài tập của phiên chấm.')
            await assertAssignmentAccess(session.Submission.ExamId, req.user!, false)
        }
        this.logger.debug(`Fetching grading session status: ${sessionId}`)
        const result = await this.getGradingSessionStatusUseCase.execute(sessionId)
        this.ok(res, result, MESSAGES.GRADING_STATUS_SUCCESS)
    }

    async startGrading(req: Request, res: Response): Promise<void> {
        const { assignmentId } = req.body
        await assertAssignmentAccess(assignmentId, req.user!, true)
        this.logger.info(`Starting grading session for assignment: ${assignmentId}`)
        const result = await this.startGradingSessionUseCase.execute(assignmentId)
        memoryCache.invalidatePrefix('sub_detail_')
        memoryCache.invalidatePrefix('subs_list_')
        memoryCache.invalidatePrefix('subs_recent_')
        memoryCache.invalidatePrefix('student_dash_')
        // 202 Accepted
        this.ok(res, result, MESSAGES.GRADING_START_SUCCESS) 
    }
}
