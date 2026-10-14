import assert from 'node:assert/strict'
import test from 'node:test'
import { RagKnowledgeBase } from '../src/modules/ai/infrastructure/rag/rag-knowledge-base.js'
import { RagRetriever } from '../src/modules/ai/infrastructure/rag/rag-retriever.js'
import { RagEngineService } from '../src/modules/ai/infrastructure/rag/rag-engine.service.js'
import { RagDocumentType, RagChunk } from '../src/modules/ai/domain/rag/rag.types.js'
import { ScoreAggregatorService } from '../src/modules/ai/infrastructure/rag/score-aggregator.service.js'

test('RAG KnowledgeBase generates curated pedagogical knowledge', () => {
  const kb = new RagKnowledgeBase()
  const generalChunks = kb.getCuratedPedagogicalKnowledge()
  assert.ok(generalChunks.length >= 3, 'Should produce at least 3 general pedagogical chunks')

  const javaChunks = kb.getCuratedPedagogicalKnowledge('java')
  assert.ok(javaChunks.some(c => c.content.includes('NullPointerException')), 'Java chunks should include NullPointerException guide')

  const dotnetChunks = kb.getCuratedPedagogicalKnowledge('csharp')
  assert.ok(dotnetChunks.some(c => c.content.includes('MVVM')), 'Dotnet chunks should include MVVM guide')
})

test('RAG Retriever ranks relevant chunks accurately based on query intent', () => {
  const retriever = new RagRetriever()

  const mockChunks: RagChunk[] = [
    {
      id: 'chunk-1',
      docType: RagDocumentType.EXECUTION_LOG,
      title: 'Crash Logs on Testcase 3',
      sourceRef: 'exec-1',
      content: 'Exception in thread main: java.lang.NullPointerException at UserService.login(UserService.java:42)',
      metadata: { importanceWeight: 5 }
    },
    {
      id: 'chunk-2',
      docType: RagDocumentType.RUBRIC_CRITERIA,
      title: 'Rubric: Clean Code & Naming Conventions',
      sourceRef: 'rubric-1',
      content: 'Barem chấm điểm Clean Code: đặt tên biến có nghĩa, không lặp mã (DRY)',
      metadata: { importanceWeight: 4 }
    },
    {
      id: 'chunk-3',
      docType: RagDocumentType.ASSIGNMENT_SPEC,
      title: 'Assignment Spec: Binary Search Tree',
      sourceRef: 'exam-1',
      content: 'Yêu cầu cài đặt cấu trúc dữ liệu Binary Search Tree AVL cân bằng với phép xoay Left-Right',
      metadata: { importanceWeight: 4 }
    }
  ]

  // Test 1: Query about error / exception
  const errorResults = retriever.retrieveRelevantChunks('Lỗi NullPointerException ở UserService', mockChunks, 2)
  assert.equal(errorResults[0].id, 'chunk-1', 'Error query should rank EXECUTION_LOG chunk first')

  // Test 2: Query about rubric / score
  const rubricResults = retriever.retrieveRelevantChunks('Làm sao để đạt điểm tối đa rubric Clean Code?', mockChunks, 2)
  assert.equal(rubricResults[0].id, 'chunk-2', 'Rubric query should rank RUBRIC_CRITERIA chunk first')

  // Test 3: Query about BST algorithm
  const algoResults = retriever.retrieveRelevantChunks('Cài đặt thuật toán Binary Search Tree AVL', mockChunks, 2)
  assert.equal(algoResults[0].id, 'chunk-3', 'BST query should rank ASSIGNMENT_SPEC chunk first')
})

test('RAG Retriever assembles structured context respecting max length', () => {
  const retriever = new RagRetriever()
  const mockChunks: RagChunk[] = [
    {
      id: 'c1',
      docType: RagDocumentType.ASSIGNMENT_SPEC,
      title: 'Spec 1',
      sourceRef: 'ref1',
      content: 'Nội dung đặc tả bài tập 1',
      metadata: { importanceWeight: 3 }
    },
    {
      id: 'c2',
      docType: RagDocumentType.RUBRIC_CRITERIA,
      title: 'Rubric 1',
      sourceRef: 'ref2',
      content: 'Barem chấm điểm 1',
      metadata: { importanceWeight: 4 }
    }
  ]

  const { assembledContext, sourcesUsed } = retriever.assembleContext(mockChunks, 1000)
  assert.ok(assembledContext.includes('TÀI LIỆU NGỮ CẢNH ĐƯỢC HỆ THỐNG RAG TRÍCH XUẤT'))
  assert.ok(assembledContext.includes('Nội dung đặc tả bài tập 1'))
  assert.ok(assembledContext.includes('Barem chấm điểm 1'))
  assert.equal(sourcesUsed.length, 2)
})

test('RAG Engine Chat returns grounded response and follow-ups', async () => {
  const ragEngine = new RagEngineService()
  const output = await ragEngine.chat({
    query: 'Làm sao để xử lý lỗi NullPointerException trong Android?',
    role: 'STUDENT'
  })

  assert.ok(output.answer.length > 20, 'Should return non-empty answer')
  assert.ok(Array.isArray(output.sourcesUsed), 'Should return sources list')
  assert.ok(Array.isArray(output.suggestedFollowUps), 'Should return suggested follow-up questions')
})

test('RAG Engine Diagnose returns structured diagnostic plan', async () => {
  const ragEngine = new RagEngineService()
  const diag = await ragEngine.diagnose({
    submissionId: 'test-sub-123',
    testcaseName: 'Testcase 4: Large Array Input',
    errorMessage: 'TimeLimitExceeded: Process exceeded 2000ms'
  })

  assert.ok(diag.rootCause, 'Should identify root cause')
  assert.ok(Array.isArray(diag.suggestedActionPlan), 'Should return action plan array')
})

test('Deterministic ScoreAggregator calculates exact scores and prevents double penalty', () => {
  const aggregator = new ScoreAggregatorService()

  const criteria = [
    {
      ruleId: 'r1',
      ruleCode: 'ADD_STUDENT',
      name: 'Đúng chức năng thêm sinh viên',
      description: 'Chức năng thêm sinh viên hoạt động đúng',
      maxPoints: 2.0,
      weightPercentage: 20,
      category: 'FUNCTIONAL'
    },
    {
      ruleId: 'r2',
      ruleCode: 'INPUT_VALIDATION',
      name: 'Kiểm tra dữ liệu đầu vào',
      description: 'Kiểm tra rỗng, trùng lặp và biên',
      maxPoints: 2.0,
      weightPercentage: 20,
      category: 'VALIDATION'
    },
    {
      ruleId: 'r3',
      ruleCode: 'SEARCH_STUDENT',
      name: 'Tìm kiếm sinh viên chính xác',
      description: 'Tìm kiếm đúng theo mã và tên',
      maxPoints: 2.0,
      weightPercentage: 20,
      category: 'FUNCTIONAL'
    },
    {
      ruleId: 'r4',
      ruleCode: 'NOT_FOUND_HANDLING',
      name: 'Xử lý trường hợp không tìm thấy',
      description: 'Trả về thông báo hoặc mã lỗi thích hợp',
      maxPoints: 2.0,
      weightPercentage: 20,
      category: 'VALIDATION'
    },
    {
      ruleId: 'r5',
      ruleCode: 'CLEAN_CODE',
      name: 'Code rõ ràng, dễ bảo trì',
      description: 'Đặt tên biến rõ ràng, tuân thủ Clean Code',
      maxPoints: 2.0,
      weightPercentage: 20,
      category: 'CODE_QUALITY'
    }
  ]

  // Sinh viên đạt thêm sinh viên (1.0), nhưng không kiểm tra dữ liệu đầu vào (0.0), tìm kiếm chính xác (1.0), xử lý không tìm thấy (1.0), code rõ ràng (1.0)
  const aiEvaluations = [
    { ruleId: 'r1', criterionName: 'Đúng chức năng thêm sinh viên', achievementRatio: 1.0, reasoning: 'Code có hàm addStudent hoạt động chuẩn' },
    { ruleId: 'r2', criterionName: 'Kiểm tra dữ liệu đầu vào', achievementRatio: 0.0, reasoning: 'Chưa có validation cho email và age' },
    { ruleId: 'r3', criterionName: 'Tìm kiếm sinh viên chính xác', achievementRatio: 1.0, reasoning: 'Tìm kiếm theo id hoạt động tốt' },
    { ruleId: 'r4', criterionName: 'Xử lý trường hợp không tìm thấy', achievementRatio: 1.0, reasoning: 'Ném NotFoundException khi không tìm thấy' },
    { ruleId: 'r5', criterionName: 'Code rõ ràng, dễ bảo trì', achievementRatio: 1.0, reasoning: 'Code sạch sẽ, format chuẩn' }
  ]

  const result = aggregator.aggregate(criteria, aiEvaluations, {
    totalTests: 5,
    passedTests: 4,
    failedTests: 1,
    compilationSuccess: true
  }, 10.0)

  // 4 tiêu chí đạt (2đ x 4 = 8đ), 1 tiêu chí 0đ -> Điểm phải chính xác là 8.0/10.0
  assert.equal(result.totalScore, 8.0, 'Score must be exactly 8.0/10.0 calculated deterministically')
  assert.equal(result.criteriaResults.length, 5, 'Must evaluate all 5 structured criteria')

  const failedRule = result.criteriaResults.find(r => r.ruleId === 'r2')
  assert.equal(failedRule?.passed, false, 'Validation rule must be marked failed')
  assert.equal(failedRule?.scoreAwarded, 0, 'Validation rule score must be 0')
})

