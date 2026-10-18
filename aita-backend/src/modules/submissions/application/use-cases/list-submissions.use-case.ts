import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { ListSubmissionsQueryDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import type { GradingStatusValue } from '../../domain/entities/submission.entity.js'
import { autoZeroSubmissionService } from '../services/auto-zero-submission.service.js'

export class ListSubmissionsUseCase implements IUseCase<{ user: AuthUser; query: ListSubmissionsQueryDto }, ReturnType<typeof SubmissionResponseDto.from>[]> {
  constructor(
    private readonly submissionRepo: ISubmissionRepository
  ) { }

  async execute({ user, query }: { user: AuthUser; query: ListSubmissionsQueryDto }) {
    const { assignmentId, examId, classId, status } = query.data
    const targetExamId = examId ?? assignmentId

    // On-demand sync: Đồng bộ điểm 0 cho các bài quá hạn nếu có
    if (user.role === 'STUDENT') {
      await autoZeroSubmissionService.syncZeroScoresForStudent(user.id)
    } else if (targetExamId) {
      await autoZeroSubmissionService.syncZeroScoresForExam(targetExamId)
    } else if (classId && user.role === 'LECTURER') {
      await autoZeroSubmissionService.syncZeroScoresForClass(classId, user.id)
    }

    const filter: any = { latestOnly: query.data.includeHistory !== 'true' }
    if (targetExamId) filter.examId = targetExamId
    if (classId) filter.classId = classId
    if (status) filter.status = status as GradingStatusValue
    if (user.role === 'STUDENT') filter.studentId = user.id
    if (user.role === 'LECTURER') filter.instructorId = user.id

    const submissions = await this.submissionRepo.findMany(filter)

    return submissions.map(sub => SubmissionResponseDto.from(sub, user.role))
  }
}

