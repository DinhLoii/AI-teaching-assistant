import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { NotFoundError, ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class DeleteSemesterUseCase implements IUseCase<string, void> {
  constructor(private readonly semesterRepo: ISemesterRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.semesterRepo.findById(id)
    if (!existing) {
      throw new NotFoundError(MESSAGES.SEMESTER_NOT_FOUND || 'Không tìm thấy kỳ học')
    }

    try {
      const { prisma } = await import('../../../../database/prisma.js')
      
      // Get all class codes in this semester BEFORE deletion
      const classesInSemester = await (prisma as any).class.findMany({
        where: { SemesterId: id },
        select: { ClassCode: true }
      })
      const classCodes = classesInSemester.map((c: any) => c.ClassCode).filter(Boolean)

      await this.semesterRepo.delete(id)
      
      // Revert pending enrollments for this semester (main classes)
      if (existing.code) {
        await (prisma as any).pendingEnrollment.updateMany({
          where: { SemesterCode: existing.code },
          data: { Status: 'Pending' }
        })
      }
      
      // Revert pending enrollments for any classes that were in this semester (extra classes)
      if (classCodes.length > 0) {
        await (prisma as any).pendingEnrollment.updateMany({
          where: { ClassCode: { in: classCodes } },
          data: { Status: 'Pending' }
        })
      }
    } catch (e: any) {
      if (e.code === 'P2003') { // Prisma Foreign Key constraint
        throw new ConflictError('Không thể xóa kỳ học đã có lớp học. Hãy xóa các lớp học trước.')
      }
      throw e
    }
  }
}
