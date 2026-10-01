export interface IStatsRepository {
    getAdminSummary(): Promise<{ users: number; classes: number; exams: number; uptime: string }>;
    getLecturerSummary(lecturerId: string): Promise<{ classes: number; pending: number; exams: number; students: number }>;
    getStudentSummary(studentId: string): Promise<{ classes: number; exams: number; submissions: number; graded: number }>;
    getLecturerReport(lecturerId: string, classId?: string): Promise<{ avgScore: number; submitRate: string; passRate: string }>;
    getStudentProgress(studentId: string): Promise<any>;
    getStudentHistory(studentId: string): Promise<any[]>;
    getActivityLogs(params: { action?: string; limit?: number }): Promise<any[]>;
}
