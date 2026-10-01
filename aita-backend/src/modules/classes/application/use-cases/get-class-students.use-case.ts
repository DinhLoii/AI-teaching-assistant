import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class GetClassStudentsUseCase implements IUseCase<string, any[]> {
  constructor(
    private readonly classRepo: IClassRepository,
    private readonly uow: IUnitOfWork
  ) {}

  async execute(classId: string): Promise<any[]> {
    const cls = await this.classRepo.findById(classId)
    if (!cls) {
      throw new NotFoundError(MESSAGES.CLASS_NOT_FOUND)
    }

    const enrollmentRepo = this.uow.resolve<IEnrollmentRepository>(Symbol.for('EnrollmentRepository'))
    const enrollments = await enrollmentRepo.findMany({ ClassId: classId })

    return enrollments.filter((e: any) => e.User).map((e: any) => ({
      id: e.User.Id,
      studentId: e.User.StudentCode ?? e.User.Id,
      name: e.User.FullName,
      avatar: e.User.Avatar,
      email: e.User.Email,
      progress: '—',
      grade: '—',
    }))
  }
}
