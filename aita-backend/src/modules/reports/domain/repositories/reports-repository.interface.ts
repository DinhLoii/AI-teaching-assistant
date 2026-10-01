export interface IReportsRepository {
    getAdminSummary(since: Date): Promise<{
        users: number;
        classes: number;
        exams: number;
        submissions: number;
        auditLogs: number
    }>;
}
