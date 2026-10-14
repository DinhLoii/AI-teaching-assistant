import { prisma } from '../../../../database/prisma.js'
import { ForbiddenError, NotFoundError } from '../../../../shared/application/app.error.js'
import { PgVectorRubricService } from '../../infrastructure/rag/pgvector-rubric.service.js'
import type { AnalyzedRubricCriterion } from '../../domain/analysis/analysis.types.js'

export interface UpdateRubricInput {
  rubricId: string
  userId: string
  userRole: string
  title?: string
  description?: string
  totalPoints?: number
  criteria?: AnalyzedRubricCriterion[]
}

export class UpdateRubricUseCase {
  constructor(private readonly pgVectorService: PgVectorRubricService) {}

  public async execute(input: UpdateRubricInput) {
    if (input.userRole !== 'LECTURER' && input.userRole !== 'ADMIN') {
      throw new ForbiddenError('Chỉ Giảng viên hoặc Quản trị viên mới có quyền chỉnh sửa rubric.')
    }

    const existing = await prisma.rubric.findUnique({
      where: { Id: input.rubricId },
      include: { Criteria: true },
    })

    if (!existing) {
      throw new NotFoundError('Không tìm thấy Rubric cần cập nhật.')
    }

    if (existing.CreatedBy && existing.CreatedBy !== input.userId && input.userRole !== 'ADMIN') {
      throw new ForbiddenError('Bạn không thể chỉnh sửa rubric do giảng viên khác tạo.')
    }

    // Preserve original evidence
    const nextVersion = (existing.Version || 1) + 1
    const totalPoints = input.totalPoints !== undefined ? input.totalPoints : Number(existing.TotalPoints)

    const updated = await prisma.rubric.update({
      where: { Id: input.rubricId },
      data: {
        Title: input.title || existing.Title,
        Description: input.description !== undefined ? input.description : existing.Description,
        TotalPoints: totalPoints,
        Version: nextVersion,
        SourceType: 'TEACHER_APPROVED',
        Status: 'PENDING_REVIEW', // Reset to pending review upon teacher edit until approved
        UpdatedAt: new Date(),
      },
    })

    if (input.criteria && Array.isArray(input.criteria) && input.criteria.length > 0) {
      // Re-create items safely
      await prisma.rubricItem.deleteMany({ where: { RubricId: input.rubricId } })
      await prisma.$executeRawUnsafe(`DELETE FROM "RubricEmbedding" WHERE "RubricId" = $1`, input.rubricId).catch(() => {})

      // Re-index updated items and embeddings
      await this.pgVectorService.saveRubricWithEmbeddings({
        title: updated.Title,
        description: updated.Description || undefined,
        examId: updated.ExamId || undefined,
        subjectCode: updated.SubjectCode || undefined,
        language: updated.Language || undefined,
        sourceType: 'TEACHER_APPROVED',
        status: 'PENDING_REVIEW',
        totalPoints,
        rawEvidence: existing.RawEvidence || undefined,
        documentHash: existing.DocumentHash || undefined,
        createdBy: input.userId,
        criteria: input.criteria,
      })
    }

    return await prisma.rubric.findUnique({
      where: { Id: input.rubricId },
      include: { Criteria: { orderBy: { SortOrder: 'asc' } } },
    })
  }
}
