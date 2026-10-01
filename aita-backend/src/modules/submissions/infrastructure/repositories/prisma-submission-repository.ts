import { ISubmissionRepository, SubmissionFilter } from '../../domain/repositories/submission-repository.interface.js'
import { Submission } from '../../domain/entities/submission.entity.js'
import { SubmissionMapper } from '../mappers/submission.mapper.js'

const includeDefault = {
  User_Submission_StudentIdToUser: true,
  Exam: {
    include: {
      SubmissionOverride: true,
    }
  },
  Class: true,
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
      include: includeDefault,
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
        Class: {
          InstructorClass: {
            some: {
              UserId: instructorId,
            },
          },
        },
      },
      include: includeDefault,
    })
    return raw ? SubmissionMapper.toDomain(raw) : null
  }

  async create(submission: Submission): Promise<void> {
    const data = SubmissionMapper.toPersistence(submission)
    await this.client.submission.create({ data })
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
