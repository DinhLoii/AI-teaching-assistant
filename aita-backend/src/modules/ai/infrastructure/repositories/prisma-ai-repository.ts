import { PrismaClient } from '@prisma/client'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'

export class PrismaAiRepository implements IAiRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async logInteraction(userId: string, model: string, _prompt: string, _response: string) {
        await (this.prisma as any).aiUsageLog.create({
            data: {
                User: { connect: { Id: userId } },
                ModelUsed: model,
                ActionType: 'Interaction',
                CreatedAt: new Date(),
                IsSuccess: true
            }
        })
    }

    async listUserInteractions(userId: string, limit: number = 20) {
        return await (this.prisma as any).aiUsageLog.findMany({
            where: { UserId: userId },
            take: limit,
            orderBy: { CreatedAt: 'desc' }
        })
    }
}
