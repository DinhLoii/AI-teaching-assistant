import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { GetGradingSessionStatusUseCase, StartGradingSessionUseCase } from '../application/use-cases/grading.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

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
        this.logger.debug(`Fetching grading session status: ${sessionId}`)
        const result = await this.getGradingSessionStatusUseCase.execute(sessionId)
        this.ok(res, result, MESSAGES.GRADING_STATUS_SUCCESS)
    }

    async startGrading(req: Request, res: Response): Promise<void> {
        const { assignmentId } = req.body
        this.logger.info(`Starting grading session for assignment: ${assignmentId}`)
        const result = await this.startGradingSessionUseCase.execute(assignmentId)
        // 202 Accepted
        this.ok(res, result, MESSAGES.GRADING_START_SUCCESS) 
    }
}
