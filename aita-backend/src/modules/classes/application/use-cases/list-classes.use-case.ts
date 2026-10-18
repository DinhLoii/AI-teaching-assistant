import { syncPendingEnrollments } from '../pending-enrollment-sync.js'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IClassRepository, ClassFilter } from '../../domain/repositories/class-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { ClassResponseDto } from '../dtos/class.dto.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'

export class ListClassesUseCase implements IUseCase<{ user: AuthUser, page?: number, limit?: number }, ReturnType<typeof ClassResponseDto.from>[]> {
  constructor(
    private readonly classRepo: IClassRepository,
    _uow: IUnitOfWork
  ) {
    if (!_uow) throw new Error('uow is required')
  }

  async execute({ user, page = 1, limit = 10 }: { user: AuthUser, page?: number, limit?: number }) {
    // Scope the query by role: LECTURER → classes they instruct, STUDENT → classes they're
    // enrolled in (StudentClass relation), ADMIN → all classes. Paginated for every role.
    const filter: ClassFilter = {}
    if (user.role === 'LECTURER') filter.instructorId = user.id
    if (user.role === 'STUDENT') filter.studentId = user.id

    const skip = (page - 1) * limit
    const classes = await this.classRepo.findMany(filter, { skip, take: limit })

    // Reconcile in a coalesced batch without competing per row with interactive reads.
    if (user.role !== 'STUDENT') void syncPendingEnrollments().catch(err => console.error('Background sync failed:', err))

    // Internal note is visible only to staff; never expose it to students.
    const includeNote = user.role !== 'STUDENT'
    return classes.map(c => ClassResponseDto.from(c, includeNote))
  }
}
