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

    // Background sync pending enrollments retroactively (do not await)
    if (user.role !== 'STUDENT') {
      import('../../../../database/prisma.js').then(async ({ prisma }) => {
        try {
          const pending = await (prisma as any).pendingEnrollment.findMany({ where: { Status: 'Pending' } });
          for (const pe of pending) {
            const potentialClasses = await (prisma as any).class.findMany({
              where: {
                ClassCode: pe.ClassCode
              },
              include: { Semester: true, Subject: true }
            });
            
            const peSemNumMatch = pe.SemesterCode?.match(/\d+/)
            const peSemNum = peSemNumMatch ? parseInt(peSemNumMatch[0], 10) : null

            for (const cls of potentialClasses) {
              const clsSemNumMatch = cls.Semester?.Code?.match(/\d+/)
              const clsSemNum = clsSemNumMatch ? parseInt(clsSemNumMatch[0], 10) : null
              
              const isSemesterMatch = cls.Semester?.Code === pe.SemesterCode || (peSemNum !== null && peSemNum === clsSemNum)
              const isSubjectMatch = pe.SubjectCode ? (cls.Subject?.SubjectCode?.toLowerCase() === pe.SubjectCode.toLowerCase()) : true

              if (isSemesterMatch && isSubjectMatch) {
                const alreadyEnrolledInSubject = await (prisma as any).studentClass.findFirst({
                  where: {
                    UserId: pe.UserId,
                    Class: {
                      SubjectId: cls.SubjectId,
                      SemesterId: cls.SemesterId
                    }
                  }
                });
                if (!alreadyEnrolledInSubject) {
                  await (prisma as any).studentClass.create({
                    data: { UserId: pe.UserId, ClassId: cls.Id, EnrolledAt: new Date() }
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Background sync failed:', err);
        }
      }).catch(console.error);
    }

    // Internal note is visible only to staff; never expose it to students.
    const includeNote = user.role !== 'STUDENT'
    return classes.map(c => ClassResponseDto.from(c, includeNote))
  }
}
