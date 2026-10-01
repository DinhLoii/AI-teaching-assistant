import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { UpdateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import type { SendAssignmentNotificationUseCase } from '../../../notifications/application/use-cases/send-assignment-notification.use-case.js'

export class UpdateExamUseCase implements IUseCase<{ id: string; dto: UpdateExamRequestDto }, ExamResponseDto> {
  constructor(
    private readonly examRepo: IExamRepository,
    private readonly sendNotificationUseCase?: SendAssignmentNotificationUseCase
  ) { }

  async execute(params: { id: string; dto: UpdateExamRequestDto }): Promise<ExamResponseDto> {
    const exam = await this.examRepo.findById(params.id)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    const { data } = params.dto
    const wasPublished = exam.status === 'Published'
    
    exam.updateInfo({
      title: data.title,
      description: data.description,
      totalPoints: data.maxScore ?? data.totalPoints,
      duration: typeof data.dueAt === 'number' ? data.dueAt : data.duration,
    })

    if (data.dueDate || (typeof data.dueAt === 'string')) {
      const dueStr = data.dueDate || (data.dueAt as string)
      exam.dueDate = dueStr ? new Date(dueStr) : null
    }

    if (data.maxScore !== undefined || data.totalPoints !== undefined) {
      exam.totalPoints = data.maxScore ?? data.totalPoints ?? null
    }

    if (data.status === 'published' || data.status === 'Published') {
      if (exam.status !== 'Published') {
        exam.publish()
      }
    } else if (data.status === 'draft' || data.status === 'Draft') {
      if (exam.status !== 'Draft') {
        exam.status = 'Draft'
      }
      (exam as any).isDeleted = false
    } else if (data.status === 'deleted' || data.status === 'Deleted') {
      exam.status = 'Deleted' as any
      (exam as any).isDeleted = true
    }

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
    if (data.maxLatePenalty !== undefined) {
      (exam as any).maxLatePenalty = data.maxLatePenalty;
      (exam as any).MaxLatePenalty = data.maxLatePenalty;
    }
    if (data.allowLateSubmission !== undefined) {
      (exam as any).allowLateSubmission = data.allowLateSubmission;
      (exam as any).AllowLateSubmission = data.allowLateSubmission;
    }
    if (data.lateSubmitHours !== undefined) {
      (exam as any).lateSubmitHours = Number(data.lateSubmitHours);
      (exam as any).LateSubmitHours = Number(data.lateSubmitHours);
    }
    if (data.weightPercentage !== undefined) {
      exam.weightPercentage = data.weightPercentage;
      (exam as any).WeightPercentage = data.weightPercentage;
    }

    await this.examRepo.save(exam)

    const isNewlyPublished = !wasPublished && exam.status === 'Published'
    if ((isNewlyPublished || (data as any).sendNotification) && this.sendNotificationUseCase) {
      this.sendNotificationUseCase.execute({
        examId: exam.id,
        title: exam.title || 'Bài tập mới',
        type: exam.examType || 'Assignment',
        subjectId: exam.subjectId || undefined,
        dueDate: (exam as any).dueDate || (exam as any).dueAt || undefined,
        createdBy: exam.createdBy || 'system'
      }).catch(console.error)
    }

    return ExamResponseDto.from(exam as any)
  }
}
