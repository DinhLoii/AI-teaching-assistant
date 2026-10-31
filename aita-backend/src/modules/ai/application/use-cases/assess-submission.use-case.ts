import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { IAIService } from '../../../../shared/application/ports/ai-service.interface.js'
import type { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { assertAiSubmissionAccess } from '../ai-access.js'
import { durableGradingQueue, type DurableGradingQueue } from '../../../grading/engine/application/queue/durable-grading-queue.js'

/** All score-changing assessments use the durable, lease-fenced grading pipeline. */
export class AssessSubmissionUseCase {
  constructor(
    private readonly uow: IUnitOfWork,
    _aiService: IAIService,
    _aiRepo: IAiRepository,
    private readonly queue: Pick<DurableGradingQueue, 'enqueue'> = durableGradingQueue,
  ) {}

  async execute(submissionId: string, user: AuthUser) {
    await assertAiSubmissionAccess(submissionId, user, true, this.uow.getClient())
    return this.queue.enqueue(submissionId, 'batch')
  }
}
