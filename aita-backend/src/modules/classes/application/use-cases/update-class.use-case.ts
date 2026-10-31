import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import { ConflictError, NotFoundError } from '../../../../shared/application/app.error.js'
import { UpdateClassRequestDto, ClassResponseDto } from '../dtos/class.dto.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class UpdateClassUseCase implements IUseCase<{ classId: string; dto: UpdateClassRequestDto }, ReturnType<typeof ClassResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) {}

  async execute({ classId, dto }: { classId: string; dto: UpdateClassRequestDto }) {
    const { data } = dto

    const classRepo = this.uow.resolve<IClassRepository>(TOKENS.ClassRepository)
    const subjectRepo = this.uow.resolve<any>(TOKENS.SubjectRepository)
    const semesterRepo = this.uow.resolve<any>(TOKENS.SemesterRepository)
    const userRepo = this.uow.resolve<any>(TOKENS.UserRepository)

    const existingClass = await classRepo.findById(classId)
    if (!existingClass) {
      throw new NotFoundError(MESSAGES.CLASS_NOT_FOUND || 'Không tìm thấy lớp học')
    }

    const newCode = data.code ?? existingClass.classCode
    const newSemesterId = data.semesterId ?? existingClass.semesterId
    const newSubjectId = data.subjectId ?? existingClass.subjectId
    
    if (newCode !== existingClass.classCode || newSemesterId !== existingClass.semesterId || newSubjectId !== existingClass.subjectId) {
      const duplicateClass = await classRepo.findByCodeSemesterAndSubject(newCode as string, newSemesterId as string, newSubjectId as string)
      if (duplicateClass && duplicateClass.id !== classId) {
        throw new ConflictError(MESSAGES.CLASS_ALREADY_EXISTS || 'Mã lớp đã tồn tại cho môn học này trong kỳ học này')
      }
    }

    if (data.subjectId) {
      const subject = await subjectRepo.findById(data.subjectId)
      if (!subject) throw new NotFoundError(MESSAGES.SUBJECT_NOT_FOUND || 'Không tìm thấy môn học')
    }

    if (data.semesterId) {
      const semester = await semesterRepo.findById(data.semesterId)
      if (!semester) throw new NotFoundError('Không tìm thấy kỳ học')
    }

    if (data.lecturerId) {
      const lecturer = await userRepo.findById(data.lecturerId)
      if (!lecturer) throw new NotFoundError(MESSAGES.INSTRUCTOR_NOT_FOUND || 'Không tìm thấy giảng viên')
    }

    if (data.code !== undefined) (existingClass as any).classCode = data.code
    if (data.subjectId !== undefined) (existingClass as any).subjectId = data.subjectId
    if (data.semesterId !== undefined) (existingClass as any).semesterId = data.semesterId

    await classRepo.update(existingClass)

    if (data.lecturerId !== undefined) {
      if ((data as any).keepExistingInstructors === false) {
        await classRepo.clearInstructors(classId)
        if (data.lecturerId) {
          await classRepo.assignInstructor(classId, data.lecturerId)
        }
      } else {
        // Default: keep existing instructors, avoid wiping out other lecturers
        if (data.lecturerId) {
          if (typeof (classRepo as any).isInstructor === 'function') {
            const alreadyAssigned = await (classRepo as any).isInstructor(classId, data.lecturerId)
            if (!alreadyAssigned) {
              await classRepo.assignInstructor(classId, data.lecturerId)
            }
          } else {
            await classRepo.assignInstructor(classId, data.lecturerId)
          }
        } else {
          await classRepo.clearInstructors(classId)
        }
      }
    }

    // Batch enroll selected students if provided
    if (data.studentIds && Array.isArray(data.studentIds) && data.studentIds.length > 0) {
      try {
        const { prisma } = await import('../../../../database/prisma.js')
        for (const sId of data.studentIds) {
          try {
            await (prisma as any).studentClass.upsert({
              where: { UserId_ClassId: { UserId: sId, ClassId: classId } },
              update: {},
              create: {
                UserId: sId,
                ClassId: classId,
                EnrolledAt: new Date(),
              },
            })
          } catch {
            // ignore duplicate
          }
        }
      } catch (err) {
        console.error('Failed to batch enroll students in update class:', err)
      }
    }

    const finalClass = await classRepo.findById(classId)
    return ClassResponseDto.from(finalClass as any)
  }
}
