import { AuditLog } from '../entities/audit-log.entity.js'
import { AiUsageLog } from '../entities/ai-usage-log.entity.js'
import { ImportBatch } from '../entities/import-batch.entity.js'

export interface IAuditRepository {
    createAuditLog(log: AuditLog): Promise<void>
    findAuditLogs(params: { entityName?: string; entityId?: string; userId?: string; limit?: number; offset?: number }): Promise<AuditLog[]>

    createAiUsageLog(log: AiUsageLog): Promise<void>
    findAiUsageLogs(params: { userId?: string; model?: string; limit?: number; offset?: number }): Promise<AiUsageLog[]>

    createImportBatch(batch: ImportBatch): Promise<void>
    getImportBatch(id: string): Promise<ImportBatch | null>
}
