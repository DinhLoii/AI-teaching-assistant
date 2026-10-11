import { IStatsRepository } from '../../domain/repositories/stats-repository.interface.js'

export class PrismaStatsRepository implements IStatsRepository {
    constructor(private readonly prisma: any) { }

    async getAdminSummary() {
        const [users, classes, exams, subjects] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.class.count(),
            this.prisma.exam.count(),
            this.prisma.subject.count(),
        ])
        return { users, classes, exams, subjects, uptime: '99.9%' }
    }

    async getLecturerSummary(lecturerId: string) {
        const myClasses = await this.prisma.class.findMany({
            where: { InstructorClass: { some: { UserId: lecturerId } } },
            select: { Id: true },
        })
        const classIds = myClasses.map((c: any) => c.Id)
        const [exams, pendingGrading, students] = await Promise.all([
            this.prisma.exam.count({
                where: {
                    OR: [
                        { CreatedBy: lecturerId },
                        { ExamClass: { some: { ClassId: { in: classIds } } } }
                    ]
                }
            }),
            classIds.length > 0
                ? this.prisma.submission.count({
                    where: { ClassId: { in: classIds }, GradingStatus: 'Pending' },
                })
                : 0,
            classIds.length > 0
                ? this.prisma.studentClass.count({ where: { ClassId: { in: classIds } } })
                : 0,
        ])
        return {
            classes: myClasses.length,
            pending: pendingGrading,
            exams,
            students,
        }
    }

    async getStudentSummary(studentId: string) {
        const [classesCount, examsCount, totalSubs, gradedSubs] = await Promise.all([
            this.prisma.studentClass.count({ where: { UserId: studentId } }),
            this.prisma.exam.count({ where: { Status: 'Published' } }),
            this.prisma.submission.count({ where: { StudentId: studentId } }),
            this.prisma.submission.count({
                where: { StudentId: studentId, ReviewStatus: PrismaStatsRepository.PUBLISHED },
            }),
        ])

        return {
            classes: classesCount,
            exams: examsCount,
            submissions: totalSubs,
            graded: gradedSubs,
        }
    }

    async getLecturerReport(lecturerId: string, classId?: string) {
        const classes = await this.prisma.class.findMany({
            where: {
                InstructorClass: { some: { UserId: lecturerId } },
                ...(classId ? { Id: classId } : {}),
            },
            select: { Id: true },
        })
        const classIds = classes.map((c: any) => c.Id)

        if (classIds.length === 0) {
            return {
                avgScore: 0,
                submitRate: '—',
                passRate: '—',
            }
        }

        const [submissions, allInClasses] = await Promise.all([
            this.prisma.submission.findMany({
                where: { ClassId: { in: classIds }, ReviewStatus: PrismaStatsRepository.PUBLISHED },
                select: { TotalScore: true, FinalScore: true },
            }),
            this.prisma.submission.count({ where: { ClassId: { in: classIds } } }),
        ])

        const scores = submissions
            .map((s: any) => PrismaStatsRepository.scoreOf(s))
            .filter((n: number | null): n is number => n !== null && n > 0)
        const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

        return {
            avgScore: Math.round(avg * 100) / 100,
            submitRate: allInClasses ? `${Math.round((submissions.length / allInClasses) * 100)}%` : '—',
            passRate: scores.length ? `${Math.round((scores.filter((s: number) => s >= 5).length / scores.length) * 100)}%` : '—',
        }
    }

    /**
     * A score counts once the lecturer has PUBLISHED it — that is the same gate
     * SubmissionResponseDto applies. Keying off GradingStatus === 'Graded' (the previous
     * behaviour) both missed published rows, because imported data leaves that column null,
     * and leaked scores that were graded but not yet published.
     */
    private static readonly PUBLISHED = 'PUBLISHED'

    /** FinalScore is the after-penalty score, but stays 0 when nothing ever computed it. */
    private static scoreOf(s: any): number | null {
        const final = s.FinalScore === null || s.FinalScore === undefined ? null : Number(s.FinalScore)
        const total = s.TotalScore === null || s.TotalScore === undefined ? null : Number(s.TotalScore)
        if (final !== null && final > 0) return final
        if (total !== null) return total
        return final
    }

    async getStudentProgress(studentId: string) {
        const subs = await this.prisma.submission.findMany({
            where: { StudentId: studentId, ReviewStatus: PrismaStatsRepository.PUBLISHED },
            select: {
                Id: true,
                TotalScore: true,
                FinalScore: true,
                SubmittedAt: true,
                Exam: { select: { Title: true } },
            },
        })

        const scores = subs
            .map((s: any) => PrismaStatsRepository.scoreOf(s))
            .filter((n: number | null): n is number => n !== null)
        const gpa = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

        return {
            gpa: Math.round(gpa * 100) / 100,
            done: subs.length,
            rank: '—',
            streak: subs.length > 0 ? String(subs.length) : '0',
            history: subs.map((s: any) => ({
                assignment: s.Exam?.Title,
                score: PrismaStatsRepository.scoreOf(s),
                date: s.SubmittedAt?.toISOString(),
            })),
        }
    }

    async getStudentHistory(studentId: string) {
        const subs = await this.prisma.submission.findMany({
            where: { StudentId: studentId },
            select: {
                Id: true,
                TotalScore: true,
                FinalScore: true,
                SubmittedAt: true,
                ReviewStatus: true,
                GradingStatus: true,
                Exam: { select: { Title: true } },
                Class: { select: { ClassCode: true } },
            },
            orderBy: { SubmittedAt: 'desc' },
        })

        return subs.map((s: any) => {
            const published = s.ReviewStatus === PrismaStatsRepository.PUBLISHED
            return {
                id: s.Id,
                assignment: s.Exam?.Title,
                className: s.Class?.ClassCode,
                submittedAt: s.SubmittedAt?.toISOString(),
                totalScore: published ? s.TotalScore : null,
                finalScore: published ? PrismaStatsRepository.scoreOf(s) : null,
                reviewStatus: s.ReviewStatus,
                published,
                status: s.GradingStatus?.toLowerCase(),
            }
        })
    }

    async getActivityLogs(params: { action?: string; limit?: number }) {
        const where: any = {}
        if (params.action) where.Action = params.action

        const logs = await this.prisma.auditLog.findMany({
            take: params.limit ?? 50,
            where,
            orderBy: { CreatedAt: 'desc' },
            select: {
                Id: true,
                Action: true,
                EntityName: true,
                EntityId: true,
                CreatedAt: true,
                User: {
                    select: {
                        FullName: true,
                        Email: true,
                    },
                },
            },
        })

        return logs.map((log: any) => ({
            id: log.Id,
            action: log.Action,
            entity: log.EntityName,
            entityId: log.EntityId,
            user: log.User?.FullName ?? 'Hệ thống',
            email: log.User?.Email,
            createdAt: log.CreatedAt?.toISOString() ?? null,
        }))
    }
}
