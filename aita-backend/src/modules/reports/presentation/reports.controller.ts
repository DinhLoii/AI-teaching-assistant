import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { GetAdminReportUseCase, GetSystemHealthUseCase } from '../application/use-cases/reports.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class ReportsController extends BaseController {
    constructor(
        private readonly getAdminReportUseCase: GetAdminReportUseCase,
        private readonly getSystemHealthUseCase: GetSystemHealthUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async adminReport(req: Request, res: Response): Promise<void> {
        const period = String(req.query.period ?? '30d')
        this.logger.debug(`Fetching admin report for period: ${period}`)
        const result = await this.getAdminReportUseCase.execute(period)
        this.ok(res, result, MESSAGES.REPORTS_ADMIN_SUCCESS)
    }

    async systemHealth(_req: Request, res: Response): Promise<void> {
        this.logger.debug('Fetching system health')
        const result = await this.getSystemHealthUseCase.execute()
        this.ok(res, result, MESSAGES.REPORTS_HEALTH_SUCCESS)
    }
}
