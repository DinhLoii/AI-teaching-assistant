import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import {
    GetOverviewUseCase,
    GetActivityLogsUseCase,
    GetLecturerReportUseCase,
    GetStudentProgressUseCase,
    GetStudentHistoryUseCase
} from '../application/use-cases/stats.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class StatsController extends BaseController {
    constructor(
        private readonly getOverviewUseCase: GetOverviewUseCase,
        private readonly getActivityLogsUseCase: GetActivityLogsUseCase,
        private readonly getLecturerReportUseCase: GetLecturerReportUseCase,
        private readonly getStudentProgressUseCase: GetStudentProgressUseCase,
        private readonly getStudentHistoryUseCase: GetStudentHistoryUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async overview(req: Request, res: Response): Promise<void> {
        const user = (req as any).user
        this.logger.debug(`Fetching overview for user: ${user.id}`)
        const result = await this.getOverviewUseCase.execute(user)
        this.ok(res, result, MESSAGES.STATS_OVERVIEW_SUCCESS)
    }

    async activityLogs(req: Request, res: Response): Promise<void> {
        const query = req.query as any
        this.logger.debug('Fetching activity logs')
        const result = await this.getActivityLogsUseCase.execute({
            action: query.action,
            limit: Number(query.limit || 50)
        })
        this.ok(res, result, MESSAGES.STATS_ACTIVITY_SUCCESS)
    }

    async lecturerReport(req: Request, res: Response): Promise<void> {
        const lecturerId = (req as any).user.id
        const classId = req.query.classId as string | undefined
        this.logger.debug(`Fetching lecturer report for: ${lecturerId}`)
        const result = await this.getLecturerReportUseCase.execute(lecturerId, classId)
        this.ok(res, result, MESSAGES.STATS_LECTURER_SUCCESS)
    }

    async studentProgress(req: Request, res: Response): Promise<void> {
        const studentId = (req as any).user.id
        this.logger.debug(`Fetching student progress for: ${studentId}`)
        const result = await this.getStudentProgressUseCase.execute(studentId)
        this.ok(res, result, MESSAGES.STATS_STUDENT_PROGRESS_SUCCESS)
    }

    async studentHistory(req: Request, res: Response): Promise<void> {
        const studentId = (req as any).user.id
        this.logger.debug(`Fetching student history for: ${studentId}`)
        const result = await this.getStudentHistoryUseCase.execute(studentId)
        this.ok(res, result, MESSAGES.STATS_STUDENT_HISTORY_SUCCESS)
    }
}
