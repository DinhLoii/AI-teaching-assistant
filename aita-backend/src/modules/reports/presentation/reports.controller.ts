import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { GetAdminReportUseCase, GetSystemHealthUseCase } from '../application/use-cases/reports.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'

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
        res.setHeader('Cache-Control', 'no-store')
        try {
            const result = await this.getAdminReportUseCase.execute(period, req.query.start as string | undefined, req.query.end as string | undefined)
            this.ok(res, result, MESSAGES.REPORTS_ADMIN_SUCCESS)
        } catch (error) {
            if (error instanceof RangeError) { res.status(400).json({ success: false, message: error.message }); return }
            throw error
        }
    }

    async systemHealth(_req: Request, res: Response): Promise<void> {
        this.logger.debug('Fetching system health')
        const cacheKey = 'reports_system_health'
        const cached = memoryCache.get(cacheKey)
        if (cached) {
            this.ok(res, cached, MESSAGES.REPORTS_HEALTH_SUCCESS)
            return
        }
        const result = await this.getSystemHealthUseCase.execute()
        memoryCache.set(cacheKey, result, 15)
        this.ok(res, result, MESSAGES.REPORTS_HEALTH_SUCCESS)
    }
}
