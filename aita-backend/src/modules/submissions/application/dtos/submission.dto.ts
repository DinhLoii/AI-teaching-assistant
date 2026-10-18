import { z } from 'zod'
import { studentReportView } from '../student-report-view.js'

export const ListSubmissionsQuerySchema = z.object({
  assignmentId: z.string().optional(),
  examId: z.string().optional(),
  classId: z.string().optional(),
  status: z.string().optional(),
  includeHistory: z.enum(['true', 'false']).optional(),
})

export const CreateSubmissionSchema = z.object({
  assignmentId: z.string().optional(),
  examId: z.string().optional(),
  classId: z.string().optional(),
  zipFileUrl: z.string().optional(),
  content: z.string().optional(),
  language: z.string().optional(),
  groupCode: z.string().optional(),
}).refine((data) => data.assignmentId || data.examId, {
  message: 'assignmentId hoặc examId là bắt buộc',
})

export const PublishGradeSchema = z.object({
  score: z.coerce.number().optional(),
  finalScore: z.coerce.number().optional(),
  feedback: z.string().optional(),
  isPublished: z.boolean().optional(),
})

export class ListSubmissionsQueryDto {
  constructor(public readonly data: z.infer<typeof ListSubmissionsQuerySchema>) { }

  static from(query: unknown): ListSubmissionsQueryDto {
    return new ListSubmissionsQueryDto(ListSubmissionsQuerySchema.parse(query))
  }
}

export class CreateSubmissionRequestDto {
  constructor(public readonly data: z.infer<typeof CreateSubmissionSchema>) { }

  static from(body: unknown): CreateSubmissionRequestDto {
    return new CreateSubmissionRequestDto(CreateSubmissionSchema.parse(body))
  }
}

export class PublishGradeRequestDto {
  constructor(public readonly data: z.infer<typeof PublishGradeSchema>) { }

  static from(body: unknown): PublishGradeRequestDto {
    return new PublishGradeRequestDto(PublishGradeSchema.parse(body))
  }
}

export const ReopenSubmissionSchema = z.object({
  examId: z.string(),
  studentId: z.string(),
  classId: z.string().optional(),
  extendedDueDate: z.string(),
  penaltyMode: z.enum(['SYSTEM_DEFAULT', 'CUSTOM_RATE', 'FLAT_AMOUNT', 'WAIVE', 'SCORE_CAP']).default('SYSTEM_DEFAULT'),
  customPenaltyRate: z.coerce.number().optional(),
  flatPenaltyAmount: z.coerce.number().optional(),
  scoreCap: z.coerce.number().optional(),
  reason: z.string().optional(),
})

export class ReopenSubmissionRequestDto {
  constructor(public readonly data: z.infer<typeof ReopenSubmissionSchema>) { }

  static from(body: unknown): ReopenSubmissionRequestDto {
    return new ReopenSubmissionRequestDto(ReopenSubmissionSchema.parse(body))
  }
}

export class SubmissionResponseDto {
  static from(submission: any, requestingUserRole?: string) {
    let aiFeedback = null;
    let reportData = null;
    try {
      const rawReport = submission.reportData || submission.ReportData;
      if (rawReport) {
        reportData = typeof rawReport === 'string' ? JSON.parse(rawReport) : rawReport;
        aiFeedback = reportData.overallFeedback || null;
      }
    } catch (e) {
      // Ignore parse errors
    }

    const revStatus = submission.reviewStatus || submission.ReviewStatus || 'DRAFT';
    const isPublished = revStatus === 'PUBLISHED' || submission.isPublished === true;

    let rawTotalScore = submission.totalScore !== undefined && submission.totalScore !== null ? Number(submission.totalScore) : (submission.TotalScore !== undefined && submission.TotalScore !== null ? Number(submission.TotalScore) : null);
    let rawFinalScore = submission.finalScore !== undefined && submission.finalScore !== null ? Number(submission.finalScore) : (submission.FinalScore !== undefined && submission.FinalScore !== null ? Number(submission.FinalScore) : null);
    let rawScoreValue = submission.rawScore !== undefined && submission.rawScore !== null ? Number(submission.rawScore) : (submission.RawScore !== undefined && submission.RawScore !== null ? Number(submission.RawScore) : null);
    let latePenaltyValue = submission.latePenaltyAmount !== undefined && submission.latePenaltyAmount !== null ? Number(submission.latePenaltyAmount) : (submission.LatePenaltyAmount !== undefined && submission.LatePenaltyAmount !== null ? Number(submission.LatePenaltyAmount) : null);

    const calculatedAiScore = rawScoreValue ?? (reportData?.totalScore != null ? Number(reportData.totalScore) : null);

    // Student privacy: Only show score, reportData & feedback if published by lecturer!
    // Lecturer & Admin always see scores and reportData to review before publishing.
    const isStudent = String(requestingUserRole || '').toUpperCase() === 'STUDENT';
    const failedReport = typeof reportData?.error === 'string' && !!reportData.error;
    const hideStudentReport = isStudent && !isPublished;
    const shouldHideScores = hideStudentReport || failedReport;

    const visibleTotalScore = shouldHideScores ? null : (rawTotalScore ?? (reportData?.totalScore !== undefined ? Number(reportData.totalScore) : null));
    const visibleRawScore = shouldHideScores ? null : (rawScoreValue ?? (reportData?.totalScore != null ? Number(reportData.totalScore) : null));
    const visibleFinalScore = shouldHideScores ? null : (rawFinalScore ?? (reportData?.totalScore != null ? Number(reportData.totalScore) : null));
    const visibleScore = shouldHideScores ? null : (rawFinalScore ?? rawScoreValue ?? (reportData?.totalScore != null ? Number(reportData.totalScore) : null));
    const visibleAiScore = shouldHideScores ? null : calculatedAiScore;
    const visibleReportData = hideStudentReport ? null : isStudent ? studentReportView(reportData) : reportData;
    const visibleAiFeedback = hideStudentReport ? null : aiFeedback;

    const submittedAtDate = (submission.submittedAt || submission.SubmittedAt) ? new Date(submission.submittedAt || submission.SubmittedAt) : null;
    const dueDate = submission.Exam?.DueDate ? new Date(submission.Exam.DueDate) : null;
    const isLate = !!(submittedAtDate && dueDate && submittedAtDate > dueDate);
    const diffMs = (isLate && submittedAtDate && dueDate) ? (submittedAtDate.getTime() - dueDate.getTime()) : 0;
    const daysLate = diffMs > 0 ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0;

    const studentId = submission.studentId || submission.StudentId;
    let override = null;
    if (submission.SubmissionOverride && !Array.isArray(submission.SubmissionOverride) && (submission.SubmissionOverride.StudentId === studentId || submission.SubmissionOverride.studentId === studentId)) {
      override = submission.SubmissionOverride;
    } else if (submission.submissionOverride && !Array.isArray(submission.submissionOverride) && (submission.submissionOverride.StudentId === studentId || submission.submissionOverride.studentId === studentId)) {
      override = submission.submissionOverride;
    } else if (Array.isArray(submission.Exam?.SubmissionOverride)) {
      override = submission.Exam.SubmissionOverride.find((o: any) => o.StudentId === studentId || o.studentId === studentId) || null;
    }

    const extDue = submission.extendedDueDate || submission.ExtendedDueDate || override?.ExtendedDueDate || override?.extendedDueDate || null;
    const extendedDueDateStr = extDue ? (extDue instanceof Date ? extDue.toISOString() : String(extDue)) : null;

    return {
      id: submission.id || submission.Id,
      submissionId: submission.id || submission.Id,
      examId: submission.examId || submission.ExamId,
      assignmentId: submission.examId || submission.ExamId,
      studentId: submission.studentId || submission.StudentId,
      classId: submission.classId || submission.ClassId,
      attemptNumber: submission.attemptNumber || submission.AttemptNumber,
      isLatest: submission.isLatest ?? submission.IsLatest,
      submittedAt: submission.submittedAt || submission.SubmittedAt,
      zipFileUrl: submission.zipFileUrl || submission.ZipFileUrl,
      gradingStatus: failedReport ? 'Error' : submission.gradingStatus || submission.GradingStatus,
      gradingError: reportData?.error || reportData?.lastGradingError ? (isStudent ? 'Chưa chấm được bài nộp. Giảng viên cần kiểm tra và chấm lại.' : reportData.error || reportData.lastGradingError) : null,
      reviewStatus: revStatus,
      isPublished: isPublished,
      totalScore: visibleTotalScore,
      rawScore: visibleRawScore,
      latePenaltyAmount: latePenaltyValue,
      finalScore: visibleFinalScore,
      score: visibleScore,
      maxScore: reportData?.maxPossibleScore ?? submission.exam?.totalPoints ?? submission.Exam?.TotalPoints ?? rawTotalScore,
      aiScore: visibleAiScore,
      reportData: visibleReportData,
      isLate: isLate,
      daysLate: daysLate,
      extendedDueDate: extendedDueDateStr,
      isReopened: submission.isReopened ?? submission.IsReopened ?? false,
      reopenReason: submission.reopenReason || submission.ReopenReason || null,
      instructorFeedback: submission.instructorFeedback || submission.InstructorFeedback || null,
      studentFeedback: submission.studentFeedback || submission.StudentFeedback,
      reviewedBy: submission.reviewedBy || submission.ReviewedBy,
      reviewedAt: submission.reviewedAt || submission.ReviewedAt,
      gradedAt: submission.gradedAt || submission.GradedAt,
      aiFeedback: visibleAiFeedback,
      student: submission.User_Submission_StudentIdToUser ? {
        id: submission.User_Submission_StudentIdToUser.Id,
        name: submission.User_Submission_StudentIdToUser.FullName,
        email: submission.User_Submission_StudentIdToUser.Email,
      } : (submission.student ? submission.student : null),
      exam: submission.Exam ? {
        id: submission.Exam.Id,
        title: submission.Exam.Title,
        status: submission.Exam.Status,
        dueDate: submission.Exam.DueDate,
        latePenaltyType: submission.Exam.LatePenaltyType,
        latePenaltyValue: submission.Exam.LatePenaltyValue,
      } : (submission.exam ? submission.exam : null),
      class: submission.Class ? {
        id: submission.Class.Id,
        code: submission.Class.ClassCode,
      } : (submission.class ? submission.class : null),
    }
  }
}
