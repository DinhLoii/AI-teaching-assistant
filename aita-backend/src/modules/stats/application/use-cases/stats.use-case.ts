import { IStatsRepository } from '../../domain/repositories/stats-repository.interface.js'
// import { NotFoundError } from '../../../../shared/application/app.error.js'

export class GetOverviewUseCase {
    constructor(private readonly statsRepo: IStatsRepository) { }

    async execute(user: { id: string; role: string }) {
        if (user.role === 'ADMIN') return await this.statsRepo.getAdminSummary()
        if (user.role === 'LECTURER') return await this.statsRepo.getLecturerSummary(user.id)
        return await this.statsRepo.getStudentSummary(user.id)
    }
}

export class GetActivityLogsUseCase {
    constructor(private readonly statsRepo: IStatsRepository) { }

    async execute(params: { action?: string; limit?: number }) {
        return await this.statsRepo.getActivityLogs(params)
    }
}

export class GetLecturerReportUseCase {
    constructor(private readonly statsRepo: IStatsRepository) { }

    async execute(lecturerId: string, classId?: string) {
        return await this.statsRepo.getLecturerReport(lecturerId, classId)
    }
}

export class GetStudentProgressUseCase {
    constructor(private readonly statsRepo: IStatsRepository) { }

    async execute(studentId: string) {
        return await this.statsRepo.getStudentProgress(studentId)
    }
}

export class GetStudentHistoryUseCase {
    constructor(private readonly statsRepo: IStatsRepository) { }

    async execute(studentId: string) {
        return await this.statsRepo.getStudentHistory(studentId)
    }
}
