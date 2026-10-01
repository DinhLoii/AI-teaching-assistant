import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import { ConflictError, NotFoundError } from '../../../../shared/application/app.error.js'
import { CreateClassRequestDto, ClassResponseDto } from '../dtos/class.dto.js'
import { Class } from '../../domain/entities/class.entity.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { detectSeasonFromFilename, matchesSeason } from '../../../../shared/utils/season-detector.util.js'

export class CreateClassUseCase implements IUseCase<CreateClassRequestDto, ReturnType<typeof ClassResponseDto.from>> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute(dto: CreateClassRequestDto) {
    const { data } = dto

    // We can resolve the class repo outside transaction for reads
    const classRepo = this.uow.resolve<IClassRepository>(TOKENS.ClassRepository)
    const subjectRepo = this.uow.resolve<any>(TOKENS.SubjectRepository)
    const semesterRepo = this.uow.resolve<any>(TOKENS.SemesterRepository)
    const userRepo = this.uow.resolve<any>(TOKENS.UserRepository)

    if (!data.semesterId || !data.subjectId) {
      throw new Error('SemesterId and SubjectId are required')
    }
    const existingClass = await classRepo.findByCodeSemesterAndSubject(data.code, data.semesterId, data.subjectId)
    if (existingClass) {
      throw new ConflictError(MESSAGES.CLASS_ALREADY_EXISTS)
    }

    const subject = await subjectRepo.findById(data.subjectId)
    if (!subject) {
      throw new NotFoundError(MESSAGES.SUBJECT_NOT_FOUND)
    }

    const semester = await semesterRepo.findById(data.semesterId)
    if (!semester) {
      throw new NotFoundError('Không tìm thấy kỳ học')
    }

    if (data.lecturerId) {
      const lecturer = await userRepo.findById(data.lecturerId)
      if (!lecturer) {
        throw new NotFoundError(MESSAGES.INSTRUCTOR_NOT_FOUND)
      }
    }

    const result = await this.uow.runInTransaction(async (txn) => {
      // Resolve transaction-bound repository
      const txClassRepo = txn.resolve<IClassRepository>(TOKENS.ClassRepository)

      const cls = Class.create(
        randomUUID(),
        data.code,
        data.subjectId,
        data.semesterId as string
      )

      await txClassRepo.create(cls)

      if (data.lecturerId) {
        await txClassRepo.assignInstructor(cls.id, data.lecturerId)
      }

      const finalClass = await txClassRepo.findById(cls.id)
      return finalClass
    })

    // Auto-enrollment logic
    try {
      const { prisma } = await import('../../../../database/prisma.js')

      const pendingEnrollmentsAll = await (prisma as any).pendingEnrollment.findMany({
        where: {
          ClassCode: data.code,
          Status: 'Pending'
        }
      })

      const targetSemNumMatch = semester.code?.match(/\d+/)
      const targetSemNum = targetSemNumMatch ? parseInt(targetSemNumMatch[0], 10) : null
      const targetSubjectCode = subject.subjectCode?.toLowerCase()

      const dbSemester = await (prisma as any).semester.findUnique({ where: { Id: data.semesterId } })
      const dbSeason = dbSemester?.Season

      const pendingEnrollments = pendingEnrollmentsAll.filter((pe: any) => {
        let isSeasonMatch = true
        if (dbSeason && pe.Season) {
          try {
            const detected = detectSeasonFromFilename(pe.Season + '.xlsx')
            isSeasonMatch = matchesSeason(dbSeason, detected)
          } catch (e) {
            isSeasonMatch = false
          }
        } else if (pe.Season && !dbSeason) {
          isSeasonMatch = false // Pending has season, but target semester does not have season assigned yet
        }

        const peSemNumMatch = pe.SemesterCode?.match(/\d+/)
        const peSemNum = peSemNumMatch ? parseInt(peSemNumMatch[0], 10) : null

        const isSemesterMatch = pe.SemesterCode === semester.code || (peSemNum !== null && peSemNum === targetSemNum)
        const isSubjectMatch = pe.SubjectCode ? pe.SubjectCode.toLowerCase() === targetSubjectCode : true

        return isSemesterMatch && isSubjectMatch && isSeasonMatch
      })

      if (pendingEnrollments.length > 0) {
        // Enroll students
        for (const pe of pendingEnrollments) {
          const existingEnrollment = await prisma.studentClass.findUnique({
            where: { UserId_ClassId: { UserId: pe.UserId, ClassId: result!.id } }
          })
          if (!existingEnrollment) {
            await prisma.studentClass.create({
              data: { UserId: pe.UserId, ClassId: result!.id, EnrolledAt: new Date() }
            })
          }
        }

        // Mark as enrolled ONLY if it is a subject-specific pending enrollment.
        // If it's a semester-wide (SubjectCode is null), we keep it Pending
        // so they get enrolled in all other subjects for this class/semester too!
        const specificPes = pendingEnrollments.filter((pe: any) => pe.SubjectCode !== null)
        if (specificPes.length > 0) {
          await (prisma as any).pendingEnrollment.updateMany({
            where: {
              Id: { in: specificPes.map((pe: any) => pe.Id) }
            },
            data: { Status: 'Enrolled' }
          })
        }
      }
    } catch (err) {
      console.error('Failed to auto-enroll students:', err)
    }

    // Fetch the updated class so the frontend immediately sees the correct studentCount
    const updatedClass = await classRepo.findById(result!.id)
    return ClassResponseDto.from(updatedClass as any)
  }
}
