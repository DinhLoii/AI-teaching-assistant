import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'

/**
 * DeleteSeasonUseCase
 *
 * Deletes every semester belonging to a season, along with:
 *   - All classes in those semesters (via cascade or explicit delete)
 *   - All submissions/artifacts tied to those classes
 *   - All SemesterSubject links
 *
 * Everything runs inside a single transaction so the DB stays consistent
 * even if a partial failure occurs.
 */
export class DeleteSeasonUseCase implements IUseCase<string, void> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute(season: string): Promise<void> {
    const semesterRepo = this.uow.resolve<ISemesterRepository>(TOKENS.SemesterRepository)

    // 1. Find all semesters belonging to this season
    const semesters = await semesterRepo.findBySeason(season)
    if (semesters.length === 0) {
      throw new NotFoundError(`Mùa học '${season}' không tồn tại hoặc không có kỳ học nào.`)
    }

    const semesterIds = semesters.map(s => s.id)

    // 2. Resolve a raw Prisma client for bulk deletes that need to span tables
    const prisma = (this.uow as any).getClient()

    // 3. Find all class IDs in these semesters
    const classes = await prisma.class.findMany({
      where: { SemesterId: { in: semesterIds } },
      select: { Id: true },
    })
    const classIds = classes.map((c: { Id: string }) => c.Id)

    // 4. Execute everything atomically
    await prisma.$transaction(async (tx: any) => {
      // 4a. Delete submission-related child rows first (FK constraints)
      if (classIds.length > 0) {
        const submissions = await tx.submission.findMany({
          where: { ClassId: { in: classIds } },
          select: { Id: true },
        })
        const submissionIds = submissions.map((s: { Id: string }) => s.Id)

        if (submissionIds.length > 0) {
          await tx.submissionArtifact.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.executionResult.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.aiUsageLog.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
          await tx.appeal.deleteMany({ where: { SubmissionId: { in: submissionIds } } })

          // GradingSession has its own children
          const gradingSessions = await tx.gradingSession.findMany({
            where: { SubmissionId: { in: submissionIds } },
            select: { Id: true },
          })
          const gradingSessionIds = gradingSessions.map((g: { Id: string }) => g.Id)
          if (gradingSessionIds.length > 0) {
            await tx.buildArtifact.deleteMany({ where: { GradingSessionId: { in: gradingSessionIds } } })
            await tx.sandboxExecution.deleteMany({ where: { GradingSessionId: { in: gradingSessionIds } } })
            await tx.gradingJob.deleteMany({ where: { GradingSessionId: { in: gradingSessionIds } } })
            await tx.gradingSession.deleteMany({ where: { Id: { in: gradingSessionIds } } })
          }

          await tx.submission.deleteMany({ where: { Id: { in: submissionIds } } })
        }

        // 4b. Delete class membership tables
        await tx.studentClass.deleteMany({ where: { ClassId: { in: classIds } } })
        await tx.instructorClass.deleteMany({ where: { ClassId: { in: classIds } } })
        await tx.examClass.deleteMany({ where: { ClassId: { in: classIds } } })

        // 4c. Delete classes themselves
        await tx.class.deleteMany({ where: { SemesterId: { in: semesterIds } } })
      }

      // 4d. Delete semester-subject links
      await tx.semesterSubject.deleteMany({ where: { SemesterId: { in: semesterIds } } })

      // 4e. Delete semesters
      await tx.semester.deleteMany({ where: { Id: { in: semesterIds } } })
    })
  }
}
