import { Submission } from '../../domain/entities/submission.entity.js'
import type { GradingStatusValue, ReviewStatusValue } from '../../domain/entities/submission.entity.js'

export class SubmissionMapper {
  static toDomain(raw: any): Submission {
    const submission = Submission.restore(
      raw.Id,
      raw.ExamId,
      raw.StudentId,
      raw.ClassId,
      raw.AttemptNumber,
      raw.IsLatest,
      raw.SubmittedAt,
      raw.ZipFileUrl,
      raw.GradingStatus as GradingStatusValue,
      raw.ReviewStatus as ReviewStatusValue,
      raw.TotalScore,
      raw.FinalScore,
      raw.InstructorFeedback,
      raw.ReviewedBy,
      raw.ReviewedAt,
      raw.GradedAt,
      raw.StudentFeedback
    )
    
    // Attach unmapped fields for DTO compatibility
    if (raw.User_Submission_StudentIdToUser) {
      (submission as any).student = {
        fullName: raw.User_Submission_StudentIdToUser.FullName,
        studentCode: raw.User_Submission_StudentIdToUser.StudentCode
      }
    }
    if (raw.Exam) {
      (submission as any).exam = {
        title: raw.Exam.Title,
        description: raw.Exam.Description,
        totalPoints: raw.Exam.TotalPoints
      }
    }
    if (raw.Class) {
      // `Class` has no ClassName column — the code is `ClassCode` (schema.prisma:48), so the
      // old assignment produced undefined and every consumer fell back to a dash. The DTO
      // reads `.class`, not `.className`, so both are attached here.
      (submission as any).class = { id: raw.Class.Id, code: raw.Class.ClassCode }
      ;(submission as any).className = raw.Class.ClassCode
    }
    if (raw.StudentFeedback) {
      (submission as any).studentFeedback = raw.StudentFeedback
    }
    if (raw.SubmissionArtifact) {
      (submission as any).submissionArtifacts = raw.SubmissionArtifact
    }
    if (raw.ReportData) {
      (submission as any).reportData = raw.ReportData
    }
    ;(submission as any).rawScore = raw.RawScore ?? null
    if (raw.IsReopened !== undefined || raw.isReopened !== undefined) {
      (submission as any).isReopened = Boolean(raw.IsReopened ?? raw.isReopened)
    }
    if (raw.ReopenReason !== undefined || raw.reopenReason !== undefined) {
      (submission as any).reopenReason = raw.ReopenReason ?? raw.reopenReason
    }
    const studentId = raw.StudentId || raw.studentId;
    let override = null;
    if (raw.SubmissionOverride && !Array.isArray(raw.SubmissionOverride) && (raw.SubmissionOverride.StudentId === studentId || raw.SubmissionOverride.studentId === studentId)) {
      override = raw.SubmissionOverride;
    } else if (raw.submissionOverride && !Array.isArray(raw.submissionOverride) && (raw.submissionOverride.StudentId === studentId || raw.submissionOverride.studentId === studentId)) {
      override = raw.submissionOverride;
    } else if (Array.isArray(raw.Exam?.SubmissionOverride)) {
      override = raw.Exam.SubmissionOverride.find((o: any) => o.StudentId === studentId || o.studentId === studentId) || null;
    }
    const extDue = raw.ExtendedDueDate || raw.extendedDueDate || override?.ExtendedDueDate || override?.extendedDueDate || null;
    if (extDue) {
      (submission as any).extendedDueDate = extDue;
    }

    return submission
  }

  static toPersistence(submission: Submission): any {
    return {
      Id: submission.id,
      ExamId: submission.examId,
      StudentId: submission.studentId,
      ClassId: submission.classId,
      AttemptNumber: submission.attemptNumber,
      IsLatest: submission.isLatest,
      SubmittedAt: submission.submittedAt,
      ZipFileUrl: submission.zipFileUrl,
      GradingStatus: submission.gradingStatus,
      ReviewStatus: submission.reviewStatus,
      TotalScore: submission.totalScore,
      FinalScore: submission.finalScore,
      InstructorFeedback: submission.instructorFeedback,
      StudentFeedback: submission.studentFeedback,
      ReviewedBy: submission.reviewedBy,
      ReviewedAt: submission.reviewedAt,
      GradedAt: submission.gradedAt,
      ReportData: (submission as any).reportData ?? null,
      LatePenaltyAmount: (submission as any).latePenaltyAmount !== undefined ? (submission as any).latePenaltyAmount : null,
      IsReopened: (submission as any).isReopened !== undefined ? Boolean((submission as any).isReopened) : undefined,
      ReopenReason: (submission as any).reopenReason !== undefined ? (submission as any).reopenReason : undefined,
    }
  }
}
