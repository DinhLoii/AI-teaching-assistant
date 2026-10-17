import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { CreateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'
import { Exam } from '../../domain/entities/exam.entity.js'
import { ValidationError } from '../../../../shared/application/app.error.js'
import type { SendAssignmentNotificationUseCase } from '../../../notifications/application/use-cases/send-assignment-notification.use-case.js'
import { originalAttachmentName } from '../document-access.js'

export class CreateExamUseCase implements IUseCase<{ dto: CreateExamRequestDto; file?: Express.Multer.File; userId?: string }, ExamResponseDto> {
  constructor(
    private readonly examRepo: IExamRepository,
    private readonly sendNotificationUseCase?: SendAssignmentNotificationUseCase
  ) { }

  async execute(input: { dto: CreateExamRequestDto; file?: Express.Multer.File; userId?: string }): Promise<ExamResponseDto> {
    const { data } = input.dto
    if (data.status?.toLowerCase() === 'published' && data.aiConfig?.analysisReview) {
      if (data.aiConfig.analysisReview.acknowledged !== true) throw new ValidationError('Giảng viên cần đối chiếu đề gốc và xác nhận barem trước khi giao bài.')
      if (!data.runtimeConfig?.language || data.runtimeConfig.language === 'Unknown') throw new ValidationError('Cần xác nhận ngôn ngữ theo đề bài.')
      const rules = data.rubricCriteria || []
      const total = rules.reduce((sum: number, rule: any) => sum + Number(rule.maxPoints || 0), 0)
      if (!rules.length || !Number.isFinite(total) || Math.abs(total - Number(data.maxScore ?? 10)) > .01) throw new ValidationError('Tổng điểm barem phải bằng thang điểm đã chọn trước khi giao bài.')
      if (rules.some((rule: any) => ['test_runner', 'hybrid'].includes(rule.method) && !data.testCases?.length)) throw new ValidationError('Barem yêu cầu kiểm thử tự động nhưng chưa có testcase thực thi.')
    }
    const file = input.file
    const examType = data.type === 'quiz' ? 'Quiz' : (data.type || 'Assignment')

    const { prisma } = await import('../../../../database/prisma.js')

    // System Optimization: Auto-resolve SubjectId if not supplied or empty
    if (!data.subjectId) {
      const targetClassId = data.classId || (Array.isArray(data.classIds) && data.classIds[0])
      if (targetClassId && targetClassId !== 'all') {
        const foundClass = await prisma.class.findUnique({
          where: { Id: targetClassId },
          select: { SubjectId: true }
        }).catch(() => null)
        if (foundClass?.SubjectId) {
          data.subjectId = foundClass.SubjectId
        }
      }
    }

    if (!data.subjectId) {
      const defaultSubject = await prisma.subject.findFirst({ select: { Id: true } }).catch(() => null)
      if (defaultSubject?.Id) {
        data.subjectId = defaultSubject.Id
      } else {
        throw new ValidationError('Không tìm thấy môn học tương ứng. Vui lòng chọn môn học hoặc lớp học hợp lệ.')
      }
    }

    if (data.weightPercentage) {
      const existingExams = await this.examRepo.findMany({ subjectId: data.subjectId })
      const currentTotalWeight = existingExams.reduce((sum, exam) => {
        let weight = 0
        if (exam.weightPercentage) weight = Number(exam.weightPercentage)
        else if ((exam as any).aiGeneratedContent) {
          try {
            const parsed = JSON.parse((exam as any).aiGeneratedContent)
            if (parsed.weightPercentage) weight = Number(parsed.weightPercentage)
          } catch(e) {}
        }
        return sum + weight
      }, 0)

      if (currentTotalWeight + Number(data.weightPercentage) > 70) {
        throw new ValidationError(`Tổng tỷ trọng điểm các bài Assignment/Lab không được vượt quá 70%. Tổng hiện tại là ${currentTotalWeight}%.`)
      }
    }

    const parsedDueDate = data.dueDate ? new Date(data.dueDate) : (typeof data.dueAt === 'string' ? new Date(data.dueAt) : undefined);

    const exam = Exam.create(
      randomUUID(),
      data.title,
      data.subjectId,
      examType as any,
      input.userId || 'system', // createdBy, ideally should be passed from AuthUser
      {
        description: data.description,
        totalPoints: data.maxScore ?? 10,
        weightPercentage: data.weightPercentage ?? 0,
        duration: data.duration,
        dueDate: parsedDueDate,
      }
    )

    if (data.strategy || data.gradingStrategy) {
      (exam as any).gradingStrategy = data.strategy || data.gradingStrategy;
      (exam as any).GradingStrategy = data.strategy || data.gradingStrategy;
    }
    if (data.latePenaltyType !== undefined) {
      (exam as any).latePenaltyType = data.latePenaltyType;
      (exam as any).LatePenaltyType = data.latePenaltyType;
    }
    if (data.latePenaltyValue !== undefined) {
      (exam as any).latePenaltyValue = data.latePenaltyValue;
      (exam as any).LatePenaltyValue = data.latePenaltyValue;
    }
    if (data.allowLateSubmission !== undefined) {
      (exam as any).allowLateSubmission = data.allowLateSubmission;
      (exam as any).AllowLateSubmission = data.allowLateSubmission;
    }
    if (data.lateSubmitHours !== undefined) {
      (exam as any).lateSubmitHours = Number(data.lateSubmitHours);
      (exam as any).LateSubmitHours = Number(data.lateSubmitHours);
    }
    if (data.status?.toLowerCase() === 'published') {
      exam.status = 'Published'
    } else if (data.status?.toLowerCase() === 'draft') {
      exam.status = 'Draft'
    }

    // Pack rich assignment configuration
    const fullConfig = {
      submissionFormat: data.submissionFormat,
      runtimeConfig: data.runtimeConfig,
      sqlConfig: data.sqlConfig,
      testCases: data.testCases,
      rubricCriteria: data.rubricCriteria,
      aiConfig: data.aiConfig,
      allowResubmission: data.allowResubmission ?? true,
      maxAttempts: data.maxAttempts || null,
      sampleSolution: data.sampleSolution,
    };
    (exam as any).aiGeneratedContent = JSON.stringify(fullConfig);
    if (data.submissionFormat) {
      (exam as any).submissionFormat = typeof data.submissionFormat === 'string' 
        ? data.submissionFormat 
        : JSON.stringify(data.submissionFormat);
    }
    if (data.startDate) {
      (exam as any).startDate = new Date(data.startDate);
    }

    await this.examRepo.create(exam)

    // System Optimization: Batch insert relational records in bulk (TestCases, SampleCode, Rubrics)
    try {
      // 1. Batch Test cases
      if (data.testCases && Array.isArray(data.testCases) && data.testCases.length > 0) {
        await prisma.testCase.createMany({
          data: data.testCases.map((tc: any, index: number) => ({
            Id: randomUUID(),
            ExamId: exam.id,
            Input: tc.input ?? '',
            ExpectedOutput: tc.expectedOutput ?? '',
            IsHidden: Boolean(tc.isHidden),
            Points: tc.points !== undefined && !isNaN(Number(tc.points)) ? Number(tc.points) : 1,
            SortOrder: index + 1,
          }))
        }).catch(e => console.warn('[CreateExam] Failed to insert test cases:', e))
      }

      // 2. Reference sample solution
      if (data.sampleSolution) {
        await prisma.sampleCode.create({
          data: {
            Id: randomUUID(),
            ExamId: exam.id,
            Language: data.runtimeConfig?.language || 'Code',
            Code: data.sampleSolution,
            Explanation: 'Lời giải mẫu / Benchmark code của giảng viên',
          }
        }).catch(e => console.warn('[CreateExam] Failed to insert sample code:', e))
      }

      // 3. Batch Rubric Section, Rules & Criteria
      if (data.rubricCriteria && Array.isArray(data.rubricCriteria) && data.rubricCriteria.length > 0) {
        const sectionId = randomUUID()
        await prisma.examSection.create({
          data: {
            Id: sectionId,
            ExamId: exam.id,
            SectionCode: 'SEC-1',
            Title: 'Tiêu chuẩn đánh giá bài tập',
            Description: 'Barem tiêu chí chấm điểm tự động và AI',
            MaxPoints: data.maxScore ?? 10,
            SortOrder: 1,
          }
        })

        const rulesToInsert = data.rubricCriteria.map((rc: any, i: number) => ({
          Id: randomUUID(),
          SectionId: sectionId,
          RuleCode: `CRIT-${i + 1}`,
          Description: rc.name || rc.description || `Tiêu chí ${i + 1}`,
          MaxPoints: rc.maxPoints !== undefined && !isNaN(Number(rc.maxPoints)) ? Number(rc.maxPoints) : 2,
          EvaluationPrompt: rc.aiGuidance || rc.description || '',
          SortOrder: i + 1,
        }))

        await prisma.rubricRule.createMany({
          data: rulesToInsert
        })

        const rawCriteria = data.rubricCriteria
        const criteriaToInsert = rulesToInsert.map((rule, i) => {
          const rc = rawCriteria[i]
          const isTest = rc.method === 'test' || rc.method === 'test_runner'
          const isStatic = rc.method === 'rule' || rc.method === 'deterministic_rule'
          return {
            Id: randomUUID(),
            RubricRuleId: rule.Id,
            Description: rc.description || rc.name || '',
            MaxPoints: rc.maxPoints !== undefined && !isNaN(Number(rc.maxPoints)) ? Number(rc.maxPoints) : 2,
            Weight: rc.weight !== undefined && !isNaN(Number(rc.weight)) ? Number(rc.weight) : 1,
            ValidationType: isTest ? 'TestCase' : isStatic ? 'Static' : 'AI',
            ValidationConfig: JSON.stringify({
              passCondition: rc.passCondition || '',
              failCondition: rc.failCondition || '',
              method: rc.method,
            }),
            SortOrder: 1,
          }
        })

        await prisma.rubricCriterion.createMany({
          data: criteriaToInsert
        })
      }
    } catch (relErr) {
      console.warn('[CreateExam] Error saving extra relational entities:', relErr)
    }

    if (data.classIds && Array.isArray(data.classIds) && data.classIds.length > 0) {
      // Use dueDate or dueAt if provided as a date string
      const due: string | undefined = typeof data.dueAt === 'string' ? data.dueAt : (data.dueDate || undefined);
      const specificClassIds = data.classIds.filter(id => id && id !== 'all');
      
      if (specificClassIds.length > 0) {
        // System Optimization: Batch assign classes in a single query
        await prisma.examClass.createMany({
          data: specificClassIds.map(classId => ({
            ExamId: exam.id,
            ClassId: classId,
            AssignedAt: new Date(),
            DueDate: due ? new Date(due) : null
          })),
          skipDuplicates: true
        }).catch(async () => {
          // Fallback to sequential repo method if needed
          await Promise.all(specificClassIds.map(classId => 
            this.examRepo.assignToClass(exam.id, classId, due)
          )).catch(console.warn)
        })
      }

      if ((data.sendNotification || exam.status === 'Published') && this.sendNotificationUseCase) {
        this.sendNotificationUseCase.execute({
          examId: exam.id,
          title: data.title,
          type: examType,
          classIds: specificClassIds,
          subjectId: data.subjectId,
          dueDate: due,
          createdBy: input.userId || 'system'
        }).catch(console.error)
      }
    }

    if (file) {
      await this.examRepo.addAttachment(exam.id, {
        fileName: originalAttachmentName(file.originalname),
        fileUrl: `/uploads/attachments/${file.filename}`,
        fileType: file.mimetype
      })
    }

    // System Optimization: Fetch complete created entity, with graceful fallback to exam instance
    const createdExam = await this.examRepo.findById(exam.id).catch(() => null)
    return ExamResponseDto.from((createdExam || exam) as any)
  }
}
