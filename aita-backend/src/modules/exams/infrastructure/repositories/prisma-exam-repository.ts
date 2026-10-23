import { IExamRepository, ExamFilter } from '../../domain/repositories/exam-repository.interface.js'
import { Exam } from '../../domain/entities/exam.entity.js'
import { ExamMapper } from '../mappers/exam.mapper.js'

const summarySelect = {
  Id: true, Title: true, Description: true, SubjectId: true, ExamType: true,
  Duration: true, StartDate: true, DueDate: true, TotalPoints: true,
  WeightPercentage: true, Status: true, CreatedBy: true,
  GradingStrategy: true, AllowLateSubmission: true, LatePenaltyType: true,
  LatePenaltyValue: true, IsDeleted: true,
  Subject: { select: { SubjectCode: true, SubjectName: true } },
  ExamClass: { select: { ClassId: true } },
  _count: { select: { Submission: true } },
}

export class PrismaExamRepository implements IExamRepository {
  constructor(private readonly client: any) { }

  private get include() {
    return {
      Subject: true,
      ExamClass: {
        include: {
          Class: {
            include: {
              InstructorClass: {
                include: { User: { select: { Id: true, FullName: true, Avatar: true } } }
              },
              // Used only to match a viewing student to the class they belong to, so they see
              // that class's lecturer. Never serialised — ExamResponseDto maps named fields.
              StudentClass: { select: { UserId: true } }
            }
          }
        }
      },
      ExamAttachment: true,
      ExamSection: {
        orderBy: { SortOrder: 'asc' },
        include: {
          RubricRule: {
            orderBy: { SortOrder: 'asc' },
            include: {
              RubricCriterion: {
                orderBy: { SortOrder: 'asc' }
              }
            }
          }
        }
      },
      _count: { select: { Submission: true } }
    }
  }

  async findMany(filter?: ExamFilter, options?: { skip?: number; take?: number; summary?: boolean }): Promise<Exam[]> {
    const where: any = {
      NOT: [
        { IsDeleted: true },
        { Status: 'Deleted' }
      ]
    }

    if (filter?.classId) {
      where.OR = [
        { ExamClass: { some: { ClassId: filter.classId } } },
        ...(filter.subjectId ? [{ SubjectId: filter.subjectId, ExamClass: { none: {} } }] : [])
      ]
    } else if (filter?.subjectId) {
      where.SubjectId = filter.subjectId
    }
    if (filter?.status) {
      where.Status = filter.status
    }
    if (filter?.examType) {
      where.ExamType = filter.examType
    }
    if (filter?.lecturerScope) {
      where.AND = [{ OR: [
        { CreatedBy: filter.lecturerScope.userId },
        { SubjectId: { in: filter.lecturerScope.subjectIds } },
      ] }]
    }
    if (filter?.studentScope) {
      where.AND = [
        { Status: { in: ['Published', 'published', 'PUBLISHED'] } },
        { OR: [
          { ExamClass: { some: { ClassId: { in: filter.studentScope.classIds } } } },
          { SubjectId: { in: filter.studentScope.subjectIds }, ExamClass: { none: {} } },
        ] },
      ]
    }

    const rawExams = await this.client.exam.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      ...(options?.summary ? {
        select: summarySelect
      } : { include: this.include })
    })

    return rawExams.map((raw: any) => ExamMapper.toDomain(options?.summary
      ? { ...raw, Description: raw.Description?.slice(0, 300) }
      : raw))
  }

  async findById(id: string, options?: { summary?: boolean }): Promise<Exam | null> {
    const raw = await this.client.exam.findUnique({
      where: { Id: id },
      ...(options?.summary ? { select: summarySelect } : { include: { ...this.include, TestCase: { orderBy: { SortOrder: 'asc' } } } })
    })
    return raw ? ExamMapper.toDomain(options?.summary ? { ...raw, Description: raw.Description?.slice(0, 300) } : raw) : null
  }

  async create(exam: Exam): Promise<void> {
    const data = ExamMapper.toPersistence(exam)
    await this.client.exam.create({ data })
  }

  async update(exam: Exam): Promise<void> {
    const data = ExamMapper.toPersistence(exam)
    await this.client.exam.update({
      where: { Id: exam.id },
      data
    })
  }

  async save(exam: Exam): Promise<void> {
    const existing = await this.client.exam.findUnique({ where: { Id: exam.id } })
    if (existing) {
      await this.update(exam)
    } else {
      await this.create(exam)
    }
  }

  async assignToClass(examId: string, classId: string, dueDate?: string): Promise<void> {
    await this.client.examClass.create({
      data: {
        ExamId: examId,
        ClassId: classId,
        AssignedAt: new Date(),
        DueDate: dueDate ? new Date(dueDate) : null
      }
    })
  }

  async addAttachment(examId: string, attachment: { fileName: string, fileUrl: string, fileType: string }): Promise<void> {
    await this.client.examAttachment.create({
      data: {
        ExamId: examId,
        FileName: attachment.fileName,
        FileUrl: attachment.fileUrl,
        FileType: attachment.fileType
      }
    })
  }

  async getAttachment(attachmentId: string): Promise<{ fileUrl: string, fileName: string, examId?: string | null, fileType?: string | null } | null> {
    const attachment = await this.client.examAttachment.findUnique({
      where: { Id: attachmentId }
    })
    if (!attachment) return null;
    return {
      fileUrl: attachment.FileUrl,
      fileName: attachment.FileName,
      examId: attachment.ExamId,
      fileType: attachment.FileType,
    }
  }
}
