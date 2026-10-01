import { IReportsRepository } from '../../domain/repositories/reports-repository.interface.js'

export class PrismaReportsRepository implements IReportsRepository {
    constructor(private readonly prisma: any) { }

    async getAdminSummary(since: Date) {
        const [users, classes, exams, submissions, logs, subjects] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.class.count(),
            this.prisma.exam.count(),
            this.prisma.submission.count({ where: { SubmittedAt: { gte: since } } }),
            this.prisma.auditLog.count({ where: { CreatedAt: { gte: since } } }),
            this.prisma.subject.count(),
        ])

        return {
            users,
            classes,
            exams,
            submissions,
            auditLogs: logs,
            subjects
        }
    }
}
