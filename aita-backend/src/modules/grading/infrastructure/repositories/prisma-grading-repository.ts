import { PrismaClient } from '@prisma/client'
import { IGradingRepository } from '../../domain/repositories/grading-repository.interface.js'
import { GradingJob } from '../../domain/entities/grading-job.entity.js'
import { GradingSession } from '../../domain/entities/grading-session.entity.js'

export class PrismaGradingRepository implements IGradingRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async createSession(s: GradingSession): Promise<void> {
        await (this.prisma as any).gradingSession.create({
            data: {
                Id: s.id,
                SubmissionId: (s as any).submissionId,
                Status: (s as any).status,
                CreatedAt: (s as any).createdAt
            }
        })
    }

    async getSession(id: string): Promise<GradingSession | null> {
        const s = await (this.prisma as any).gradingSession.findUnique({ where: { Id: id } })
        if (!s) return null
        return (GradingSession as any).restore(s)
    }

    async saveSession(s: GradingSession): Promise<void> {
        await (this.prisma as any).gradingSession.update({
            where: { Id: s.id },
            data: {
                Status: (s as any).status,
                CompletedAt: (s as any).completedAt
            }
        })
    }

    async createJob(j: GradingJob): Promise<void> {
        await (this.prisma as any).gradingJob.create({
            data: {
                Id: j.id,
                GradingSessionId: j.gradingSessionId,
                Engine: j.engine,
                Status: j.status,
                Priority: j.priority,
                RetryCount: j.retryCount,
                CreatedAt: new Date()
            }
        })
    }

    async getJob(id: string): Promise<GradingJob | null> {
        const j = await (this.prisma as any).gradingJob.findUnique({ where: { Id: id } })
        if (!j) return null
        return GradingJob.restore(
            j.Id, j.GradingSessionId, j.GradingProfileStepId, j.Engine, j.Priority, j.Status, j.RetryCount, j.ErrorMessage, j.StartedAt, j.CompletedAt, j.WorkerNodeId
        )
    }

    async saveJob(j: GradingJob): Promise<void> {
        await (this.prisma as any).gradingJob.update({
            where: { Id: j.id },
            data: {
                Status: j.status,
                RetryCount: j.retryCount,
                ErrorMessage: j.errorMessage,
                StartedAt: j.startedAt,
                CompletedAt: j.completedAt,
                WorkerNodeId: j.workerNodeId
            }
        })
    }

    async findJobsBySession(sessionId: string): Promise<GradingJob[]> {
        const list = await (this.prisma as any).gradingJob.findMany({ where: { GradingSessionId: sessionId } })
        return list.map((j: any) => GradingJob.restore(
            j.Id, j.GradingSessionId, j.GradingProfileStepId, j.Engine, j.Priority, j.Status, j.RetryCount, j.ErrorMessage, j.StartedAt, j.CompletedAt, j.WorkerNodeId
        ))
    }
}
