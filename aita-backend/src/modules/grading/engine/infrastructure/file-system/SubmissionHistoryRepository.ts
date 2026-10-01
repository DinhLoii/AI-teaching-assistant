import { prisma } from '../../../../../database/prisma.js';
import { Prisma } from '@prisma/client';
import { calculateLatePenalty } from '../../../../submissions/domain/utils/late-penalty-calculator.js';

export interface GradedSubmission {
    id: string;
    assignmentId?: string;
    studentId?: string;
    score: number;
    maxScore: number;
    assessedAt: string;
    title?: string;
    report: any;
}

const isValidUUID = (id: string | undefined) => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export class SubmissionHistoryRepository {
    constructor() {}

    async getAllAsync(
        assignmentId?: string,
        options?: { page?: number; limit?: number; search?: string }
    ): Promise<{ data: GradedSubmission[]; total: number }> {
        const page = options?.page || 1;
        const limit = options?.limit || 10;
        const search = options?.search?.trim();

        const where: Prisma.SubmissionWhereInput = {
            GradingStatus: 'GRADED',
        };

        const andConditions: any[] = [];

        if (assignmentId) {
            andConditions.push({
                OR: [
                    { ExamId: assignmentId },
                    { ReportData: { contains: `"assignmentId":"${assignmentId}"` } }
                ]
            });
        }

        if (search) {
            andConditions.push({
                OR: [
                    { StudentId: { contains: search } },
                    { Id: { contains: search } },
                    { ReportData: { contains: `"studentId":"${search}"` } }
                ]
            });
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        const total = await prisma.submission.count({ where });

        const submissions = await prisma.submission.findMany({
            where,
            include: { Exam: true },
            orderBy: { GradedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        const data = submissions.map(s => {
            const graded = this.toGradedSubmission(s);
            graded.report = {}; // Empty to save massive memory during list fetch!
            return graded;
        });

        return { data, total };
    }

    async getByIdAsync(id: string): Promise<GradedSubmission | null> {
        const s = await prisma.submission.findUnique({
            where: { Id: id },
            include: { Exam: true },
        });

        if (!s) return null;
        return this.toGradedSubmission(s);
    }

    async saveAsync(submission: GradedSubmission): Promise<void> {
        let validExamId = isValidUUID(submission.assignmentId) ? submission.assignmentId : undefined;
        let validStudentId = isValidUUID(submission.studentId) ? submission.studentId : undefined;

        let examRecord: any = null;
        if (validExamId) {
            examRecord = await prisma.exam.findUnique({
                where: { Id: validExamId },
                select: {
                    Id: true,
                    DueDate: true,
                    LatePenaltyType: true,
                    LatePenaltyValue: true,
                    MaxLatePenalty: true,
                    AllowLateSubmission: true,
                    Title: true,
                }
            });
            if (!examRecord) validExamId = undefined;
        }

        if (validStudentId) {
            const studentExists = await prisma.user.findUnique({ where: { Id: validStudentId }, select: { Id: true } });
            if (!studentExists) validStudentId = undefined;
        }

        const existing = await prisma.submission.findUnique({ where: { Id: submission.id } });

        let classDueDate: Date | null = null;
        if (validExamId && existing?.ClassId) {
            try {
                const ec = await prisma.examClass.findUnique({
                    where: { ExamId_ClassId: { ExamId: validExamId, ClassId: existing.ClassId } },
                    select: { DueDate: true }
                });
                if (ec?.DueDate) classDueDate = ec.DueDate;
            } catch (e) {}
        }

        let override: any = null;
        if (validExamId && validStudentId) {
            try {
                override = await prisma.submissionOverride.findUnique({
                    where: { ExamId_StudentId: { ExamId: validExamId, StudentId: validStudentId } }
                });
            } catch (e) {}
        }

        const rawScore = Number(submission.report?.totalScore ?? submission.score ?? 0);
        const submittedAtDate = existing?.SubmittedAt ? new Date(existing.SubmittedAt) : new Date(submission.assessedAt);
        const originalDueDate = classDueDate || examRecord?.DueDate || null;

        const penaltyCalc = calculateLatePenalty({
            rawScore,
            submittedAt: submittedAtDate,
            originalDueDate,
            override: override ? {
                extendedDueDate: override.ExtendedDueDate,
                penaltyMode: override.PenaltyMode,
                customPenaltyRate: override.CustomPenaltyRate ? Number(override.CustomPenaltyRate) : null,
                flatPenaltyAmount: override.FlatPenaltyAmount ? Number(override.FlatPenaltyAmount) : null,
                scoreCap: override.ScoreCap ? Number(override.ScoreCap) : null,
            } : null,
            examPenaltyType: examRecord?.LatePenaltyType,
            examPenaltyValue: examRecord?.LatePenaltyValue ? Number(examRecord.LatePenaltyValue) : null,
            maxLatePenalty: examRecord?.MaxLatePenalty ? Number(examRecord.MaxLatePenalty) : null,
        });

        // Embed metadata and late penalty into report
        const enrichedReport: any = {
            ...submission.report,
            rawScore: penaltyCalc.rawScore,
            latePenaltyAmount: penaltyCalc.latePenaltyAmount,
            totalScore: penaltyCalc.finalScore,
            isLate: penaltyCalc.isLate,
            daysLate: penaltyCalc.daysLate,
            hoursLate: penaltyCalc.hoursLate,
            lateReason: penaltyCalc.lateReason,
            __metadata: {
                assignmentId: submission.assignmentId,
                studentId: submission.studentId,
                title: submission.title,
            }
        };

        if (penaltyCalc.isLate && penaltyCalc.latePenaltyAmount > 0) {
            const dueFormatted = originalDueDate ? new Date(originalDueDate).toLocaleString('vi-VN') : 'Hạn nộp';
            const subFormatted = submittedAtDate.toLocaleString('vi-VN');
            const aiLateNote = `\n\n> ⚠️ **Lưu ý đánh giá từ AI (Trừ điểm nộp trễ / Late Submission Penalty)**:\n> - **Lý do bị trừ điểm / Reason**: Bài làm được nộp sau hạn chót (Hạn nộp / Deadline: **${dueFormatted}** ➔ Nộp lúc / Submitted: **${subFormatted}**). Thời gian nộp muộn: **${penaltyCalc.hoursLate} giờ** (tương đương **${penaltyCalc.daysLate} ngày / chu kỳ 24h**).\n> - **Mức phạt áp dụng / Applied Penalty**: ${penaltyCalc.lateReason || `Trừ ${penaltyCalc.latePenaltyAmount} điểm`} (Điểm gốc bài làm / Original: **${penaltyCalc.rawScore}**đ ➔ Điểm cuối cùng công bố / Final: **${penaltyCalc.finalScore}**đ).\n> - **Quy chế học thuật / Academic Policy**: Sinh viên vui lòng chú ý nộp bài đúng hạn để đảm bảo quyền lợi và bảo toàn trọn vẹn điểm số trong các bài tập tiếp theo.`;

            let currentOverall = enrichedReport.overallFeedback || '';
            if (currentOverall.includes('Lưu ý đánh giá từ AI (Trừ điểm nộp trễ') || currentOverall.includes('Late Submission Penalty')) {
                currentOverall = currentOverall.replace(/> ⚠️ \*\*Lưu ý[^\n]*\n(?:> [^\n]*\n?)*/g, aiLateNote.trim());
            } else {
                currentOverall = `${currentOverall}${aiLateNote}`;
            }
            enrichedReport.overallFeedback = currentOverall;
        }

        const reportJson = JSON.stringify(enrichedReport);

        if (existing) {
            await prisma.submission.update({
                where: { Id: submission.id },
                data: {
                    GradingStatus: 'GRADED',
                    RawScore: penaltyCalc.rawScore,
                    LatePenaltyAmount: penaltyCalc.latePenaltyAmount,
                    FinalScore: penaltyCalc.finalScore,
                    TotalScore: submission.maxScore,
                    GradedAt: new Date(submission.assessedAt),
                    ReportData: reportJson,
                    ExamId: validExamId,
                    StudentId: validStudentId,
                },
            });
        } else {
            // Batch grading creates UUIDs in memory that may not exist in DB yet
            const randomAttempt = Math.floor(Math.random() * 2147483647); // Bypass SQL Server NULL unique constraint
            await prisma.submission.create({
                data: {
                    Id: submission.id,
                    ExamId: validExamId,
                    StudentId: validStudentId,
                    AttemptNumber: randomAttempt,
                    GradingStatus: 'GRADED',
                    RawScore: penaltyCalc.rawScore,
                    LatePenaltyAmount: penaltyCalc.latePenaltyAmount,
                    FinalScore: penaltyCalc.finalScore,
                    TotalScore: submission.maxScore,
                    GradedAt: new Date(submission.assessedAt),
                    ReportData: reportJson,
                    SubmittedAt: submittedAtDate,
                },
            });
        }
    }

    async deleteAsync(id: string): Promise<boolean> {
        try {
            await prisma.submission.delete({ where: { Id: id } });
            return true;
        } catch {
            return false;
        }
    }

    // ── Private helper ──────────────────────────────────
    private toGradedSubmission(s: any): GradedSubmission {
        let report: any = {};
        if (s.ReportData) {
            try {
                report = JSON.parse(s.ReportData);
            } catch {
                // Corrupted JSON — return empty report rather than crashing
                report = {};
            }
        }

        return {
            id: s.Id,
            assignmentId: s.ExamId || report.__metadata?.assignmentId || undefined,
            studentId: s.StudentId || report.__metadata?.studentId || undefined,
            score: report.totalScore !== undefined ? Number(report.totalScore) : (s.FinalScore !== null ? Number(s.FinalScore) : 0),
            maxScore: report.maxPossibleScore !== undefined ? Number(report.maxPossibleScore) : (s.TotalScore !== null ? Number(s.TotalScore) : 10),
            assessedAt: s.GradedAt ? s.GradedAt.toISOString() : new Date().toISOString(),
            title: s.Exam?.Title || report.__metadata?.title || 'Grading Report',
            report,
        };
    }
}


