import { IAuditRepository } from '../../domain/repositories/audit-repository.interface.js'
import { AuditLog } from '../../domain/entities/audit-log.entity.js'
import { AiUsageLog } from '../../domain/entities/ai-usage-log.entity.js'
import { ImportBatch } from '../../domain/entities/import-batch.entity.js'

export class PrismaAuditRepository implements IAuditRepository {
    constructor(private readonly prisma: any) { }

    async createAuditLog(log: AuditLog): Promise<void> {
        await (this.prisma as any).auditLog.create({
            data: {
                Id: log.id,
                EntityName: log.entityName,
                EntityId: log.entityId,
                Action: log.action,
                OldValue: log.oldValue,
                NewValue: log.newValue,
                UserId: log.userId,
                IpAddress: log.ipAddress,
                CreatedAt: log.createdAt
            }
        })
    }

    async findAuditLogs(params: { entityName?: string; entityId?: string; userId?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
        const logs = await (this.prisma as any).auditLog.findMany({
            where: {
                EntityName: params.entityName,
                EntityId: params.entityId,
                UserId: params.userId
            },
            take: params.limit ?? 20,
            skip: params.offset ?? 0,
            orderBy: { CreatedAt: 'desc' }
        })

        return logs.map((l: any) => AuditLog.restore(
            l.Id, l.EntityName, l.EntityId, l.Action, l.OldValue, l.NewValue, l.UserId, l.IpAddress, l.CreatedAt
        ))
    }

    async createAiUsageLog(log: AiUsageLog): Promise<void> {
        await (this.prisma as any).aiUsageLog.create({
            data: {
                Id: log.id,
                UserId: log.userId,
                Model: (log as any).model, // Entity properties might mismatch Prisma naming if not standardized
                PromptTokens: (log as any).promptTokens,
                CompletionTokens: (log as any).completionTokens,
                TotalTokens: (log as any).totalTokens,
                Cost: (log as any).cost,
                Status: (log as any).status,
                CreatedAt: (log as any).createdAt
            }
        })
    }

    async findAiUsageLogs(params: { userId?: string; model?: string; limit?: number; offset?: number }): Promise<AiUsageLog[]> {
        const logs = await (this.prisma as any).aiUsageLog.findMany({
            where: {
                UserId: params.userId,
                ModelUsed: params.model
            },
            take: params.limit ?? 20,
            skip: params.offset ?? 0,
            orderBy: { CreatedAt: 'desc' }
        })

        return logs.map((l: any) => AiUsageLog.restore(
            l.Id, l.UserId, l.ExamId, l.SubmissionId, l.RequestId, l.Provider,
            l.ActionType, l.ModelUsed, l.PromptTokens, l.CompletionTokens,
            l.CostEstimate == null ? null : Number(l.CostEstimate), l.DurationMs,
            l.IsSuccess, l.ErrorMessage, l.CreatedAt
        ))
    }

    async createImportBatch(batch: ImportBatch): Promise<void> {
        await (this.prisma as any).importBatch.create({
            data: {
                Id: batch.id,
                // ... rest of mapping
            }
        })
    }

    async getImportBatch(id: string): Promise<ImportBatch | null> {
        const batch = await (this.prisma as any).importBatch.findUnique({ where: { Id: id } })
        if (!batch) return null
        return (ImportBatch as any).restore(batch)
    }
}
