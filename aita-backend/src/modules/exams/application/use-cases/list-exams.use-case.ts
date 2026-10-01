import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import type { ExamStatusValue, ExamTypeValue } from '../../domain/entities/exam.entity.js'
import { prisma } from '../../../../database/prisma.js'

export class ListExamsUseCase implements IUseCase<{ user: AuthUser; params: any }, ExamResponseDto[]> {
  constructor(
    private readonly examRepo: IExamRepository,
    private readonly uow: IUnitOfWork // For legacy repo access during migration
  ) { }

  async execute({ user, params }: { user: AuthUser; params: any }): Promise<ExamResponseDto[]> {
    const { classId, status, type } = params

    // Synchronize check with PublishedAssignment table (handles any assignments soft-deleted in grading engine)
    const softDeletedPublishedIds = new Set<string>();
    try {
      const deletedPublished = await (prisma as any).publishedAssignment.findMany({
        where: { IsDeleted: true },
        select: { Id: true }
      });
      for (const p of deletedPublished) {
        if (p.Id) softDeletedPublishedIds.add(p.Id);
      }
      if (softDeletedPublishedIds.size > 0) {
        prisma.exam.updateMany({
          where: {
            Id: { in: Array.from(softDeletedPublishedIds) },
            OR: [
              { IsDeleted: false },
              { IsDeleted: null },
              { Status: { not: 'Deleted' } }
            ]
          },
          data: {
            IsDeleted: true,
            Status: 'Deleted',
            DeletedAt: new Date()
          }
        }).catch(() => {});
      }
    } catch (e) { }

    // Base filter
    const filter: any = {}
    if (classId) {
      filter.classId = classId
      try {
        const cls = await this.uow.resolve<any>(Symbol.for('ClassRepository')).findById(classId)
        if (cls?.subjectId) filter.subjectId = cls.subjectId
      } catch (e) {}
    }
    if (type) filter.examType = String(type) as ExamTypeValue
    if (status) filter.status = String(status) as ExamStatusValue

    let exams = await this.examRepo.findMany(filter)
    exams = exams.filter(exam => {
      const isDel = (exam as any).isDeleted || (exam as any).IsDeleted;
      const statusLower = (exam.status || (exam as any).Status || '')?.toLowerCase();
      if (isDel || statusLower === 'deleted') return false;
      if (softDeletedPublishedIds.has(exam.id)) return false;
      return true;
    })

    // Role-based filtering (in-memory for now to reuse legacy repo logic)
    if (user.role === 'LECTURER') {
      const classes = await this.uow.resolve<any>(Symbol.for('ClassRepository')).findMany({
        instructorId: user.id
      })
      const allowedSubjectIds = new Set(classes.map((c: any) => c.subjectId))
      // Lecturer sees exams for subjects they teach OR exams explicitly assigned to their classes OR created by them
      exams = exams.filter(exam => 
        (exam.subjectId && allowedSubjectIds.has(exam.subjectId)) || 
        ((exam as any).createdBy === user.id)
      )
    }

    if (user.role === 'STUDENT') {
      const enrolled = await this.uow.resolve<any>(Symbol.for('ClassRepository')).findMany({ studentId: user.id })
      const enrolledClassIds = new Set(enrolled.map((c: any) => c.id))
      const enrolledSubjectIds = new Set(enrolled.map((c: any) => c.subjectId).filter(Boolean))

      exams = exams.filter(exam => {
        const isDel = (exam as any).isDeleted || (exam as any).IsDeleted;
        const statusLower = (exam.status || (exam as any).Status || '')?.toLowerCase();
        if (isDel || statusLower !== 'published' || statusLower === 'deleted') return false;
        if (softDeletedPublishedIds.has(exam.id)) return false;
        
        // Match by explicitly assigned class OR match by subject if the exam hasn't been specifically assigned
        const classIds = (exam as any).classes || [];
        if (classIds.length > 0) {
          return classIds.some((cid: string) => enrolledClassIds.has(cid));
        } else {
          return exam.subjectId && enrolledSubjectIds.has(exam.subjectId);
        }
      })
    }

    return exams.map(exam => ExamResponseDto.from(exam as any))
  }
}
