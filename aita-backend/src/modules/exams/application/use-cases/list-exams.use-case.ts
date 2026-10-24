import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import type { ExamStatusValue, ExamTypeValue } from '../../domain/entities/exam.entity.js'
import { prisma } from '../../../../database/prisma.js'
import { studentExamDeadlines } from '../student-deadlines.js'

export class ListExamsUseCase implements IUseCase<{ user: AuthUser; params: any }, ExamResponseDto[]> {
  constructor(
    private readonly examRepo: IExamRepository,
    private readonly uow: IUnitOfWork, // For legacy repo access during migration
    private readonly db: any = prisma,
  ) { }

  async execute({ user, params }: { user: AuthUser; params: any }): Promise<ExamResponseDto[]> {
    const { classId, status, type } = params

    // Synchronize check with PublishedAssignment table (handles any assignments soft-deleted in grading engine)
    const softDeletedPublishedIds = new Set<string>();
    const deletedPublishedRequest = this.db.publishedAssignment.findMany({
        where: { IsDeleted: true },
        select: { Id: true }
      }).catch(() => []);
    const roleClassesRequest = user.role === 'LECTURER' || user.role === 'STUDENT'
      ? this.uow.resolve<any>(Symbol.for('ClassRepository')).findMany(user.role === 'LECTURER'
        ? { instructorId: user.id } : { studentId: user.id }, { scopeOnly: true })
      : Promise.resolve([]);
    const roleClasses = await roleClassesRequest;

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
    if (user.role === 'LECTURER') filter.lecturerScope = {
      userId: user.id, subjectIds: roleClasses.map((c: any) => c.subjectId).filter(Boolean),
    }
    if (user.role === 'STUDENT') filter.studentScope = {
      classIds: roleClasses.map((c: any) => c.id), subjectIds: roleClasses.map((c: any) => c.subjectId).filter(Boolean),
    }

    let exams = await this.examRepo.findMany(filter, { summary: params.view === 'summary' })
    for (const p of await deletedPublishedRequest) {
      if (p.Id) softDeletedPublishedIds.add(p.Id)
    }
    exams = exams.filter(exam => {
      const isDel = (exam as any).isDeleted || (exam as any).IsDeleted;
      const statusLower = (exam.status || (exam as any).Status || '')?.toLowerCase();
      if (isDel || statusLower === 'deleted') return false;
      if (softDeletedPublishedIds.has(exam.id)) return false;
      return true;
    })

    // Role-based filtering (in-memory for now to reuse legacy repo logic)
    if (user.role === 'LECTURER') {
      const classes = roleClasses
      const allowedSubjectIds = new Set(classes.map((c: any) => c.subjectId))
      // Lecturer sees exams for subjects they teach OR exams explicitly assigned to their classes OR created by them
      exams = exams.filter(exam => 
        (exam.subjectId && allowedSubjectIds.has(exam.subjectId)) || 
        ((exam as any).createdBy === user.id)
      )
    }

    if (user.role === 'STUDENT') {
      const enrolled = roleClasses
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

    const deadlines = user.role === 'STUDENT'
      ? await studentExamDeadlines(this.db, user.id, exams.map(exam => exam.id), classId)
      : new Map<string, Date>()
    return exams.map(exam => {
      const result = ExamResponseDto.from(exam as any)
      const due = deadlines.get(exam.id)?.toISOString()
      return due ? { ...result, due: due, dueAt: due, dueDate: due } : result
    })
  }
}
