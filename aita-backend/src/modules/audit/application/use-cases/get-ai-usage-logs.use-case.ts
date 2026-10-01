import { IAuditRepository } from '../../domain/repositories/audit-repository.interface.js'

export class GetAiUsageLogsUseCase {
    constructor(private readonly auditRepo: IAuditRepository) { }

    async execute(params: { userId?: string; model?: string; page?: number; limit?: number }) {
        const limit = params.limit ?? 20
        const offset = ((params.page ?? 1) - 1) * limit

        return await this.auditRepo.findAiUsageLogs({
            userId: params.userId,
            model: params.model,
            limit,
            offset
        })
    }
}
