import { IAuditRepository } from '../../domain/repositories/audit-repository.interface.js'

export class GetAuditLogsUseCase {
    constructor(private readonly auditRepo: IAuditRepository) { }

    async execute(params: { entityName?: string; entityId?: string; userId?: string; page?: number; limit?: number }) {
        const limit = params.limit ?? 20
        const offset = ((params.page ?? 1) - 1) * limit

        return await this.auditRepo.findAuditLogs({
            entityName: params.entityName,
            entityId: params.entityId,
            userId: params.userId,
            limit,
            offset
        })
    }
}
