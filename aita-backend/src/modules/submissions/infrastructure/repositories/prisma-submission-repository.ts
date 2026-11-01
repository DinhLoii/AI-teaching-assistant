import { ISubmissionRepository, SubmissionFilter } from '../../domain/repositories/submission-repository.interface.js'
import { Submission } from '../../domain/entities/submission.entity.js'
import { SubmissionMapper } from '../mappers/submission.mapper.js'
import { requiresManualUiStart } from '../../application/ui-grading-policy.js'

const includeDefault = {
  User_Submission_StudentIdToUser: {
    select: {
      Id: true,
      FullName: true,
      StudentCode: true,
    }
  },
  Exam: {
    select: {
      Id: true,
      Title: true,
      Description: true,
      TotalPoints: true,
      DueDate: true,
      SubmissionOverride: { select: { StudentId: true, ClassId: true, ExtendedDueDate: true } },
    }
  },
  Class: {
    select: {
      Id: true,
      ClassCode: true,
    }
  },
  SubmissionArtifact: true,
}

export class PrismaSubmissionRepository implements ISubmissionRepository {
  constructor(private readonly client: any) {}

  private mapFilterToWhere(filter?: SubmissionFilter): any {
    const where: any = {}
    if (filter?.examId) where.ExamId = filter.examId
    if (filter?.studentId) where.StudentId = filter.studentId
    if (filter?.classId) where.ClassId = filter.classId
    if (filter?.status) where.GradingStatus = filter.status
    if (filter?.latestOnly) where.OR = [{ IsLatest: true }, { IsLatest: null }]
    if (filter?.instructorId) {
      where.Class = {
        InstructorClass: {
          some: { UserId: filter.instructorId }
        }
      }
    }
    return where
  }

  async findMany(filter?: SubmissionFilter): Promise<Submission[]> {
    const rawList = await this.client.submission.findMany({
      where: this.mapFilterToWhere(filter),
      ...(filter?.summary ? { omit: { ReportData: true }, include: {
        ...includeDefault,
        SubmissionArtifact: false,
        Exam: { select: { Id: true, Title: true, TotalPoints: true, DueDate: true, SubmissionOverride: includeDefault.Exam.select.SubmissionOverride } },
      } } : { include: includeDefault }),
      orderBy: { SubmittedAt: 'desc' },
    })
    return rawList.map(SubmissionMapper.toDomain)
  }

  async findRecent(filter?: SubmissionFilter, take = 5): Promise<Submission[]> {
    const rawList = await this.client.submission.findMany({
      where: this.mapFilterToWhere(filter),
      include: includeDefault,
      orderBy: { SubmittedAt: 'desc' },
      take,
    })
    return rawList.map(SubmissionMapper.toDomain)
  }

  async findById(id: string): Promise<Submission | null> {
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }
    const raw = await this.client.submission.findUnique({
      where: { Id: id },
      include: includeDefault,
    })
    return raw ? SubmissionMapper.toDomain(raw) : null
  }

  async findByIdForInstructor(id: string, instructorId: string): Promise<Submission | null> {
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null
    }
    const raw = await this.client.submission.findFirst({
      where: {
        Id: id,
        OR: [
          {
            Class: {
              InstructorClass: {
                some: {
                  UserId: instructorId,
                },
              },
            },
          },
          { Exam: { CreatedBy: instructorId } },
        ],
      },
      include: includeDefault,
    })
    return raw ? SubmissionMapper.toDomain(raw) : null
  }

  async create(submission: Submission): Promise<void> {
    const data = SubmissionMapper.toPersistence(submission)
    await this.client.submission.create({ data })
  }

  async createAttempt(submission: Submission): Promise<void> {
    const persist = async (tx: any) => {
      // Serialize the attempt sequence, including the first upload (no existing row to lock).
      const scope = `${submission.studentId}:${submission.examId}:${submission.classId}`
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 0))`
      const where = { StudentId: submission.studentId, ExamId: submission.examId, ClassId: submission.classId }
      const previous = await tx.submission.aggregate({ where, _max: { AttemptNumber: true } })
      submission.attemptNumber = (previous._max.AttemptNumber || 0) + 1
      submission.isLatest = true
      await tx.submission.updateMany({ where, data: { IsLatest: false } })
      const exam = await tx.exam.findUnique({ where: { Id: submission.examId }, select: { GradingStrategy: true, SubmissionFormat: true, AiGeneratedContent: true, Subject: { select: { SubjectCode: true } } } })
      const continuous = submission.zipFileUrl && exam?.GradingStrategy !== 'BATCH_POST_DEADLINE' && !requiresManualUiStart(exam)
      // Return the same state that is committed, so student clients start tracking
      // the new attempt instead of displaying the entity's default Pending state.
      submission.gradingStatus = continuous ? 'Processing' : 'Pending'
      await tx.submission.create({ data: { ...SubmissionMapper.toPersistence(submission), ...(continuous ? { GradingStatus: 'Processing' } : {}) } })
      if (continuous) await tx.$executeRaw`INSERT INTO "SubmissionGradingTask" ("SubmissionId", "Lane") VALUES (${submission.id}, 'continuous') ON CONFLICT ("SubmissionId") DO NOTHING`
    }
    if (typeof this.client.$transaction === 'function') {
      await this.client.$transaction(persist)
    } else {
      await persist(this.client)
    }
  }

  async update(submission: Submission): Promise<void> {
    const data = SubmissionMapper.toPersistence(submission)
    await this.client.submission.update({
      where: { Id: submission.id },
      data,
    })
  }

  async save(submission: Submission): Promise<void> {
    const existing = await this.client.submission.findUnique({ where: { Id: submission.id } })
    if (existing) {
      await this.update(submission)
    } else {
      await this.create(submission)
    }
  }
}
