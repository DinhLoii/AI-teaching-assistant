import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import type { IEnrollmentRepository } from '../../domain/repositories/enrollment-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { EnrollStudentRequestDto } from '../dtos/class.dto.js'
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'

interface AuthUser {
  id: string
  role: string
}

export class EnrollStudentUseCase implements IUseCase<{ classId: string; dto: EnrollStudentRequestDto; user: AuthUser }, any> {
  constructor(
    private readonly classRepo: IClassRepository,
    private readonly uow: IUnitOfWork
  ) { }

  async execute(params: { classId: string; dto: EnrollStudentRequestDto; user: AuthUser }): Promise<any> {
    const { classId, dto, user } = params

    // Authorization: Only LECTURER or ADMIN can enroll
    const cls = await this.classRepo.findById(classId)
    if (!cls) {
      throw new NotFoundError(MESSAGES.CLASS_NOT_FOUND)
    }

    const isInstructor = (cls as any).instructorId === user.id
    if (user.role !== 'ADMIN' && !isInstructor) {
      throw new ForbiddenError(MESSAGES.CLASS_FORBIDDEN_ENROLL)
    }

    // Validate student exists and is active (lookup by ID or Email/StudentCode)
    const userRepo = this.uow.resolve<any>(TOKENS.UserRepository)
    let student = await userRepo.findById(dto.data.studentId)
    if (!student) {
      student = await userRepo.findByEmail(dto.data.studentId)
    }
    if (!student) {
      throw new NotFoundError(MESSAGES.USER_NOT_FOUND)
    }

    if (student.status && student.status.toLowerCase() !== 'active') {
      throw new ValidationError(MESSAGES.CLASS_STUDENT_INACTIVE)
    }

    const resolvedStudentId = student.id

    // Prevent duplicate enrollment
    const enrollmentRepo = this.uow.resolve<IEnrollmentRepository>(TOKENS.EnrollmentRepository)
    const existingEnrollment = await enrollmentRepo.findMany({
      ClassId: classId,
      UserId: resolvedStudentId,
    })

    if (existingEnrollment && existingEnrollment.length > 0) {
      throw new ConflictError(MESSAGES.CLASS_STUDENT_ALREADY_ENROLLED)
    }

    const enrollment = await enrollmentRepo.create({
      ClassId: classId,
      UserId: resolvedStudentId,
    })

    return enrollment
  }
}
