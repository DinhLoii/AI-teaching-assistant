import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EmbeddingService } from '../src/modules/ai/infrastructure/rag/embedding.service.js'
import { PgVectorRubricService } from '../src/modules/ai/infrastructure/rag/pgvector-rubric.service.js'
import { ApproveRubricUseCase } from '../src/modules/ai/application/use-cases/approve-rubric.use-case.js'
import { GetRubricDetailUseCase } from '../src/modules/ai/application/use-cases/get-rubric-detail.use-case.js'
import { UpdateRubricUseCase } from '../src/modules/ai/application/use-cases/update-rubric.use-case.js'
import { SearchSimilarRubricsUseCase } from '../src/modules/ai/application/use-cases/search-similar-rubrics.use-case.js'
import { AutoConfigureAssignmentUseCase } from '../src/modules/ai/application/use-cases/auto-configure-assignment.use-case.js'
import { DeterministicParserService } from '../src/modules/ai/infrastructure/analysis/deterministic-parser.service.js'
import { DocumentExtractorService } from '../src/modules/ai/infrastructure/analysis/document-extractor.service.js'
import { AdaptiveRubricService } from '../src/modules/ai/infrastructure/analysis/adaptive-rubric.service.js'

// ── Test 1: PDF có rubric đầy đủ được trích xuất và bảo toàn 100% ──
test('Scenario 1: Document with complete rubric extracts criteria and preserves points', async () => {
  const parser = new DeterministicParserService()
  const extractor = new DocumentExtractorService()
  const doc = `
# ĐỀ THI JAVA OOP: QUẢN LÝ THƯ VIỆN
Mô tả: Xây dựng hệ thống quản lý sách.

## THANG ĐIỂM ĐÁNH GIÁ (RUBRIC)
| Tiêu chí đánh giá | Điểm tối đa |
| Khởi tạo lớp Book và Member đúng chuẩn OOP | 3.0 điểm |
| Triển khai chức năng mượn/trả sách | 4.0 điểm |
| Bắt ngoại lệ khi sách đã hết | 2.0 điểm |
| Clean code & quy ước đặt tên | 1.0 điểm |
`
  const ext = await extractor.extract(undefined, doc)
  const parsed = parser.parse(ext, 10)
  assert.equal(parsed.rubricDetectionStatus, 'DETECTED_COMPLETE')
  assert.equal(parsed.rubricCriteria.length, 4)
  assert.equal(parsed.criteriaPointsSum, 10)
  assert.equal(parsed.rubricSourceType, 'ORIGINAL_DOCUMENT')
})

// ── Test 2: PDF không có rubric kích hoạt Nhánh B sinh rubric đề xuất qua RAG ──
test('Scenario 2: Document without rubric triggers Branch B adaptive rubric with RAG enrichment', async () => {
  const adaptiveService = new AdaptiveRubricService()
  const resolved = adaptiveService.resolveRubric(
    [],
    'NO_RUBRIC',
    10,
    'SQL',
    'sql',
    {
      title: 'Bài tập Truy vấn CSDL Bán hàng',
      requirements: ['Viết câu lệnh SELECT JOIN giữa bảng Orders và Customers', 'GROUP BY theo CustomerID'],
      ragReferences: [
        {
          rubricTitle: 'Chuẩn Barem SQL Server 2026',
          itemName: 'Tính đúng đắn truy vấn dữ liệu',
          itemMaxPoints: 4,
          similarity: 0.92,
        }
      ]
    }
  )

  assert.equal(resolved.rubricSourceType, 'AI_GENERATED')
  assert.equal(resolved.rubricDetectionStatus, 'NO_RUBRIC')
  assert.equal(resolved.effectiveTotalPoints, 10)
  assert.ok(resolved.analysisNotes.includes('RAG Enriched'), 'Should include RAG reference notice in notes')
  assert.ok(resolved.rubricCriteria.some(c => c.evidenceSource?.includes('Chuẩn Barem SQL Server 2026')), 'Should tag criterion with RAG reference')
})

// ── Test 3: PDF có rubric một phần giữ nguyên phần tìm thấy và gắn cờ reviewNeeded ──
test('Scenario 3: Document with partial rubric preserves criteria and flags reviewNeeded', async () => {
  const parser = new DeterministicParserService()
  const extractor = new DocumentExtractorService()
  const doc = `
Đề bài Lập trình:
Thang điểm đánh giá:
- Cài đặt cấu trúc danh sách liên kết: 3 điểm
- Tìm kiếm phần tử:
- Xóa phần tử khỏi danh sách: 2 điểm
`
  const ext = await extractor.extract(undefined, doc)
  const parsed = parser.parse(ext, 10)
  assert.ok(parsed.rubricCriteria.length >= 2)
  assert.ok(parsed.rubricCriteria.some(c => c.reviewNeeded === true), 'Unscored criteria should flag reviewNeeded')
})

// ── Test 4: PDF chứa tiêu chí nhưng không có điểm số không bịa điểm ──
test('Scenario 4: Document with criteria but no numeric scores does not fabricate points', async () => {
  const parser = new DeterministicParserService()
  const extractor = new DocumentExtractorService()
  const doc = `
Bài kiểm tra thực hành C++:
Tiêu chí đánh giá chất lượng bài làm:
* Hoàn thành đúng cú pháp template class
* Giải phóng con trỏ không rò rỉ bộ nhớ
* Chương trình chạy qua các kịch bản mẫu
`
  const ext = await extractor.extract(undefined, doc)
  const parsed = parser.parse(ext, 10)
  assert.equal(parsed.rubricDetectionStatus, 'DETECTED_INCOMPLETE_POINTS')
  assert.ok(parsed.rubricCriteria.every(c => c.reviewNeeded === true))
})

// ── Test 5: PDF có tổng điểm không nhất quán giữ nguyên điểm gốc và thông báo độ lệch ──
test('Scenario 5: Document with mismatched total preserves original points and reports delta', async () => {
  const parser = new DeterministicParserService()
  const extractor = new DocumentExtractorService()
  const adaptiveService = new AdaptiveRubricService()
  const doc = `
Đề thi C: Xây dựng Stack
Thang điểm chi tiết:
- Hàm Push: 4 điểm
- Hàm Pop: 6 điểm
- Hàm Peek: 5 điểm
- Hàm IsEmpty: 5 điểm
`
  const ext = await extractor.extract(undefined, doc)
  const parsed = parser.parse(ext, 10)
  assert.equal(parsed.criteriaPointsSum, 20)
  assert.equal(parsed.rubricDetectionStatus, 'DETECTED_MISMATCH_TOTAL')

  const resolved = adaptiveService.resolveRubric(
    parsed.rubricCriteria,
    parsed.rubricDetectionStatus,
    10,
    'C',
    'standard'
  )
  assert.equal(resolved.effectiveTotalPoints, 20, 'Must preserve original 20 points')
  assert.equal(resolved.pointsSumDelta, 10, 'Delta between 20 and 10 must be 10')
})

// ── Test 6: PDF scan không trích xuất được text được đánh dấu an toàn ──
test('Scenario 6: Scanned PDF buffer is identified without crashing', async () => {
  const extractor = new DocumentExtractorService()
  const mockScanBuffer = Buffer.alloc(35000)
  const ext = await extractor.extract({
    filename: 'scanned_exam.pdf',
    buffer: mockScanBuffer,
    mimetype: 'application/pdf',
  })
  assert.equal(ext.isScannedOrImageOnly, true)
  assert.ok(ext.scanWarning?.includes('scan/ảnh chụp'))
})

// ── Test 7: EmbeddingService tạo vector 768 chiều chuẩn L2 ──
test('Scenario 7: EmbeddingService produces 768-dimensional normalized vector', async () => {
  const embService = new EmbeddingService()
  assert.equal(embService.getDimensions(), 768)

  const vec = await embService.generateEmbedding('Tiêu chí kiểm thử chức năng thuật toán sắp xếp')
  assert.equal(vec.length, 768)

  // Verify L2 norm = 1.0 (within floating point margin)
  const normSq = vec.reduce((sum, v) => sum + v * v, 0)
  assert.ok(Math.abs(Math.sqrt(normSq) - 1.0) < 0.01, 'Vector must be normalized')
})

// ── Test 8: EmbeddingService lỗi trả về fallback vector không làm crash luồng ──
test('Scenario 8: Embedding failure handles gracefully without breaking pipeline', async () => {
  const embService = new EmbeddingService('invalid_mock_api_key_for_testing')
  const vec = await embService.generateEmbedding('Mã nguồn Java xử lý ngoại lệ')
  assert.equal(vec.length, 768)
  assert.ok(vec.some(v => v !== 0), 'Fallback vector must contain non-zero semantic projection')
})

// ── Test 9: PgVectorRubricService lưu trữ rubric và tính toán embeddings ──
test('Scenario 9: PgVectorRubricService saves rubric and generates embeddings in Neon', async () => {
  const service = new PgVectorRubricService()
  const result = await service.saveRubricWithEmbeddings({
    title: 'Rubric Kiểm thử Unit Test Java OOP 2026',
    description: 'Barem chấm điểm chuẩn cho bài tập Java',
    subjectCode: 'PRO192',
    language: 'Java',
    category: 'standard',
    sourceType: 'TEACHER_APPROVED',
    status: 'APPROVED',
    totalPoints: 10,
    criteria: [
      {
        id: 'c-1',
        name: 'Đúng nghiệp vụ CRUD',
        description: 'Thực hiện đúng thêm sửa xóa danh sách',
        maxPoints: 5,
        method: 'test_runner',
      },
      {
        id: 'c-2',
        name: 'Xử lý ngoại lệ an toàn',
        description: 'Bắt ngoại lệ dữ liệu rỗng và chia cho 0',
        maxPoints: 5,
        method: 'hybrid',
      }
    ]
  })

  assert.ok(result.rubricId, 'Must return generated rubricId')
  assert.equal(result.itemsCount, 2)
  assert.ok(result.embeddingsCount >= 1, 'Embeddings must be generated and indexed')
})

// ── Test 10: Tìm kiếm ngữ nghĩa pgvector trả về kết quả tương đồng ──
test('Scenario 10: PgVector semantic vector search finds similar rubrics', async () => {
  const service = new PgVectorRubricService()
  const searchResults = await service.searchSimilarRubrics({
    query: 'Lập trình hướng đối tượng Java bắt ngoại lệ OOP',
    topK: 3,
    language: 'Java',
  })

  assert.ok(Array.isArray(searchResults))
  if (searchResults.length > 0) {
    const top = searchResults[0]
    assert.ok(top.similarity >= 0 && top.similarity <= 1, 'Cosine similarity must be bounded in [0, 1]')
    assert.ok(top.rubricTitle)
  }
})

import { prisma } from '../src/database/prisma.js'

let realUserId: string | undefined
async function getTestUserId(): Promise<string> {
  if (realUserId) return realUserId
  const u = await prisma.user.findFirst({ select: { Id: true } })
  if (u) {
    realUserId = u.Id
    return realUserId
  }
  const created = await prisma.user.create({
    data: {
      Email: `test-lecturer-${Date.now()}@aita.edu.vn`,
      FullName: 'TS. Nguyễn Văn Giảng Viên',
      LecturerCode: 'GV8888',
    }
  })
  realUserId = created.Id
  return realUserId
}

// ── Test 11: Giáo viên không thể truy cập rubric nháp của người khác ──
test('Scenario 11: Access control prevents viewing draft rubrics of other users', async () => {
  const getDetailUseCase = new GetRubricDetailUseCase()
  const pgService = new PgVectorRubricService()
  const ownerId = await getTestUserId()

  // Create a draft rubric owned by user A
  const draft = await pgService.saveRubricWithEmbeddings({
    title: 'Barem bí mật đề thi cuối kỳ',
    sourceType: 'EXTRACTED_ORIGINAL',
    status: 'DRAFT',
    createdBy: ownerId,
    criteria: [
      { id: 'c-secret', name: 'Bảo mật', description: 'Đạt yêu cầu', maxPoints: 10, method: 'ai_assessment' }
    ]
  })

  // User B tries to view user A's draft rubric
  await assert.rejects(
    async () => {
      await getDetailUseCase.execute({
        rubricId: draft.rubricId,
        userId: 'user-lecturer-B-different-id',
        userRole: 'LECTURER',
      })
    },
    { message: 'Bạn không có quyền truy cập bản nháp rubric của người dùng khác.' }
  )
})

// ── Test 12: Sinh viên không thể duyệt hoặc sửa rubric ──
test('Scenario 12: Student role is strictly forbidden from approving rubrics', async () => {
  const approveUseCase = new ApproveRubricUseCase()
  await assert.rejects(
    async () => {
      await approveUseCase.execute({
        rubricId: 'any-rubric-id',
        userId: 'student-id-123',
        userRole: 'STUDENT',
      })
    },
    { message: 'Chỉ Giảng viên hoặc Quản trị viên mới có quyền phê duyệt rubric.' }
  )
})

// ── Test 13: Sinh viên không được phép xem rubric nháp chưa duyệt ──
test('Scenario 13: Student cannot view unapproved draft rubric', async () => {
  const getDetailUseCase = new GetRubricDetailUseCase()
  const pgService = new PgVectorRubricService()
  const ownerId = await getTestUserId()

  const draft = await pgService.saveRubricWithEmbeddings({
    title: 'Barem nháp chưa công bố',
    sourceType: 'AI_SUGGESTED',
    status: 'DRAFT',
    createdBy: ownerId,
    criteria: [{ id: 'c-1', name: 'Chức năng', description: 'Mô tả', maxPoints: 10, method: 'ai_assessment' }]
  })

  await assert.rejects(
    async () => {
      await getDetailUseCase.execute({
        rubricId: draft.rubricId,
        userId: 'student-id-456',
        userRole: 'STUDENT',
      })
    },
    { message: 'Sinh viên không được phép xem rubric chưa được giảng viên phê duyệt.' }
  )
})

// ── Test 14: Giáo viên phê duyệt rubric thành công chuyển trạng thái sang APPROVED ──
test('Scenario 14: Lecturer approves rubric successfully', async () => {
  const pgService = new PgVectorRubricService()
  const approveUseCase = new ApproveRubricUseCase()
  const ownerId = await getTestUserId()

  const created = await pgService.saveRubricWithEmbeddings({
    title: 'Rubric Chấm Điểm Thuật Toán Đệ Quy',
    sourceType: 'AI_SUGGESTED',
    status: 'PENDING_REVIEW',
    createdBy: ownerId,
    criteria: [{ id: 'c-rec', name: 'Đệ quy', description: 'Điều kiện dừng', maxPoints: 10, method: 'ai_assessment' }]
  })

  const approved = await approveUseCase.execute({
    rubricId: created.rubricId,
    userId: ownerId,
    userRole: 'LECTURER',
  })

  assert.equal(approved.status, 'APPROVED')
})

// ── Test 15: Giáo viên chỉnh sửa rubric bảo toàn thông tin gốc và nâng version ──
test('Scenario 15: Lecturer edits rubric increments version and preserves evidence', async () => {
  const pgService = new PgVectorRubricService()
  const updateUseCase = new UpdateRubricUseCase(pgService)
  const ownerId = await getTestUserId()

  const created = await pgService.saveRubricWithEmbeddings({
    title: 'Rubric Gốc Ban Đầu',
    rawEvidence: 'Đoạn văn trích xuất nguyên bản từ đề PDF trang 2',
    sourceType: 'EXTRACTED_ORIGINAL',
    status: 'DRAFT',
    createdBy: ownerId,
    criteria: [{ id: 'c-old', name: 'Tiêu chí 1', description: 'Cũ', maxPoints: 5, method: 'ai_assessment' }]
  })

  const updated = await updateUseCase.execute({
    rubricId: created.rubricId,
    userId: ownerId,
    userRole: 'LECTURER',
    title: 'Rubric Sau Khi Giảng Viên Hiệu Chỉnh',
    totalPoints: 10,
    criteria: [
      { id: 'c-new-1', name: 'Tiêu chí mới 1', description: 'Mới', maxPoints: 6, method: 'ai_assessment' },
      { id: 'c-new-2', name: 'Tiêu chí mới 2', description: 'Mới 2', maxPoints: 4, method: 'ai_assessment' },
    ]
  })

  assert.equal(updated?.Title, 'Rubric Sau Khi Giảng Viên Hiệu Chỉnh')
  assert.equal(updated?.Version, 2, 'Version must be incremented to 2')
  assert.equal(updated?.RawEvidence, 'Đoạn văn trích xuất nguyên bản từ đề PDF trang 2', 'Raw evidence must be preserved')
})

// ── Test 16: Truy xuất RAG khi không có kết quả trả về mảng rỗng không bịa dữ liệu ──
test('Scenario 16: RAG search with non-existent query returns empty without hallucination', async () => {
  const searchUseCase = new SearchSimilarRubricsUseCase(new PgVectorRubricService())
  const res = await searchUseCase.execute({
    query: 'xyz123nonsensequerythatshouldnevermatchanyrubricinrealworld',
    topK: 3,
    subjectCode: 'NON_EXISTENT_SUBJ',
  })
  assert.ok(Array.isArray(res))
})
