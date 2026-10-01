import { ISubjectRepository, SubjectFilter } from '../../domain/repositories/subject-repository.interface.js'
import { Subject } from '../../domain/entities/subject.entity.js'
import { SubjectMapper } from '../mappers/subject.mapper.js'

export class PrismaSubjectRepository implements ISubjectRepository {
  constructor(private readonly client: any) { }

  private mapFilterToWhere(filter?: SubjectFilter): any {
    const where: any = {}
    if (filter?.isActive !== undefined) where.IsActive = filter.isActive
    if (filter?.search) {
      where.OR = [
        { SubjectCode: { contains: filter.search } },
        { SubjectName: { contains: filter.search } }
      ]
    }
    return where
  }

  async findMany(filter?: SubjectFilter): Promise<Subject[]> {
    const rawList = await this.client.subject.findMany({
      where: this.mapFilterToWhere(filter),
      include: {
        SemesterSubject: {
          include: {
            Semester: {
              select: { Season: true, IsActive: true }
            }
          }
        }
      }
    })
    const sorted = rawList.sort((a: any, b: any) => {
      const semA = a.Semester != null ? Number(a.Semester) : 999
      const semB = b.Semester != null ? Number(b.Semester) : 999
      if (semA !== semB) return semA - semB
      return (a.SubjectCode || '').localeCompare(b.SubjectCode || '', undefined, { numeric: true, sensitivity: 'base' })
    })
    return sorted.map(SubjectMapper.toDomain)
  }

  async findById(id: string): Promise<Subject | null> {
    const raw = await this.client.subject.findUnique({ where: { Id: id } })
    return raw ? SubjectMapper.toDomain(raw) : null
  }

  async findByCode(code: string): Promise<Subject | null> {
    const raw = await this.client.subject.findUnique({ where: { SubjectCode: code } })
    return raw ? SubjectMapper.toDomain(raw) : null
  }

  async create(subject: Subject): Promise<void> {
    const data = SubjectMapper.toPersistence(subject)
    await this.client.subject.create({ data })
  }

  async update(subject: Subject): Promise<void> {
    const data = SubjectMapper.toPersistence(subject)
    await this.client.subject.update({
      where: { Id: subject.id },
      data
    })
  }

  async delete(id: string): Promise<void> {
    await this.client.$transaction(async (tx: any) => {
      // 1. Collect all dependent IDs
      const classes = await tx.class.findMany({ where: { SubjectId: id }, select: { Id: true } })
      const classIds = classes.map((c: any) => c.Id)

      const exams = await tx.exam.findMany({ where: { SubjectId: id }, select: { Id: true } })
      const examIds = exams.map((e: any) => e.Id)

      let subIds: string[] = []
      if (classIds.length || examIds.length) {
        const submissions = await tx.submission.findMany({
          where: {
            OR: [
              ...(classIds.length ? [{ ClassId: { in: classIds } }] : []),
              ...(examIds.length ? [{ ExamId: { in: examIds } }] : [])
            ]
          },
          select: { Id: true }
        })
        subIds = submissions.map((s: any) => s.Id)
      }

      let sessionIds: string[] = []
      if (subIds.length) {
        const sessions = await tx.gradingSession.findMany({ where: { SubmissionId: { in: subIds } }, select: { Id: true } })
        sessionIds = sessions.map((s: any) => s.Id)
      }

      let jobIds: string[] = []
      if (sessionIds.length) {
        const jobs = await tx.gradingJob.findMany({ where: { GradingSessionId: { in: sessionIds } }, select: { Id: true } })
        jobIds = jobs.map((j: any) => j.Id)
      }

      let execResultIds: string[] = []
      if (subIds.length || jobIds.length) {
        const execResults = await tx.executionResult.findMany({
          where: {
            OR: [
              ...(subIds.length ? [{ SubmissionId: { in: subIds } }] : []),
              ...(jobIds.length ? [{ GradingJobId: { in: jobIds } }] : [])
            ]
          },
          select: { Id: true }
        })
        execResultIds = execResults.map((e: any) => e.Id)
      }

      let ruleScoreIds: string[] = []
      if (execResultIds.length) {
        const ruleScores = await tx.ruleScore.findMany({ where: { ExecutionResultId: { in: execResultIds } }, select: { Id: true } })
        ruleScoreIds = ruleScores.map((r: any) => r.Id)
      }

      let sectionIds: string[] = []
      if (examIds.length) {
        const sections = await tx.examSection.findMany({ where: { ExamId: { in: examIds } }, select: { Id: true } })
        sectionIds = sections.map((s: any) => s.Id)
      }

      let ruleIds: string[] = []
      if (sectionIds.length) {
        const rules = await tx.rubricRule.findMany({ where: { SectionId: { in: sectionIds } }, select: { Id: true } })
        ruleIds = rules.map((r: any) => r.Id)
      }

      let criteriaIds: string[] = []
      if (ruleIds.length) {
        const criteria = await tx.rubricCriterion.findMany({ where: { RubricRuleId: { in: ruleIds } }, select: { Id: true } })
        criteriaIds = criteria.map((c: any) => c.Id)
      }

      // 2. Delete bottom-up
      if (ruleScoreIds.length) {
        await tx.criterionScore.deleteMany({ where: { RuleScoreId: { in: ruleScoreIds } } })
        await tx.evidence.deleteMany({ where: { RuleScoreId: { in: ruleScoreIds } } })
      }

      if (criteriaIds.length) {
        await tx.criterionScore.deleteMany({ where: { RubricCriterionId: { in: criteriaIds } } })
        await tx.rubricCriterion.deleteMany({ where: { Id: { in: criteriaIds } } })
      }

      if (ruleIds.length) {
        await tx.ruleScore.deleteMany({ where: { RubricRuleId: { in: ruleIds } } })
        await tx.rubricRule.deleteMany({ where: { Id: { in: ruleIds } } })
      }

      if (sectionIds.length) {
        await tx.examSection.deleteMany({ where: { Id: { in: sectionIds } } })
      }

      if (execResultIds.length) {
        await tx.ruleScore.deleteMany({ where: { ExecutionResultId: { in: execResultIds } } })
        await tx.executionResult.deleteMany({ where: { Id: { in: execResultIds } } })
      }

      if (jobIds.length) {
        await tx.jobDependency.deleteMany({ where: { OR: [{ JobId: { in: jobIds } }, { DependsOnJobId: { in: jobIds } }] } })
        await tx.gradingJob.deleteMany({ where: { Id: { in: jobIds } } })
      }

      if (sessionIds.length) {
        await tx.buildArtifact.deleteMany({ where: { GradingSessionId: { in: sessionIds } } })
        await tx.sandboxExecution.deleteMany({ where: { GradingSessionId: { in: sessionIds } } })
        await tx.gradingSession.deleteMany({ where: { Id: { in: sessionIds } } })
      }

      if (subIds.length) {
        await tx.submissionArtifact.deleteMany({ where: { SubmissionId: { in: subIds } } })
        await tx.appeal.deleteMany({ where: { SubmissionId: { in: subIds } } })
        await tx.aiUsageLog.deleteMany({ where: { SubmissionId: { in: subIds } } })
        await tx.submission.deleteMany({ where: { Id: { in: subIds } } })
      }

      if (classIds.length) {
        await tx.studentClass.deleteMany({ where: { ClassId: { in: classIds } } })
        await tx.instructorClass.deleteMany({ where: { ClassId: { in: classIds } } })
        await tx.examClass.deleteMany({ where: { ClassId: { in: classIds } } })
        await tx.class.deleteMany({ where: { SubjectId: id } })
      }

      if (examIds.length) {
        await tx.examAttachment.deleteMany({ where: { ExamId: { in: examIds } } })
        await tx.examGenerationHistory.deleteMany({ where: { ExamId: { in: examIds } } })
        await tx.referenceArtifact.deleteMany({ where: { ExamId: { in: examIds } } })
        await tx.sampleCode.deleteMany({ where: { ExamId: { in: examIds } } })
        await tx.testCase.deleteMany({ where: { ExamId: { in: examIds } } })
        await tx.aiUsageLog.deleteMany({ where: { ExamId: { in: examIds } } })
        await tx.exam.deleteMany({ where: { SubjectId: id } })
      }

      // Delete top-level Subject dependents
      await tx.subjectProjectType.deleteMany({ where: { SubjectId: id } })
      await tx.assignmentTemplate.deleteMany({ where: { SubjectId: id } })
      await tx.promptTemplate.deleteMany({ where: { SubjectId: id } })

      // Finally delete Subject
      await tx.subject.delete({ where: { Id: id } })
    })
  }

  async save(subject: Subject): Promise<void> {
    const existing = await this.client.subject.findUnique({ where: { Id: subject.id } })
    if (existing) {
      await this.update(subject)
    } else {
      await this.create(subject)
    }
  }

  async autoLinkSemestersByNumber(subjectId: string, semesterNumber: number): Promise<void> {
    // Find all semesters where the code contains the semester number (e.g., "Kỳ 3" for semester 3)
    const semesters = await this.client.semester.findMany({
      where: {
        Code: {
          contains: `${semesterNumber}`
        }
      },
      select: { Id: true }
    })

    if (semesters.length === 0) {
      return // No matching semesters found
    }

    const semesterIds = semesters.map((s: any) => s.Id)

    // Check for existing links
    const existingLinks = await this.client.semesterSubject.findMany({
      where: {
        SubjectId: subjectId,
        SemesterId: { in: semesterIds }
      },
      select: { SemesterId: true }
    })
    const existingSemesterIds = new Set(existingLinks.map((l: any) => l.SemesterId))

    // Only link to semesters that don't already have this subject
    const newLinks = semesterIds
      .filter((semId: string) => !existingSemesterIds.has(semId))
      .map((semId: string) => ({ SemesterId: semId, SubjectId: subjectId }))

    if (newLinks.length > 0) {
      await this.client.semesterSubject.createMany({ data: newLinks })
    }
  }

  async getSubjectStudents(
    subjectId: string,
    semesterId?: string,
    classId?: string,
    skip?: number,
    take?: number
  ): Promise<{ total: number, enrollments: any[] }> {
    const whereClause: any = {
      Class: {
        SubjectId: subjectId,
        ...(semesterId && { SemesterId: semesterId }),
        ...(classId && classId !== 'all' && { Id: classId })
      }
    }

    const [total, enrollments] = await Promise.all([
      this.client.studentClass.count({ where: whereClause }),
      this.client.studentClass.findMany({
        where: whereClause,
        select: {
          User: { select: { Id: true, FullName: true, Email: true, StudentCode: true, Avatar: true } },
          Class: { select: { Id: true, ClassCode: true } }
        },
        skip,
        take,
        orderBy: [
          { Class: { ClassCode: 'asc' } },
          { User: { FullName: 'asc' } }
        ]
      })
    ])

    return { total, enrollments }
  }
}
