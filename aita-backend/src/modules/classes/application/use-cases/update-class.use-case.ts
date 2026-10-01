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
      const duplicateClass = await classRepo.findByCodeAndSubject(newCode as string, newSubjectId as string)
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

    return this.uow.runInTransaction(async (txn) => {
      const txClassRepo = txn.resolve<IClassRepository>(TOKENS.ClassRepository)
      
      const classToUpdate = await txClassRepo.findById(classId)
      if (!classToUpdate) throw new NotFoundError('Lớp học không tồn tại')

      if (data.code !== undefined) (classToUpdate as any).classCode = data.code
      if (data.subjectId !== undefined) (classToUpdate as any).subjectId = data.subjectId
      if (data.semesterId !== undefined) (classToUpdate as any).semesterId = data.semesterId

      await txClassRepo.update(classToUpdate)

      if (data.lecturerId !== undefined) {
        if ((data as any).keepExistingInstructors === false) {
          await txClassRepo.clearInstructors(classId)
          if (data.lecturerId) {
            await txClassRepo.assignInstructor(classId, data.lecturerId)
          }
        } else {
          // Default: keep existing instructors, avoid wiping out other lecturers
          if (data.lecturerId) {
            if (typeof (txClassRepo as any).isInstructor === 'function') {
              const alreadyAssigned = await (txClassRepo as any).isInstructor(classId, data.lecturerId)
              if (!alreadyAssigned) {
                await txClassRepo.assignInstructor(classId, data.lecturerId)
              }
            } else {
              await txClassRepo.assignInstructor(classId, data.lecturerId)
            }
          } else {
            await txClassRepo.clearInstructors(classId)
          }
        }
      }

      const finalClass = await txClassRepo.findById(classId)
      return ClassResponseDto.from(finalClass as any)
    })
  }
}
