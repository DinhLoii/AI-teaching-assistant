import { IReportsRepository } from '../../domain/repositories/reports-repository.interface.js'
import { prisma } from '../../../../database/prisma.js'
import { reportRange } from '../report-range.js'

export class GetAdminReportUseCase {
    constructor(private readonly reportsRepo: IReportsRepository) { }

    async execute(period: string = '30d', startDate?: string, endDate?: string) {
        const semester = period === 'semester' ? await this.reportsRepo.getActiveSemester() : null
        const range = reportRange(period, new Date(), startDate, endDate, semester)
        const data = await this.reportsRepo.getAnalytics(range.start, range.end)
        return { ...data, period, range: { from: range.from, to: range.to, timezone: range.timezone }, generatedAt: new Date().toISOString() }
    }
}

import os from 'os'

export class GetSystemHealthUseCase {
    async execute() {
        const started = Date.now()
        let database: { status: string; latencyMs?: number; poolStatus?: string } = { status: 'down' }
        try {
            await prisma.$queryRaw`SELECT 1`
            database = { status: 'up', latencyMs: Date.now() - started }
        } catch { /* Report the failed probe without exposing connection credentials. */ }

        const totalMem = Math.round(os.totalmem() / (1024 * 1024))
        const freeMem = Math.round(os.freemem() / (1024 * 1024))
        const usedMem = totalMem - freeMem
        const memPercent = Math.round((usedMem / totalMem) * 100)

        const cpus = os.cpus()
        const cpuCores = cpus.length
        const cpuModel = cpus[0]?.model || 'Generic Processor'
        
        const cpuSample = () => os.cpus().reduce((total, cpu) => {
            total.idle += cpu.times.idle
            total.all += Object.values(cpu.times).reduce((sum, time) => sum + time, 0)
            return total
        }, { idle: 0, all: 0 })
        const before = cpuSample()
        await new Promise(resolve => setTimeout(resolve, 100))
        const after = cpuSample()
        const cpuUsagePercent = after.all > before.all ? Math.round(100 * (1 - (after.idle - before.idle) / (after.all - before.all))) : null

        const uptimeSec = Math.floor(process.uptime())
        const hours = Math.floor(uptimeSec / 3600)
        const mins = Math.floor((uptimeSec % 3600) / 60)
        const formattedUptime = `${hours}h ${mins}m`

        return {
            api: { status: 'up', uptimeSeconds: uptimeSec, formattedUptime },
            database,
            system: {
                cpuUsagePercent,
                cpuCores,
                cpuModel,
                totalMemoryMb: totalMem,
                usedMemoryMb: usedMem,
                freeMemoryMb: freeMem,
                memoryUsagePercent: memPercent,
                platform: `${os.platform()} ${os.arch()}`,
                nodeVersion: process.version,
            },
            aiEngine: {
                status: 'unknown',
                mode: process.env.AI_STUB_MODE === 'true' || process.env.AI_STUB_MODE === '1' ? 'stub' : 'live',
                provider: process.env.GEMINI_API_KEY ? 'Google Gemini' : 'Mock Engine',
            },
            checkedAt: new Date().toISOString(),
        }
    }
}

