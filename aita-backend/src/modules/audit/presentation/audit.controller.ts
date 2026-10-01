import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { GetAuditLogsUseCase } from '../application/use-cases/get-audit-logs.use-case.js'
import { GetAiUsageLogsUseCase } from '../application/use-cases/get-ai-usage-logs.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class AuditController extends BaseController {
    constructor(
        private readonly getAuditLogsUseCase: GetAuditLogsUseCase,
        private readonly getAiUsageLogsUseCase: GetAiUsageLogsUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async getAuditLogs(req: Request, res: Response): Promise<void> {
        const query = req.query as any
        this.logger.debug('Fetching audit logs')
        const result = await this.getAuditLogsUseCase.execute({
            entityName: query.entityName,
            entityId: query.entityId,
            userId: query.userId,
            page: Number(query.page || 1),
            limit: Number(query.limit || 20)
        })
        this.ok(res, result, MESSAGES.AUDIT_LIST_SUCCESS)
    }

    async getAiUsageLogs(req: Request, res: Response): Promise<void> {
        const query = req.query as any
        this.logger.debug('Fetching AI usage logs')
        const result = await this.getAiUsageLogsUseCase.execute({
            userId: query.userId,
            model: query.model,
            page: Number(query.page || 1),
            limit: Number(query.limit || 20)
        })
        this.ok(res, result, MESSAGES.AUDIT_AI_SUCCESS)
    }
}
