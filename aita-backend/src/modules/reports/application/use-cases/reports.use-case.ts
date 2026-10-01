import { IReportsRepository } from '../../domain/repositories/reports-repository.interface.js'
import { prisma } from '../../../../database/prisma.js'

export class GetAdminReportUseCase {
    constructor(private readonly reportsRepo: IReportsRepository) { }

    async execute(period: string = '30d') {
        const days = period === '7d' ? 7 : period === 'semester' ? 120 : 30
        const since = new Date(Date.now() - days * 86400000)

        const summary = await this.reportsRepo.getAdminSummary(since)

        return {
            period,
            summary,
            chart: {
                labels: ['Users', 'Classes', 'Exams', 'Submissions'],
                values: [summary.users, summary.classes, summary.exams, summary.submissions],
            },
        }
    }
}

export class GetSystemHealthUseCase {
    async execute() {
        const started = Date.now()
        let database: { status: string; latencyMs?: number } = { status: 'down' }
        try {
            await prisma.$queryRaw`SELECT 1`
            database = { status: 'up', latencyMs: Date.now() - started }
        } catch { /* Report the failed probe without exposing connection credentials. */ }
        return {
            api: { status: 'up' },
            database,
            aiEngine: { status: 'unknown', mode: process.env.AI_STUB_MODE !== 'false' ? 'stub' : 'live' },
            checkedAt: new Date().toISOString(),
        }
    }
}
