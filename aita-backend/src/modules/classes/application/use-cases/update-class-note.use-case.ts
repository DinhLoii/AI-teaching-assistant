import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { UpdateClassNoteDto } from '../dtos/class.dto.js'

interface UpdateClassNoteInput {
  classId: string
  dto: UpdateClassNoteDto
  user: AuthUser
}

/**
 * Update a class's internal note.
 * Writable only by ADMIN or the owning LECTURER — ownership is derived from req.user, never the body.
 */
export class UpdateClassNoteUseCase
  implements IUseCase<UpdateClassNoteInput, { id: string; note: string }>
{
  constructor(private readonly classRepo: IClassRepository) {}

  async execute({ classId, dto, user }: UpdateClassNoteInput): Promise<{ id: string; note: string }> {
    const cls = await this.classRepo.findById(classId)
    if (!cls) {
      throw new NotFoundError(MESSAGES.CLASS_NOT_FOUND)
    }

    if (user.role === 'LECTURER') {
      const owns = await this.classRepo.isInstructor(classId, user.id)
      if (!owns) {
        throw new ForbiddenError('Bạn không phụ trách lớp này')
      }
    }

    await this.classRepo.updateNote(classId, dto.note)
    return { id: classId, note: dto.note }
  }
}
