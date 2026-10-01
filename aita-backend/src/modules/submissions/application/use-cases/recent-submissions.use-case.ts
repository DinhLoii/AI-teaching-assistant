import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { SubmissionResponseDto } from '../dtos/submission.dto.js'

export class RecentSubmissionsUseCase implements IUseCase<{ user: AuthUser; limit: number }, ReturnType<typeof SubmissionResponseDto.from>[]> {
  constructor(private readonly submissionRepo: ISubmissionRepository) {}

  async execute({ user, limit }: { user: AuthUser; limit: number }) {
    const filter: any = {}

    if (user.role === 'STUDENT') filter.studentId = user.id
    if (user.role === 'LECTURER') filter.instructorId = user.id

    const submissions = await this.submissionRepo.findRecent(filter, limit)
    return submissions.map(sub => SubmissionResponseDto.from(sub as any, user.role))
  }
}
