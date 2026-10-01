import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

interface GetSubjectStudentsParams {
  subjectId: string
  semesterId?: string
  classId?: string
  page: number
  limit: number
}

export class GetSubjectStudentsUseCase implements IUseCase<GetSubjectStudentsParams, any> {
  constructor(
    private readonly uow: IUnitOfWork
  ) {}

  async execute(params: GetSubjectStudentsParams): Promise<any> {
    const { subjectId, semesterId, classId, page, limit } = params

    const subjectRepo = this.uow.resolve<ISubjectRepository>(TOKENS.SubjectRepository)

    // Verify subject exists
    const subject = await subjectRepo.findById(subjectId)
    
    if (!subject) {
      throw new NotFoundError(MESSAGES.SUBJECT_NOT_FOUND || 'Không tìm thấy môn học')
    }

    const skip = (page - 1) * limit
    const take = limit

    const { total, enrollments } = await subjectRepo.getSubjectStudents(
      subjectId,
      semesterId,
      classId,
      skip,
      take
    )

    const data = enrollments
      .filter((e: any) => e.User)
      .map((e: any) => ({
        id: e.User.Id,
        studentCode: e.User.StudentCode ?? e.User.Id,
        name: e.User.FullName,
        email: e.User.Email,
        avatar: e.User.Avatar,
        classId: e.Class.Id,
        classCode: e.Class.ClassCode,
        progress: '—', // Placeholder for future modules
        grade: '—',    // Placeholder for future modules
      }))

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}
