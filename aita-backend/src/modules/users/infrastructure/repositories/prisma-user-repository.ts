import type { IUserRepository, UserFilter, Pagination, RoleInfo, BulkDeleteResult } from '../../domain/repositories/user-repository.interface.js'
import { User } from '../../../auth/domain/entities/user.entity.js'
import { UserMapper } from '../mappers/user.mapper.js'

/**
 * Prisma-backed implementation of IUserRepository.
 * Receives a Prisma client (or transactional client) via constructor.
 * All public methods return domain entities — never raw Prisma models.
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly client: any) {}

  private get include() {
    return { UserRole: { include: { Role: true } } }
  }

  async findByEmail(email: string): Promise<User | null> {
    let raw = await this.client.user.findFirst({
      where: { Email: email },
      include: this.include,
    })
    
    if (!raw) {
      raw = await this.client.user.findFirst({
        where: { StudentCode: email },
        include: this.include,
      })
    }
    
    if (!raw) {
      raw = await this.client.user.findFirst({
        where: { LecturerCode: email },
        include: this.include,
      })
    }
    
    return raw ? UserMapper.toDomain(raw) : null
  }

  async findById(id: string): Promise<User | null> {
    const raw = await this.client.user.findUnique({
      where: { Id: id },
      include: this.include,
    })
    return raw ? UserMapper.toDomain(raw) : null
  }

  async findMany(filter?: UserFilter, pagination?: Pagination): Promise<User[]> {
    const where: any = {}
    if (filter?.role) {
      where.UserRole = { some: { Role: { RoleName: filter.role } } }
    }
    if (filter?.status) {
      where.Status = filter.status
    }
    if (filter?.search) {
      where.OR = [
        { FullName: { contains: filter.search } },
        { Email: { contains: filter.search } },
        { StudentCode: { contains: filter.search } },
        { LecturerCode: { contains: filter.search } },
      ]
    }
    if (filter?.ids) {
      where.Id = { in: filter.ids }
    }

    const raws = await this.client.user.findMany({
      where,
      skip: pagination?.skip,
      take: pagination?.take,
      include: this.include,
      orderBy: { Id: 'desc' },
    })
    return raws.map(UserMapper.toDomain)
  }

  async save(user: User): Promise<void> {
    await this.client.user.update({
      where: { Id: user.id },
      data: UserMapper.toUpdateData(user),
    })
  }

  async create(user: User): Promise<void> {
    await this.client.user.create({
      data: UserMapper.toCreateData(user),
    })
  }

  /**
   * SQL Server aborts one side of a deadlock instead of queueing it, and the
   * delete transaction below touches ~17 tables, so two deletes running at the
   * same time collide easily. Retry the whole transaction a few times before
   * giving up — P2034 is Prisma's "write conflict or deadlock" code.
   */
  private async withDeadlockRetry<T>(op: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: any
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await op()
      } catch (e: any) {
        const isDeadlock =
          e?.code === 'P2034' ||
          /write conflict|deadlock/i.test(e?.message ?? '')
        if (!isDeadlock || attempt === attempts) throw e
        lastError = e
        await new Promise(resolve => setTimeout(resolve, 100 * attempt))
      }
    }
    throw lastError
  }

  async delete(id: string): Promise<void> {
    await this.withDeadlockRetry(() =>
      this.client.$transaction(async (tx: any) => {
        // ── Step 1: Cascade-delete all submissions owned by this student ──
        // Setting StudentId to null violates the unique constraint
        // (StudentId, ExamId, ClassId, AttemptNumber) when multiple deleted
        // users shared the same exam/class/attempt combo. Deleting the
        // submissions (and their full subtree) avoids the conflict entirely.
        const studentSubmissions = await tx.submission.findMany({
          where: { StudentId: id },
          select: { Id: true },
        })
        const subIds = studentSubmissions.map((s: any) => s.Id)

        if (subIds.length > 0) {
          await this.cascadeDeleteSubmissions(tx, subIds)
        }

        // ── Step 2: Nullify optional FKs (none of these hit unique constraints) ──
        await tx.exam.updateMany({ where: { CreatedBy: id }, data: { CreatedBy: null } })
        await tx.promptTemplate.updateMany({ where: { CreatedBy: id }, data: { CreatedBy: null } })
        await tx.notification.updateMany({ where: { CreatedBy: id }, data: { CreatedBy: null } })
        await tx.gradingSession.updateMany({ where: { TriggeredBy: id }, data: { TriggeredBy: null } })
        await tx.examGenerationHistory.updateMany({ where: { GeneratedBy: id }, data: { GeneratedBy: null } })
        await tx.importBatch.updateMany({ where: { ImportedBy: id }, data: { ImportedBy: null } })
        await tx.submission.updateMany({ where: { ReviewedBy: id }, data: { ReviewedBy: null } })
        await tx.appeal.updateMany({ where: { StudentId: id }, data: { StudentId: null } })
        await tx.submissionOverride.updateMany({ where: { CreatedBy: id }, data: { CreatedBy: null } })

        // ── Step 3: Delete direct user-dependent records ──
        await tx.userRole.deleteMany({ where: { UserId: id } })
        await tx.studentClass.deleteMany({ where: { UserId: id } })
        await tx.instructorClass.deleteMany({ where: { UserId: id } })
        await tx.refreshToken.deleteMany({ where: { UserId: id } })
        await tx.oAuthIdentity.deleteMany({ where: { UserId: id } })
        await tx.auditLog.deleteMany({ where: { UserId: id } })
        await tx.aiUsageLog.deleteMany({ where: { UserId: id } })
        await tx.notificationRecipient.deleteMany({ where: { UserId: id } })

        // ── Step 4: Delete the user ──
        await tx.user.delete({ where: { Id: id } })
      })
    )
  }

  /**
   * Cascade-delete submissions and all their deeply-nested children.
   *
   * SQL Server has `onDelete: NoAction` on every FK in this subtree,
   * so we walk the dependency graph bottom-up:
   *
   *   CriterionScore / Evidence  →  RuleScore  →  ExecutionResult
   *   JobDependency  →  GradingJob  →  GradingSession
   *   BuildArtifact / SandboxExecution  →  GradingSession
   *   AiUsageLog / Appeal / SubmissionArtifact  →  Submission
   */
  private async cascadeDeleteSubmissions(tx: any, submissionIds: string[]): Promise<void> {
    // ── Grading sessions & their full subtrees ──
    const sessions = await tx.gradingSession.findMany({
      where: { SubmissionId: { in: submissionIds } },
      select: { Id: true },
    })
    const sessionIds = sessions.map((s: any) => s.Id)

    if (sessionIds.length > 0) {
      const jobs = await tx.gradingJob.findMany({
        where: { GradingSessionId: { in: sessionIds } },
        select: { Id: true },
      })
      const jobIds = jobs.map((j: any) => j.Id)

      if (jobIds.length > 0) {
        // ExecutionResults spawned by grading jobs
        const jobExecResults = await tx.executionResult.findMany({
          where: { GradingJobId: { in: jobIds } },
          select: { Id: true },
        })
        if (jobExecResults.length > 0) {
          await this.deleteRuleScoreTree(tx, jobExecResults.map((e: any) => e.Id))
        }
        await tx.executionResult.deleteMany({ where: { GradingJobId: { in: jobIds } } })

        await tx.jobDependency.deleteMany({
          where: { OR: [{ JobId: { in: jobIds } }, { DependsOnJobId: { in: jobIds } }] },
        })
        await tx.gradingJob.deleteMany({ where: { Id: { in: jobIds } } })
      }

      await tx.buildArtifact.deleteMany({ where: { GradingSessionId: { in: sessionIds } } })
      await tx.sandboxExecution.deleteMany({ where: { GradingSessionId: { in: sessionIds } } })
      await tx.gradingSession.deleteMany({ where: { Id: { in: sessionIds } } })
    }

    // ── Execution results linked directly to submissions ──
    const directExecResults = await tx.executionResult.findMany({
      where: { SubmissionId: { in: submissionIds } },
      select: { Id: true },
    })
    if (directExecResults.length > 0) {
      await this.deleteRuleScoreTree(tx, directExecResults.map((e: any) => e.Id))
      await tx.executionResult.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
    }

    // ── Direct children of submissions ──
    await tx.aiUsageLog.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
    await tx.appeal.deleteMany({ where: { SubmissionId: { in: submissionIds } } })
    await tx.submissionArtifact.deleteMany({ where: { SubmissionId: { in: submissionIds } } })

    // ── Submissions themselves ──
    await tx.submission.deleteMany({ where: { Id: { in: submissionIds } } })
  }

  /**
   * Delete RuleScore rows (and their CriterionScore / Evidence leaves)
   * that belong to the given ExecutionResult IDs.
   */
  private async deleteRuleScoreTree(tx: any, executionResultIds: string[]): Promise<void> {
    const ruleScores = await tx.ruleScore.findMany({
      where: { ExecutionResultId: { in: executionResultIds } },
      select: { Id: true },
    })
    const rsIds = ruleScores.map((r: any) => r.Id)
    if (rsIds.length > 0) {
      await tx.criterionScore.deleteMany({ where: { RuleScoreId: { in: rsIds } } })
      await tx.evidence.deleteMany({ where: { RuleScoreId: { in: rsIds } } })
      await tx.ruleScore.deleteMany({ where: { Id: { in: rsIds } } })
    }
  }

  /**
   * Deletes users one at a time, never concurrently.
   *
   * Callers used to fire N independent delete requests in parallel, which made
   * the per-user transactions deadlock against each other and left the delete
   * half-applied. Running them sequentially removes the contention entirely;
   * ids that are already gone are reported as skipped instead of failing the
   * whole batch, so a retry after a partial run is harmless.
   */
  async deleteMany(ids: string[]): Promise<BulkDeleteResult> {
    const result: BulkDeleteResult = { deleted: [], skipped: [], failed: [] }

    for (const id of ids) {
      const existing = await this.client.user.findUnique({ where: { Id: id }, select: { Id: true } })
      if (!existing) {
        result.skipped.push(id)
        continue
      }

      try {
        await this.delete(id)
        result.deleted.push(id)
      } catch (e: any) {
        result.failed.push({ id, reason: e?.message ?? 'Unknown error' })
      }
    }

    return result
  }

  async setRequirePasswordChange(userId: string, value: boolean): Promise<void> {
    await this.client.user.update({
      where: { Id: userId },
      data: { RequirePasswordChange: value },
    })
  }

  async count(filter?: UserFilter): Promise<number> {
    const where: any = {}
    if (filter?.role) {
      where.UserRole = { some: { Role: { RoleName: filter.role } } }
    }
    if (filter?.status) {
      where.Status = filter.status
    }
    return this.client.user.count({ where })
  }

  async findRoleByName(name: string): Promise<RoleInfo | null> {
    const raw = await this.client.role.findFirst({
      where: { RoleName: name },
    })
    return raw ? { id: raw.Id, name: raw.RoleName ?? '' } : null
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    await this.client.userRole.deleteMany({ where: { UserId: userId } })
    await this.client.userRole.create({
      data: { UserId: userId, RoleId: roleId },
    })
  }
}
