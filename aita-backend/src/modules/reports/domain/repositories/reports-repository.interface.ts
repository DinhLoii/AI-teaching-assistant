export interface AdminAnalyticsSnapshot {
    summary: { users: number; classes: number; exams: number; subjects: number; submissions: number; evaluated: number; auditLogs: number; assignedClasses: number; assignedLecturers: number }
    roles: { role: string; count: number }[]
    trend: { date: string; submissions: number; evaluated: number }[]
    grades: { count: number; average: number | null; passed: number; bins: number[] }
    majors: null
}
export interface IReportsRepository {
    getActiveSemester(): Promise<{ StartDate: Date | null; EndDate: Date | null } | null>
    getAnalytics(start: Date, end: Date): Promise<AdminAnalyticsSnapshot>
}
