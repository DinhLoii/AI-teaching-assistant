
import { randomUUID } from 'crypto'
import { Semester } from '../../domain/entities/semester.entity.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { matchesSeason, type DetectedSeason } from '../../../../shared/utils/season-detector.util.js'

export class SemesterRepository implements ISemesterRepository {
  constructor(private readonly prisma: any) { }

  async findById(id: string): Promise<Semester | null> {
    const raw = await this.prisma.semester.findUnique({ where: { Id: id } })
    return raw ? Semester.fromPersistence(raw) : null
  }

  async findByCode(code: string): Promise<Semester | null> {
    const raw = await this.prisma.semester.findFirst({ where: { Code: code } })
    return raw ? Semester.fromPersistence(raw) : null
  }

  async findByCodeAndSeason(code: string, season?: string): Promise<Semester | null> {
    const candidates = await this.prisma.semester.findMany({
      where: { Code: code },
      include: {
        _count: {
          select: {
            Class: true,
            SemesterSubject: true
          }
        }
      }
    })
    if (!season) {
      if (!candidates[0]) return null
      const sem = Semester.fromPersistence(candidates[0])
      ;(sem as any).classCount = candidates[0]._count?.Class ?? 0
      ;(sem as any).subjectCount = candidates[0]._count?.SemesterSubject ?? 0
      return sem
    }
    const yearMatch = season.match(/\b(20\d{2})\b/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0
    const seasonName = season.replace(/[^a-zA-Z]/g, '').trim() || season
    const pseudo: DetectedSeason = { season: seasonName, year, formatted: `${seasonName} ${year}` }
    const match: any = candidates.find((r: any) => matchesSeason(r.Season, pseudo)) ?? null
    if (!match) return null
    const sem = Semester.fromPersistence(match)
    ;(sem as any).classCount = match._count?.Class ?? 0
    ;(sem as any).subjectCount = match._count?.SemesterSubject ?? 0
    return sem
  }

  async findBySeason(season: string): Promise<Semester[]> {
    const all = await this.prisma.semester.findMany({
      include: {
        _count: {
          select: {
            Class: true,
            SemesterSubject: true
          }
        }
      }
    })
    const yearMatch = season.match(/\b(20\d{2})\b/)
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 0
    const seasonName = season.replace(/[^a-zA-Z]/g, '').trim() || season
    const pseudo: DetectedSeason = { season: seasonName, year, formatted: `${seasonName} ${year}` }
    const raw = all.filter((r: any) => matchesSeason(r.Season, pseudo))
    return raw.map((r: any) => {
      const sem = Semester.fromPersistence(r)
      ;(sem as any).classCount = r._count?.Class ?? 0
      ;(sem as any).subjectCount = r._count?.SemesterSubject ?? 0
      return sem
    })
  }

  async findAll(activeOnly?: boolean): Promise<Semester[]> {
    const raw = await this.prisma.semester.findMany({
      where: activeOnly ? { IsActive: true } : {},
      orderBy: [{ Season: 'asc' }, { Code: 'asc' }],
      include: {
        _count: {
          select: {
            Class: true,
            SemesterSubject: true
          }
        }
      }
    })
    return raw.map((r: any) => {
      const sem = Semester.fromPersistence(r)
        ; (sem as any).classCount = r._count?.Class ?? 0
        ; (sem as any).subjectCount = r._count?.SemesterSubject ?? 0
      return sem
    })
  }

  async create(semester: Semester): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      // 1. Create the semester
      await tx.semester.create({
        data: {
          Id: semester.id,
          Code: semester.code,
          Season: semester.season,
          IsActive: semester.isActive,
          StartDate: semester.startDate,
          EndDate: semester.endDate
        }
      })

      // 2. Auto-assign subjects based on semester code (e.g., "Kỳ 1" -> matches subject.Semester == 1)
      const match = semester.code.match(/\d+/)
      const semesterNumber = match ? parseInt(match[0], 10) : null

      if (semesterNumber !== null) {
        const matchingSubjects = await tx.subject.findMany({
          where: { Semester: semesterNumber },
          select: { Id: true }
        })

        if (matchingSubjects.length > 0) {
          const semesterSubjectsData = matchingSubjects.map((sub: any) => ({
            SemesterId: semester.id,
            SubjectId: sub.Id
          }))

          await tx.semesterSubject.createMany({
            data: semesterSubjectsData,
            skipDuplicates: true
          })
        }
      }
    })
  }

  async createSeason(season: string, startDate?: Date, endDate?: Date): Promise<Semester[]> {
    return await this.prisma.$transaction(async (tx: any) => {
      // 1. Deactivate existing seasons so the newly created season is the primary active one
      await tx.semester.updateMany({
        where: { Season: { not: season } },
        data: { IsActive: false }
      })

      const createdSemesters: Semester[] = []

      for (let i = 1; i <= 9; i++) {
        const id = randomUUID()
        const code = `Kỳ ${i}`

        // Create semester with IsActive = true
        await tx.semester.create({
          data: {
            Id: id,
            Code: code,
            Season: season,
            IsActive: true,
            StartDate: startDate ?? null,
            EndDate: endDate ?? null
          }
        })

        // Auto-assign subjects where Subject.Semester == i
        const matchingSubjects = await tx.subject.findMany({
          where: { Semester: i },
          select: { Id: true }
        })

        if (matchingSubjects.length > 0) {
          // Check existing to avoid duplicates
          const existingLinks = await tx.semesterSubject.findMany({
            where: { SemesterId: id, SubjectId: { in: matchingSubjects.map((s: any) => s.Id) } },
            select: { SubjectId: true }
          })
          const existingSubjectIds = new Set(existingLinks.map((l: any) => l.SubjectId))

          const newLinks = matchingSubjects
            .filter((sub: any) => !existingSubjectIds.has(sub.Id))
            .map((sub: any) => ({ SemesterId: id, SubjectId: sub.Id }))

          if (newLinks.length > 0) {
            await tx.semesterSubject.createMany({ data: newLinks })
          }
        }

        createdSemesters.push(Semester.create(id, code, true, startDate, endDate, season))
      }

      return createdSemesters
    })
  }

  async setActiveSeason(season: string): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      // Deactivate all
      await tx.semester.updateMany({
        data: { IsActive: false }
      })
      // Activate matching season
      await tx.semester.updateMany({
        where: { Season: season },
        data: { IsActive: true }
      })
    })
  }

  async update(semester: Semester): Promise<void> {
    await this.prisma.semester.update({
      where: { Id: semester.id },
      data: {
        Code: semester.code,
        Season: semester.season,
        IsActive: semester.isActive,
        StartDate: semester.startDate,
        EndDate: semester.endDate
      }
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      // Find all classes in this semester
      const classes = await tx.class.findMany({ where: { SemesterId: id }, select: { Id: true } })
      const classIds = classes.map((c: any) => c.Id)

      if (classIds.length > 0) {
        const submissions = await tx.submission.findMany({ where: { ClassId: { in: classIds } }, select: { Id: true } })
        const submissionIds = submissions.map((s: any) => s.Id)
        if (submissionIds.length > 0) {
          await tx.submissionArtifact.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.executionResult.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.aiUsageLog.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.gradingSession.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.submission.deleteMany({ where: { Id: { in: submissionIds } } })
        }

        await tx.class.deleteMany({ where: { SemesterId: id } })
      }

      // Delete semester-subject associations (handled by cascade, but explicit for safety)
      await tx.semesterSubject.deleteMany({ where: { SemesterId: id } })

      await tx.semester.delete({ where: { Id: id } })
    })
  }

  async deleteBySeason(season: string): Promise<void> {
    const semesters = await this.findBySeason(season)
    for (const sem of semesters) {
      await this.delete(sem.id)
    }
  }

  async getSubjects(semesterId: string): Promise<any[]> {
    const records = await this.prisma.semesterSubject.findMany({
      where: { SemesterId: semesterId },
      include: { Subject: true },
      orderBy: { AssignedAt: 'desc' }
    })
    return records.map((r: any) => ({
      id: r.Subject.Id,
      code: r.Subject.SubjectCode,
      name: r.Subject.SubjectName,
      description: r.Subject.Description,
      isActive: r.Subject.IsActive,
      semester: r.Subject.Semester
    }))
  }

  async addSubjects(semesterId: string, subjectIds: string[]): Promise<void> {
    if (subjectIds.length === 0) return

    // Check for existing links
    const existing = await this.prisma.semesterSubject.findMany({
      where: { SemesterId: semesterId, SubjectId: { in: subjectIds } },
      select: { SubjectId: true }
    })
    const existingIds = new Set(existing.map((e: any) => e.SubjectId))

    // Only create new ones
    const newData = subjectIds
      .filter(id => !existingIds.has(id))
      .map(id => ({ SemesterId: semesterId, SubjectId: id }))

    if (newData.length > 0) {
      await this.prisma.semesterSubject.createMany({ data: newData })
    }
  }

  async removeSubject(semesterId: string, subjectId: string): Promise<void> {
    await this.prisma.semesterSubject.deleteMany({
      where: { SemesterId: semesterId, SubjectId: subjectId }
    })
  }

  async getClassesBySubject(semesterId: string, subjectId: string): Promise<any[]> {
    const classes = await this.prisma.class.findMany({
      where: {
        SemesterId: semesterId,
        SubjectId: subjectId
      },
      include: {
        Subject: true,
        Semester: true,
        InstructorClass: {
          include: { User: { select: { Id: true, FullName: true, Email: true } } }
        },
        _count: {
          select: { StudentClass: true }
        }
      },
      orderBy: { ClassCode: 'asc' }
    })

    return classes.map((c: any) => ({
      id: c.Id,
      code: c.ClassCode,
      subject: c.Subject ? { id: c.Subject.Id, code: c.Subject.SubjectCode, name: c.Subject.SubjectName } : null,
      semester: c.Semester ? { id: c.Semester.Id, code: c.Semester.Code, season: c.Semester.Season } : null,
      lecturer: c.InstructorClass?.[0]?.User ? { id: c.InstructorClass[0].User.Id, name: c.InstructorClass[0].User.FullName } : null,
      studentCount: c._count?.StudentClass ?? 0,
      status: c.Status,
      note: c.Note
    }))
  }

  async manageSemesterSubjects(semesterId: string, addIds: string[], removeIds: string[]): Promise<any[]> {
    return await this.prisma.$transaction(async (tx: any) => {
      // Add subjects
      if (addIds.length > 0) {
        await tx.semesterSubject.createMany({
          data: addIds.map((subjectId: string) => ({
            SemesterId: semesterId,
            SubjectId: subjectId
          })),
          skipDuplicates: true
        })
      }

      // Remove subjects
      if (removeIds.length > 0) {
        await tx.semesterSubject.deleteMany({
          where: {
            SemesterId: semesterId,
            SubjectId: { in: removeIds }
          }
        })
      }

      // Return updated subjects list
      const records = await tx.semesterSubject.findMany({
        where: { SemesterId: semesterId },
        include: { Subject: true },
        orderBy: { AssignedAt: 'desc' }
      })

      return records.map((r: any) => ({
        id: r.Subject?.Id,
        code: r.Subject?.SubjectCode,
        name: r.Subject?.SubjectName,
        description: r.Subject?.Description,
        semester: r.Subject?.Semester,
        assignedAt: r.AssignedAt,
        isActive: r.Subject?.IsActive
      }))
    })
  }

  async listSemesterSubjects(
    semesterId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<any[]> {
    const page = options?.page ?? 1
    const pageSize = options?.pageSize ?? 10
    const skip = (page - 1) * pageSize

    const records = await this.prisma.semesterSubject.findMany({
      where: { SemesterId: semesterId },
      include: { Subject: true },
      orderBy: { AssignedAt: 'desc' },
      skip,
      take: pageSize
    })

    return records.map((r: any) => ({
      id: r.Subject?.Id,
      code: r.Subject?.SubjectCode,
      name: r.Subject?.SubjectName,
      description: r.Subject?.Description,
      semester: r.Subject?.Semester,
      assignedAt: r.AssignedAt,
      isActive: r.Subject?.IsActive
    }))
  }
}
