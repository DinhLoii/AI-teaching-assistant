import { z } from 'zod'

export const CreateExamSchema = z.object({
  subjectId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  duration: z.coerce.number().optional(),
  dueDate: z.string().optional(),
  maxScore: z.coerce.number().optional(),
  weightPercentage: z.coerce.number().optional(),
  classId: z.string().optional(),
  classIds: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(Boolean)
    }
    return val || []
  }),
  sendNotification: z.preprocess((val) => {
    if (val === undefined) return undefined;
    return val === 'true' || val === true;
  }, z.boolean().optional()),
  status: z.string().optional(),
  strategy: z.string().optional(),
  gradingStrategy: z.string().optional(),
  lateSubmitHours: z.coerce.number().optional(),
  dueAt: z.union([z.string(), z.number()]).optional(),
  latePenaltyType: z.enum(['NONE', 'DAILY_POINTS', 'DAILY_PERCENT', 'FLAT_POINTS', 'FIXED', 'PERCENTAGE']).optional().default('NONE'),
  latePenaltyValue: z.coerce.number().optional(),
  maxLatePenalty: z.coerce.number().optional(),
  allowLateSubmission: z.coerce.boolean().optional().default(true),
  startDate: z.string().optional(),
  allowResubmission: z.coerce.boolean().optional(),
  maxAttempts: z.coerce.number().optional(),
  submissionFormat: z.union([z.string(), z.record(z.any())]).optional(),
  runtimeConfig: z.record(z.any()).optional(),
  sqlConfig: z.record(z.any()).optional(),
  testCases: z.array(z.record(z.any())).optional(),
  rubricCriteria: z.array(z.record(z.any())).optional(),
  aiConfig: z.record(z.any()).optional(),
  sampleSolution: z.string().optional(),
}).transform(data => {
  if (data.classId && (!data.classIds || data.classIds.length === 0)) {
    data.classIds = [data.classId]
  }
  return data
})

export type CreateExamRequestDtoType = z.infer<typeof CreateExamSchema>

export class CreateExamRequestDto {
  constructor(public readonly data: CreateExamRequestDtoType) {}

  static from(body: unknown): CreateExamRequestDto {
    if (body && typeof body === 'object' && 'payload' in body) {
      const decoded = z.string().transform((value, context) => {
        try { return JSON.parse(value) } catch { context.addIssue({ code: z.ZodIssueCode.custom, message: 'Dữ liệu cấu hình bài tập không hợp lệ.' }); return z.NEVER }
      }).parse((body as { payload: unknown }).payload)
      return new CreateExamRequestDto(CreateExamSchema.parse(decoded))
    }
    return new CreateExamRequestDto(CreateExamSchema.parse(body))
  }
}

export const UpdateExamSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  weightPercentage: z.coerce.number().optional(),
  dueAt: z.union([z.string(), z.number()]).optional(),
  dueDate: z.string().optional(),
  maxScore: z.coerce.number().optional(),
  totalPoints: z.coerce.number().optional(),
  duration: z.coerce.number().optional(),
  strategy: z.string().optional(),
  gradingStrategy: z.string().optional(),
  lateSubmitHours: z.coerce.number().optional(),
  latePenaltyType: z.enum(['NONE', 'DAILY_POINTS', 'DAILY_PERCENT', 'FLAT_POINTS', 'FIXED', 'PERCENTAGE']).optional(),
  latePenaltyValue: z.coerce.number().optional(),
  maxLatePenalty: z.coerce.number().optional(),
  allowLateSubmission: z.coerce.boolean().optional(),
})

export type UpdateExamRequestDtoType = z.infer<typeof UpdateExamSchema>

export class UpdateExamRequestDto {
  constructor(public readonly data: UpdateExamRequestDtoType) {}

  static from(body: unknown): UpdateExamRequestDto {
    return new UpdateExamRequestDto(UpdateExamSchema.parse(body))
  }
}

export class ExamResponseDto {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly type: string,
    public readonly status: string,
    public readonly subjectId: string | null,
    public readonly maxScore: number | null,
    public readonly dueAt: string | null,
    public readonly due: string | null,
    public readonly createdAt: string | null,
    public readonly classes: string[] | null,
    public readonly subjectName?: string | null,
    public readonly lecturer?: string | null,
    public readonly lecturerAvatar?: string | null,
    public readonly attachments?: { id: string, fileName: string, fileUrl: string, fileType: string }[] | null,
    public readonly rubrics?: any[] | null,
    public readonly weightPercentage?: number | null,
    public readonly latePenaltyType?: string | null,
    public readonly latePenaltyValue?: number | null,
    public readonly maxLatePenalty?: number | null,
    public readonly allowLateSubmission?: boolean | null,
    public readonly content?: string | null,
    public readonly classId?: string | null,
    public readonly classIds?: string[] | null,
    public readonly dueDate?: string | null,
    public readonly duration?: number | null,
    public readonly lateSubmitHours?: number | null,
    public readonly gradingStrategy?: string | null,
    public readonly strategy?: string | null
  ) {}

  static from(exam: any): ExamResponseDto {
    const dueValue = exam.dueDate || exam.DueDate || exam.dueAt || exam.DueAt;
    const weightPct = exam.weightPercentage ?? (exam.WeightPercentage ? Number(exam.WeightPercentage) : 10);
    const lateHours = exam.lateSubmitHours !== undefined && exam.lateSubmitHours !== null
      ? Number(exam.lateSubmitHours)
      : (exam.LateSubmitHours !== undefined && exam.LateSubmitHours !== null ? Number(exam.LateSubmitHours) : null);
    const gradStrat = exam.gradingStrategy || exam.GradingStrategy || 'CONTINUOUS_QUEUE';
    
    // Parse rubrics from ExamSection or AI Generated Rubrics
    let rubrics = null;
    if (exam.aiRubrics && exam.aiRubrics.length > 0) {
      rubrics = exam.aiRubrics;
    } else if (exam.ExamSection && Array.isArray(exam.ExamSection) && exam.ExamSection.length > 0) {
      rubrics = exam.ExamSection.flatMap((section: any) => {
        if (!section.RubricRule || !Array.isArray(section.RubricRule)) return [];
        return section.RubricRule.flatMap((rule: any) => {
          const criteriaList = rule.RubricCriterion || [];
          if (criteriaList.length > 0) {
            return criteriaList.map((c: any, idx: number) => ({
              id: c.Id || c.id || `c_${idx}`,
              title: c.Description || c.description || `Tiêu chí ${idx + 1}`,
              name: c.Description || c.description || `Tiêu chí ${idx + 1}`,
              description: c.Description || c.description || '',
              maxPoints: Number(c.MaxPoints ?? c.maxPoints ?? 0),
              weight: Number(c.MaxPoints ?? c.maxPoints ?? 0),
              scoringStrategy: 'Manual'
            }));
          }
          return [{
            id: rule.Id || rule.id,
            title: rule.Description || rule.description || 'Tiêu chí',
            name: rule.Description || rule.description || 'Tiêu chí',
            description: rule.Description || rule.description || '',
            maxPoints: Number(rule.MaxPoints ?? rule.maxPoints ?? 10),
            weight: Number(rule.MaxPoints ?? rule.maxPoints ?? 10),
            scoringStrategy: 'Manual'
          }];
        });
      });
    }

    const toSafeIso = (val: any): string | null => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    const classId = (exam.classes && exam.classes.length > 0 ? exam.classes[0] : (exam.classId || null));
    const classIds = exam.classes || (exam.classId ? [exam.classId] : null);
    const dueDateStr = toSafeIso(dueValue);

    const dto = new ExamResponseDto(
      exam.Id || exam.id,
      exam.Title || exam.title,
      exam.Description || exam.description,
      (exam.ExamType || exam.type)?.toLowerCase() ?? 'assignment',
      (exam.Status || exam.status)?.toLowerCase() ?? 'draft',
      exam.SubjectId || exam.subjectId,
      exam.TotalPoints || exam.totalPoints,
      dueDateStr,
      dueDateStr,
      toSafeIso(exam.startDate) || toSafeIso(exam.createdAt),
      exam.classes || null,
      exam.subjectName ? `${exam.subjectCode || ''} - ${exam.subjectName}` : null,
      exam.lecturer || null,
      exam.lecturerAvatar || null,
      exam.ExamAttachment ? exam.ExamAttachment.map((a: any) => ({
        id: a.Id || a.id,
        fileName: a.FileName || a.fileName,
        fileUrl: a.FileUrl || a.fileUrl,
        fileType: a.FileType || a.fileType
      })) : null,
      rubrics,
      weightPct,
      exam.LatePenaltyType || exam.latePenaltyType || 'NONE',
      exam.LatePenaltyValue !== undefined && exam.LatePenaltyValue !== null ? Number(exam.LatePenaltyValue) : (exam.latePenaltyValue !== undefined ? Number(exam.latePenaltyValue) : null),
      exam.MaxLatePenalty !== undefined && exam.MaxLatePenalty !== null ? Number(exam.MaxLatePenalty) : (exam.maxLatePenalty !== undefined ? Number(exam.maxLatePenalty) : null),
      exam.AllowLateSubmission ?? exam.allowLateSubmission ?? true,
      exam.content || exam.Description || exam.description || null,
      classId,
      classIds,
      dueDateStr,
      exam.Duration || exam.duration,
      lateHours,
      gradStrat,
      gradStrat
    );
    (dto as any).lateSubmitHours = lateHours;
    (dto as any).gradingStrategy = gradStrat;
    (dto as any).strategy = gradStrat;
    (dto as any).passThreshold = (exam.passThreshold !== undefined && exam.passThreshold !== null)
      ? Number(exam.passThreshold)
      : (exam.rubric?.passThreshold !== undefined ? Number(exam.rubric.passThreshold) : 0.7);
    (dto as any).rubric = exam.rubric ?? null;
    let config: any = {}
    try { const raw = exam.aiGeneratedContent || exam.AiGeneratedContent; config = typeof raw === 'string' ? JSON.parse(raw) : raw || {} } catch {}
    ;(dto as any).documentContent = [exam.description, exam.Description, exam.originalPrompt, exam.OriginalPrompt, exam.content].find(value => typeof value === 'string' && value.trim() && !/^Barem tiêu chí chấm điểm tự động và AI\.?$/i.test(value.trim())) || ''
    ;(dto as any).documentAnalysis = {
      requirementGroups: config.aiConfig?.requirementGroups || null,
      acceptanceTests: config.aiConfig?.acceptanceTests || [],
      reviewStatus: config.aiConfig?.analysisReview?.acknowledged === true ? 'teacher_reviewed' : 'unreviewed',
      platform: config.aiConfig?.analysisReview?.profile?.platform || null,
      language: config.runtimeConfig?.language || null,
    }
    return dto;
  }
}
