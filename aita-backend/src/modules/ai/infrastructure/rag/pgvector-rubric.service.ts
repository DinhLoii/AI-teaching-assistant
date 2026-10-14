import { prisma } from '../../../../database/prisma.js'
import { randomUUID } from 'crypto'
import { EmbeddingService, IEmbeddingService } from './embedding.service.js'
import type { AnalyzedRubricCriterion, RubricSourceType } from '../../domain/analysis/analysis.types.js'

export interface SaveRubricInput {
  title: string
  description?: string
  examId?: string
  subjectCode?: string
  language?: string
  category?: 'standard' | 'sql' | 'multimodule'
  sourceType: RubricSourceType | 'EXTRACTED_ORIGINAL' | 'AI_SUGGESTED' | 'TEACHER_APPROVED'
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'ARCHIVED'
  totalPoints?: number
  rawEvidence?: string
  documentHash?: string
  documentName?: string
  documentUrl?: string
  createdBy?: string
  criteria: AnalyzedRubricCriterion[]
  metadata?: Record<string, unknown>
}

export interface SimilarRubricSearchResult {
  rubricId: string
  rubricTitle: string
  rubricDescription?: string
  rubricStatus: string
  rubricSourceType: string
  rubricTotalPoints: number
  contentType: string
  content: string
  similarity: number
  itemName?: string
  itemDescription?: string
  itemMaxPoints?: number
  itemMethod?: string
  subjectCode?: string
  language?: string
}

export class PgVectorRubricService {
  constructor(private readonly embeddingService: IEmbeddingService = new EmbeddingService()) {}

  /**
   * Saves a structured Rubric and its criteria to Neon PostgreSQL,
   * then computes and stores vector embeddings in `RubricEmbedding` table via pgvector.
   */
  public async saveRubricWithEmbeddings(input: SaveRubricInput): Promise<{
    rubricId: string
    itemsCount: number
    embeddingsCount: number
  }> {
    const rubricId = randomUUID()
    const now = new Date()
    const targetStatus = input.status || (input.sourceType === 'TEACHER_APPROVED' ? 'APPROVED' : 'DRAFT')
    const totalPoints = input.totalPoints !== undefined ? input.totalPoints : 10

    // Safely check if createdBy corresponds to a valid User in DB
    let validCreatorId: string | null = null
    if (input.createdBy) {
      const u = await prisma.user.findUnique({ where: { Id: input.createdBy }, select: { Id: true } }).catch(() => null)
      if (u) validCreatorId = u.Id
    }

    // 1. Create Rubric Header
    await prisma.rubric.create({
      data: {
        Id: rubricId,
        Title: input.title,
        Description: input.description || null,
        ExamId: input.examId || null,
        SubjectCode: input.subjectCode || null,
        Language: input.language || null,
        Category: input.category || 'standard',
        SourceType: input.sourceType,
        Status: targetStatus,
        Version: 1,
        TotalPoints: totalPoints,
        RawEvidence: input.rawEvidence || null,
        DocumentHash: input.documentHash || null,
        DocumentName: input.documentName || null,
        DocumentUrl: input.documentUrl || null,
        CreatedBy: validCreatorId,
        ApprovedBy: targetStatus === 'APPROVED' ? validCreatorId : null,
        ApprovedAt: targetStatus === 'APPROVED' ? now : null,
        MetadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        CreatedAt: now,
        UpdatedAt: now,
      },
    })

    // 2. Create Rubric Items
    const itemsCreated: Array<{ id: string; name: string; description: string; criterion: AnalyzedRubricCriterion }> = []
    for (let i = 0; i < input.criteria.length; i++) {
      const c = input.criteria[i]
      const itemId = randomUUID()
      await prisma.rubricItem.create({
        data: {
          Id: itemId,
          RubricId: rubricId,
          Name: c.name || `Tiêu chí ${i + 1}`,
          Description: c.description || c.name || '',
          MaxPoints: c.maxPoints !== undefined ? Number(c.maxPoints) : 2,
          Weight: c.weight !== undefined ? Number(c.weight) : 1,
          Method: c.method || 'ai_assessment',
          PassCondition: c.passCondition || null,
          FailCondition: c.failCondition || null,
          LevelsJson: c.levels ? JSON.stringify(c.levels) : null,
          EvidenceSource: c.evidenceSource || null,
          SortOrder: i + 1,
          ReviewNeeded: c.reviewNeeded ?? false,
          CreatedAt: now,
          UpdatedAt: now,
        },
      })
      itemsCreated.push({
        id: itemId,
        name: c.name || `Tiêu chí ${i + 1}`,
        description: c.description || c.name || '',
        criterion: c,
      })
    }

    // 3. Compute Vector Embeddings & Index with pgvector
    let embeddingsCount = 0
    try {
      // Chunk A: Rubric Overview
      const overviewText = [
        `Barem Rubric: ${input.title}`,
        input.description ? `Mô tả: ${input.description}` : '',
        `Ngôn ngữ: ${input.language || 'Code'}`,
        `Môn học: ${input.subjectCode || 'General'}`,
        `Tổng điểm: ${totalPoints} điểm`,
      ].filter(Boolean).join('. ')

      const overviewVec = await this.embeddingService.generateEmbedding(overviewText)
      const overviewVecStr = `[${overviewVec.join(',')}]`

      await prisma.$executeRawUnsafe(
        `INSERT INTO "RubricEmbedding" (
          "Id", "RubricId", "RubricItemId", "ExamId", "ContentType", "Content",
          "Embedding", "ModelName", "Dimensions", "Language", "SubjectCode", "Category", "CreatedAt"
        ) VALUES ($1, $2, NULL, $3, $4, $5, $6::vector, $7, $8, $9, $10, $11, NOW())`,
        randomUUID(),
        rubricId,
        input.examId || null,
        'RUBRIC_OVERVIEW',
        overviewText,
        overviewVecStr,
        this.embeddingService.getModelName(),
        this.embeddingService.getDimensions(),
        input.language || null,
        input.subjectCode || null,
        input.category || 'standard'
      )
      embeddingsCount++

      // Chunk B: Each Criterion
      for (const item of itemsCreated) {
        const critText = [
          `Tiêu chí: ${item.name}`,
          `Mô tả: ${item.description}`,
          item.criterion.passCondition ? `Đạt: ${item.criterion.passCondition}` : '',
          item.criterion.failCondition ? `Không đạt: ${item.criterion.failCondition}` : '',
          `Điểm tối đa: ${item.criterion.maxPoints}đ`,
          `Phương thức: ${item.criterion.method || 'ai_assessment'}`,
          `Ngôn ngữ: ${input.language || 'Code'}`,
          `Môn học: ${input.subjectCode || 'General'}`,
        ].filter(Boolean).join('. ')

        const critVec = await this.embeddingService.generateEmbedding(critText)
        const critVecStr = `[${critVec.join(',')}]`

        await prisma.$executeRawUnsafe(
          `INSERT INTO "RubricEmbedding" (
            "Id", "RubricId", "RubricItemId", "ExamId", "ContentType", "Content",
            "Embedding", "ModelName", "Dimensions", "Language", "SubjectCode", "Category", "CreatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9, $10, $11, $12, NOW())`,
          randomUUID(),
          rubricId,
          item.id,
          input.examId || null,
          'CRITERION',
          critText,
          critVecStr,
          this.embeddingService.getModelName(),
          this.embeddingService.getDimensions(),
          input.language || null,
          input.subjectCode || null,
          input.category || 'standard'
        )
        embeddingsCount++
      }
    } catch (embErr) {
      console.warn('[PgVectorRubricService] Embedding indexing encountered an error, but Rubric records are safely persisted:', embErr)
    }

    return {
      rubricId,
      itemsCount: itemsCreated.length,
      embeddingsCount,
    }
  }

  /**
   * Semantic Vector Search for similar rubrics or criteria using pgvector cosine distance `<=>`.
   * Enforces security: only searches APPROVED rubrics or rubrics created by the requesting user.
   */
  public async searchSimilarRubrics(params: {
    query: string
    topK?: number
    subjectCode?: string
    language?: string
    category?: string
    requestingUserId?: string
    excludeRubricId?: string
    contentType?: 'RUBRIC_OVERVIEW' | 'CRITERION'
  }): Promise<SimilarRubricSearchResult[]> {
    const topK = params.topK || 5
    if (!params.query || !params.query.trim()) return []

    // 1. Generate Query Vector Embedding
    const queryVec = await this.embeddingService.generateEmbedding(params.query.trim())
    const queryVecStr = `[${queryVec.join(',')}]`

    // 2. Perform pgvector cosine similarity search
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT re."Id", re."RubricId", re."RubricItemId", re."ExamId", re."ContentType", re."Content",
                re."Language", re."SubjectCode", re."Category",
                1 - (re."Embedding" <=> $1::vector) AS similarity,
                r."Title" AS "RubricTitle", r."Description" AS "RubricDescription",
                r."Status" AS "RubricStatus", r."SourceType" AS "RubricSourceType",
                r."TotalPoints" AS "RubricTotalPoints",
                ri."Name" AS "ItemName", ri."Description" AS "ItemDescription",
                ri."MaxPoints" AS "ItemMaxPoints", ri."Method" AS "ItemMethod"
         FROM "RubricEmbedding" re
         JOIN "Rubric" r ON r."Id" = re."RubricId"
         LEFT JOIN "RubricItem" ri ON ri."Id" = re."RubricItemId"
         WHERE re."Embedding" IS NOT NULL
           AND (r."Status" = 'APPROVED' OR ($3::text IS NOT NULL AND r."CreatedBy" = $3::text))
           AND ($4::text IS NULL OR r."Id" != $4::text)
           AND ($5::text IS NULL OR re."ContentType" = $5::text)
           AND ($6::text IS NULL OR re."SubjectCode" = $6::text)
           AND ($7::text IS NULL OR re."Language" = $7::text)
         ORDER BY re."Embedding" <=> $1::vector ASC
         LIMIT $2`,
        queryVecStr,
        topK,
        params.requestingUserId || null,
        params.excludeRubricId || null,
        params.contentType || null,
        params.subjectCode || null,
        params.language || null
      )

      return rows.map(r => ({
        rubricId: r.RubricId,
        rubricTitle: r.RubricTitle || 'Rubric',
        rubricDescription: r.RubricDescription || undefined,
        rubricStatus: r.RubricStatus,
        rubricSourceType: r.RubricSourceType,
        rubricTotalPoints: Number(r.RubricTotalPoints || 10),
        contentType: r.ContentType,
        content: r.Content,
        similarity: Number(parseFloat(r.similarity).toFixed(4)),
        itemName: r.ItemName || undefined,
        itemDescription: r.ItemDescription || undefined,
        itemMaxPoints: r.ItemMaxPoints ? Number(r.ItemMaxPoints) : undefined,
        itemMethod: r.ItemMethod || undefined,
        subjectCode: r.SubjectCode || undefined,
        language: r.Language || undefined,
      }))
    } catch (queryErr) {
      console.warn('[PgVectorRubricService] Semantic query error:', queryErr)
      return []
    }
  }

  /**
   * Approves a rubric by Lecturer or Admin.
   */
  public async approveRubric(rubricId: string, approverId: string): Promise<boolean> {
    const existing = await prisma.rubric.findUnique({ where: { Id: rubricId } })
    if (!existing) return false

    await prisma.rubric.update({
      where: { Id: rubricId },
      data: {
        Status: 'APPROVED',
        ApprovedBy: approverId,
        ApprovedAt: new Date(),
        UpdatedAt: new Date(),
      },
    })
    return true
  }

  /**
   * Formats RAG retrieved similar rubrics into high-context markdown for the prompt generator.
   */
  public formatRagContextForPrompt(results: SimilarRubricSearchResult[]): string {
    if (!results || results.length === 0) return ''

    const lines: string[] = [
      '### THAM KHẢO TỪ CÁC RUBRIC ĐÃ ĐƯỢC PHÊ DUYỆT TƯƠNG TỰ (RAG CONTEXT):',
      'Giảng viên và hệ thống có thể tham khảo các tiêu chí chuẩn đã được phê duyệt dưới đây để xây dựng barem thích ứng:',
    ]

    const groupedByRubric: Record<string, SimilarRubricSearchResult[]> = {}
    for (const res of results) {
      if (!groupedByRubric[res.rubricTitle]) {
        groupedByRubric[res.rubricTitle] = []
      }
      groupedByRubric[res.rubricTitle].push(res)
    }

    for (const [title, items] of Object.entries(groupedByRubric)) {
      lines.push(`\n* **Bộ Rubric tham chiếu: "${title}"** (Tổng điểm: ${items[0].rubricTotalPoints}đ)`)
      for (const it of items) {
        if (it.itemName) {
          lines.push(`  - Tiêu chí: **${it.itemName}** (${it.itemMaxPoints}đ) — ${it.itemDescription || it.content} [Độ tương đồng: ${(it.similarity * 100).toFixed(1)}%]`)
        } else {
          lines.push(`  - Tổng quan: ${it.content.slice(0, 160)}... [Độ tương đồng: ${(it.similarity * 100).toFixed(1)}%]`)
        }
      }
    }

    return lines.join('\n')
  }
}
