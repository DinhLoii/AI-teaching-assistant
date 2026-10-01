import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { SubmissionResponseDto } from '../dtos/submission.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class GetSubmissionUseCase implements IUseCase<{ id: string; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(private readonly submissionRepo: ISubmissionRepository) {}

  async execute({ id, user }: { id: string; user: AuthUser }) {
    const submission = await this.submissionRepo.findById(id)
    if (!submission) throw new NotFoundError(MESSAGES.SUBMISSION_NOT_FOUND)
    return SubmissionResponseDto.from(submission as any, user.role)
  }
}
