import { Exam } from '../../domain/entities/exam.entity.js'
import type { ExamTypeValue, ExamStatusValue } from '../../domain/entities/exam.entity.js'

export class ExamMapper {
  static toDomain(raw: any): Exam {
    let aiContent = raw.AiGeneratedContent;
    let weightPercentage = raw.WeightPercentage ? Number(raw.WeightPercentage) : null;
    if (aiContent) {
      try {
        const parsed = typeof aiContent === 'string' ? JSON.parse(aiContent) : aiContent;
        if (parsed && parsed.weightPercentage) weightPercentage = Number(parsed.weightPercentage);
      } catch (e) { }
    }
    if (weightPercentage === null || weightPercentage === undefined || isNaN(weightPercentage)) {
      weightPercentage = 10;
    }

    const exam = Exam.restore(
      raw.Id,
      raw.Title,
      raw.Description,
      raw.AssignmentTemplateId,
      raw.ProjectTypeId,
      raw.GradingProfileId,
      raw.SubjectId,
      raw.ExamType as ExamTypeValue,
      raw.Duration,
      raw.TotalPoints,
      weightPercentage,
      raw.Status as ExamStatusValue,
      raw.SubmissionFormat,
      raw.AiGeneratedContent,
      raw.OriginalPrompt,
      raw.PromptTemplateId,
      raw.CreatedBy,
      raw.DueDate ? new Date(raw.DueDate) : null
    )

    // Add additional unmapped fields safely if needed by DTOs or logic
    if (raw.Subject) {
      (exam as any).subjectName = raw.Subject.SubjectName;
      (exam as any).subjectCode = raw.Subject.SubjectCode;
    }
    if (raw.StartDate) {
      (exam as any).startDate = raw.StartDate;
    }
    if (raw.ExamClass) {
      (exam as any).classes = raw.ExamClass.map((ec: any) => ec.ClassId);

      // One entry per class the exam is attached to, so a viewing student can be matched to
      // the class they are actually enrolled in (see GetExamUseCase). Internal only —
      // ExamResponseDto maps named fields, so this never reaches the response.
      (exam as any).classLecturers = raw.ExamClass.map((ec: any) => {
        const user = ec.Class?.InstructorClass?.[0]?.User;
        return {
          classId: ec.ClassId,
          lecturer: user?.FullName ?? null,
          lecturerAvatar: user?.Avatar ?? null,
          studentIds: (ec.Class?.StudentClass ?? []).map((sc: any) => sc.UserId),
          instructorIds: (ec.Class?.InstructorClass ?? []).map((ic: any) => ic.UserId || ic.User?.Id),
        };
      });

      // Default for lecturers/admins is unchanged: the exam's first attached class. (It now
      // skips classes that have no instructor, which can only fill a value that was blank.)
      const fallback = (exam as any).classLecturers.find((c: any) => c.lecturer);
      if (fallback) {
        (exam as any).lecturer = fallback.lecturer;
        (exam as any).lecturerAvatar = fallback.lecturerAvatar;
      }
    }
    if (raw._count?.Submission !== undefined) {
      (exam as any).submissionCount = raw._count.Submission
    }
    if (raw.ExamAttachment) {
      (exam as any).ExamAttachment = raw.ExamAttachment
    }
    if (raw.ExamSection) {
      (exam as any).ExamSection = raw.ExamSection
    }
    (exam as any).GradingStrategy = raw.GradingStrategy || 'CONTINUOUS_QUEUE';
    (exam as any).gradingStrategy = raw.GradingStrategy || 'CONTINUOUS_QUEUE';
    (exam as any).AllowLateSubmission = raw.AllowLateSubmission !== undefined ? Boolean(raw.AllowLateSubmission) : true;
    (exam as any).allowLateSubmission = (exam as any).AllowLateSubmission;
    (exam as any).LatePenaltyType = raw.LatePenaltyType || 'NONE';
    (exam as any).latePenaltyType = (exam as any).LatePenaltyType;
    (exam as any).LatePenaltyValue = raw.LatePenaltyValue !== undefined && raw.LatePenaltyValue !== null ? Number(raw.LatePenaltyValue) : 0;
    (exam as any).latePenaltyValue = (exam as any).LatePenaltyValue;
    let rawLateHours: number | null = null;
    if (raw.LateSubmitHours !== undefined && raw.LateSubmitHours !== null) {
      rawLateHours = Number(raw.LateSubmitHours);
    } else if (raw.lateSubmitHours !== undefined && raw.lateSubmitHours !== null) {
      rawLateHours = Number(raw.lateSubmitHours);
    } else if (aiContent) {
      try {
        const parsed = typeof aiContent === 'string' ? JSON.parse(aiContent) : aiContent;
        if (parsed && parsed.lateSubmitHours !== undefined && parsed.lateSubmitHours !== null) {
          rawLateHours = Number(parsed.lateSubmitHours);
        }
      } catch (e) {}
    }
    (exam as any).LateSubmitHours = rawLateHours;
    (exam as any).lateSubmitHours = rawLateHours;
    (exam as any).isDeleted = Boolean(raw.IsDeleted);
    (exam as any).IsDeleted = Boolean(raw.IsDeleted);
    (exam as any).deletedAt = raw.DeletedAt || null;

    return exam
  }

  static toPersistence(exam: Exam): any {
    let aiGeneratedContent = exam.aiGeneratedContent;
    const lateHours = (exam as any).LateSubmitHours !== undefined
      ? (exam as any).LateSubmitHours
      : (exam as any).lateSubmitHours;

    if (exam.weightPercentage || lateHours !== undefined) {
      try {
        const parsed = aiGeneratedContent ? JSON.parse(aiGeneratedContent) : {};
        if (exam.weightPercentage) parsed.weightPercentage = exam.weightPercentage;
        if (lateHours !== undefined) parsed.lateSubmitHours = lateHours !== null ? Number(lateHours) : null;
        aiGeneratedContent = JSON.stringify(parsed);
      } catch (e) { }
    }

    const data: any = {
      Id: exam.id,
      Title: exam.title,
      Description: exam.description,
      AssignmentTemplateId: exam.assignmentTemplateId,
      ProjectTypeId: exam.projectTypeId,
      GradingProfileId: exam.gradingProfileId,
      SubjectId: exam.subjectId,
      ExamType: exam.examType,
      Duration: exam.duration,
      TotalPoints: exam.totalPoints,
      Status: exam.status,
      SubmissionFormat: exam.submissionFormat,
      AiGeneratedContent: aiGeneratedContent,
      OriginalPrompt: exam.originalPrompt,
      PromptTemplateId: exam.promptTemplateId,
      CreatedBy: exam.createdBy,
      DueDate: exam.dueDate
    };

    if ((exam as any).GradingStrategy !== undefined || (exam as any).gradingStrategy !== undefined) {
      data.GradingStrategy = (exam as any).GradingStrategy || (exam as any).gradingStrategy;
    }
    if ((exam as any).AllowLateSubmission !== undefined || (exam as any).allowLateSubmission !== undefined) {
      data.AllowLateSubmission = (exam as any).AllowLateSubmission ?? (exam as any).allowLateSubmission;
    }
    if ((exam as any).LatePenaltyType !== undefined || (exam as any).latePenaltyType !== undefined) {
      data.LatePenaltyType = (exam as any).LatePenaltyType || (exam as any).latePenaltyType;
    }
    if ((exam as any).LatePenaltyValue !== undefined || (exam as any).latePenaltyValue !== undefined) {
      data.LatePenaltyValue = (exam as any).LatePenaltyValue ?? (exam as any).latePenaltyValue;
    }
    if ((exam as any).IsDeleted !== undefined || (exam as any).isDeleted !== undefined) {
      data.IsDeleted = Boolean((exam as any).IsDeleted ?? (exam as any).isDeleted);
    }
    if ((exam as any).DeletedAt !== undefined || (exam as any).deletedAt !== undefined) {
      data.DeletedAt = (exam as any).DeletedAt ?? (exam as any).deletedAt;
    }

    return data;
  }
}
