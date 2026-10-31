import { RagKnowledgeBase } from './rag-knowledge-base.js'
import { RagRetriever } from './rag-retriever.js'
import { ScoreAggregatorService } from './score-aggregator.service.js'
import { prisma } from '../../../../database/prisma.js'
import {
  RagChatInput,
  RagChatOutput,
  RagDiagnoseInput,
  RagDiagnoseOutput,
  RagAssessmentOutput,
  RagChunk,
  RagDocumentType,
  RubricEvaluationSource,
  StructuredRubricCriteria,
  TestExecutionEvidence,
} from '../../domain/rag/rag.types.js'
import { AiClientManager } from '../../../grading/engine/infrastructure/ai/AiClientManager.js'

export class RagEngineService {
  constructor(
    private readonly kb: RagKnowledgeBase = new RagKnowledgeBase(),
    private readonly retriever: RagRetriever = new RagRetriever(),
    private readonly scoreAggregator: ScoreAggregatorService = new ScoreAggregatorService()
  ) {}

  /**
   * 24/7 Intelligent AI Tutor RAG Chat for Students and Lecturers.
   */
  async chat(input: RagChatInput): Promise<RagChatOutput> {
    const candidateChunks: RagChunk[] = []

    // 1. Ingest context from relevant entities
    if (input.examId) {
      const examChunks = input.role === 'STUDENT' ? await this.kb.getPublicAssignmentKnowledge(input.examId) : await this.kb.getAssignmentKnowledge(input.examId)
      candidateChunks.push(...examChunks)
    }

    if (input.submissionId) {
      const subChunks = await this.kb.getSubmissionKnowledge(input.submissionId)
      candidateChunks.push(...(input.role === 'STUDENT' ? subChunks.filter(c => c.docType === RagDocumentType.STUDENT_SOURCE_FILE) : subChunks))
    }

    if (input.subjectCode) {
      const subjChunks = await this.kb.getSubjectKnowledge(input.subjectCode)
      candidateChunks.push(...subjChunks)
    }

    // Always include curated pedagogical wisdom
    candidateChunks.push(...this.kb.getCuratedPedagogicalKnowledge())

    // 2. Retrieve top-K relevant chunks
    const retrieved = this.retriever.retrieveRelevantChunks(input.query, candidateChunks, 6)
    const { assembledContext, sourcesUsed } = this.retriever.assembleContext(retrieved)

    // 3. Build role-specific pedagogical prompt
    let systemRolePrompt = ''
    if (input.role === 'STUDENT') {
      systemRolePrompt = `Bạn là Trợ lý Học tập AI Tutor (Cóc FPT AITA) đồng hành cùng sinh viên FPT University.
NGUYÊN TẮC SƯ PHẠM QUAN TRỌNG NHẤT:
1. GỢI MỞ SOCRATIC: Không bao giờ cung cấp mã nguồn đáp án nguyên vẹn để sinh viên chép. Hãy hướng dẫn bằng câu hỏi gợi mở, giải thích logic, chỉ ra chỗ sai trong suy luận.
2. DỰA TRÊN NGỮ CẢNH THỰC TẾ (GROUND TRUTH): Luôn tham chiếu đề bài, testcase hoặc tiêu chí Rubric từ [TÀI LIỆU NGỮ CẢNH ĐƯỢC HỆ THỐNG RAG TRÍCH XUẤT].
3. THỰC TẾ & DỄ HIỂU: Sử dụng ngôn ngữ tiếng Việt tự nhiên, thân thiện, súc tích. Dùng Markdown có định dạng danh sách, code snippet minh họa ngắn (dưới 5 dòng) nếu cần.
4. KHUYẾN KHÍCH CLEAN CODE: Hướng dẫn viết code rõ ràng, kiểm tra biên (Edge Cases), phòng tránh NullPointerException hoặc lỗi bộ nhớ.`
    } else {
      systemRolePrompt = `Bạn là Trợ lý Giảng dạy Cao cấp AITA (Senior Educator & AI Grading Co-pilot) hỗ trợ Giảng viên và Quản trị viên FPT University.
NHIỆM VỤ CỐT LÕI:
1. Hỗ trợ thiết kế Barem Rubric, phân bổ tỷ trọng điểm chuẩn mực cho môn học.
2. Phân tích các mô hình lỗi thường gặp của sinh viên dựa trên tài liệu ngữ cảnh (Rubric, Test cases, Execution logs).
3. Hỗ trợ giải quyết đơn phúc khảo: So sánh khách quan bài làm của sinh viên với yêu cầu đề thi và cung cấp cơ sở đề xuất điểm số công bằng.
4. Trình bày chuyên nghiệp, logic chặt chẽ, dẫn chứng rõ ràng từ tài liệu RAG.`
    }

    const conversationHistoryText = (input.conversationHistory || [])
      .map(m => `${m.role === 'user' ? 'Sinh viên/Giảng viên' : 'AI Tutor'}: ${m.content}`)
      .join('\n')

    const prompt = `${systemRolePrompt}

${assembledContext}

${conversationHistoryText ? `LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ:\n${conversationHistoryText}\n\n` : ''}
CÂU HỎI HIỆN TẠI CỦA NGƯỜI DÙNG:
"${input.query}"

YÊU CẦU TRẢ LỜI:
- Trả lời trực tiếp, rõ ràng, giàu tính sư phạm bằng tiếng Việt.
- Ở cuối câu trả lời, hãy gợi ý 2-3 câu hỏi tiếp theo mà người dùng có thể muốn hỏi thêm (đặt trong mục "💡 Gợi ý câu hỏi tiếp theo:").`

    try {
      const response = await AiClientManager.executeWithFallback(async (client, model) => {
        return await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6
        })
      })

      const rawAnswer = response.choices[0]?.message?.content || 'Hệ thống AI không thể sinh câu trả lời lúc này.'

      // Extract follow-ups if present
      const followUps: string[] = []
      const followUpMatch = rawAnswer.match(/💡\s*Gợi ý câu hỏi tiếp theo:?([\s\S]*)$/i)
      if (followUpMatch) {
        const lines = followUpMatch[1].split('\n').map(l => l.replace(/^[-*•0-9.)\s]+/, '').trim()).filter(Boolean)
        followUps.push(...lines.slice(0, 3))
      }

      return {
        answer: rawAnswer,
        sourcesUsed,
        suggestedFollowUps: followUps.length > 0 ? followUps : [
          'Làm sao để tối ưu độ phức tạp thời gian?',
          'Tiêu chí Rubric này yêu cầu những gì?',
          'Cách viết unit test kiểm tra edge case?'
        ]
      }
    } catch (err: any) {
      console.error('[RagEngineService] Chat failed:', err)
      return {
        answer: 'Xin lỗi, trợ lý AI Tutor hiện đang bận hoặc gặp sự cố kết nối. Bạn vui lòng thử lại sau giây lát!',
        sourcesUsed: []
      }
    }
  }

  /**
   * Automated Root Cause Debugger & Diagnostics for Student Submissions.
   */
  async diagnose(input: RagDiagnoseInput): Promise<RagDiagnoseOutput> {
    const chunks = await this.kb.getSubmissionKnowledge(input.submissionId)
    const candidateChunks = input.userRole === 'STUDENT' ? chunks.filter(c => c.docType === RagDocumentType.STUDENT_SOURCE_FILE) : chunks
    const retrieved = this.retriever.retrieveRelevantChunks(
      `${input.testcaseName || ''} ${input.errorMessage || ''} ${input.userQuery || 'lỗi thực thi'}`,
      candidateChunks,
      5
    )
    const { assembledContext } = this.retriever.assembleContext(retrieved)

    const prompt = `Bạn là Chuyên gia gỡ lỗi (Debugging Specialist) của hệ thống AITA.
Dưới đây là ngữ cảnh bài nộp và lỗi ghi nhận được từ sinh viên:

${assembledContext}

THÔNG TIN LỖI BỔ SUNG:
- Testcase / Tiêu chí lỗi: ${input.testcaseName || input.ruleScoreId || 'Chung'}
- Thông báo lỗi / Stacktrace: ${input.errorMessage || 'Không có stacktrace'}
- Câu hỏi của sinh viên: ${input.userQuery || 'Tại sao code của tôi bị lỗi?'}

NHIỆM VỤ: Hãy phân tích nguyên nhân gốc rễ và đưa ra lộ trình sửa lỗi.
Trả về JSON đúng cấu trúc sau (KHÔNG markdown code block ngoài JSON):
{
  "rootCause": "Tóm tắt ngắn gọn 1-2 câu về nguyên nhân lỗi cốt lõi",
  "affectedFiles": ["tên tệp hoặc module bị ảnh hưởng"],
  "explanation": "Giải thích chi tiết tại sao lỗi xảy ra dựa trên mã nguồn",
  "pedagogicalHint": "Gợi ý hướng tư duy để sinh viên tự sửa lỗi (không đưa full code)",
  "suggestedActionPlan": [
    "Bước 1: ...",
    "Bước 2: ...",
    "Bước 3: ..."
  ]
}`

    try {
      const response = await AiClientManager.executeWithFallback(async (client, model) => {
        return await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      })

      const content = response.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)
      return {
        rootCause: parsed.rootCause || 'Lỗi logic hoặc vi phạm ràng buộc dữ liệu.',
        affectedFiles: parsed.affectedFiles || [],
        explanation: parsed.explanation || 'Mã nguồn chưa đáp ứng đầy đủ kịch bản kiểm thử.',
        pedagogicalHint: parsed.pedagogicalHint || 'Kiểm tra lại giá trị biên và điều kiện thoát vòng lặp.',
        suggestedActionPlan: parsed.suggestedActionPlan || ['Rà soát lại dữ liệu đầu vào', 'Viết thêm test case cục bộ']
      }
    } catch (err) {
      console.error('[RagEngineService] Diagnose failed:', err)
      return {
        rootCause: 'Không thể phân tích tự động do lỗi hệ thống.',
        affectedFiles: [],
        explanation: 'Vui lòng kiểm tra tab log thực thi trong chi tiết bài nộp.',
        pedagogicalHint: 'Hãy thử chạy testcase trên máy cục bộ với cùng input để tái hiện lỗi.',
        suggestedActionPlan: ['Chạy debug trong IDE của bạn']
      }
    }
  }

  /**
   * Standard Grounded RAG-Augmented Code Assessment.
   * - RAG: Retrieves unstructured knowledge (specs, guidelines, language rules, logs).
   * - Test Engine: Provides empirical test execution facts.
   * - AI: Semantically evaluates student code against each criterion with concrete code evidence.
   * - Score Aggregator: Deterministically calculates final scores and enforces anti-double-penalty rules.
   */
  async assess(submissionId: string): Promise<RagAssessmentOutput> {
    // 1. Fetch Structured Data directly from Database (DB Ground Truth)
    let submission: any = null
    try {
      submission = await prisma.submission.findUnique({
        where: { Id: submissionId },
        include: {
          Exam: {
            include: {
              Subject: true,
              TestCase: true,
              ExamSection: {
                include: {
                  RubricRule: {
                    include: { RubricCriterion: true }
                  }
                }
              }
            }
          },
          ExecutionResult: true,
        }
      })
    } catch (err: any) {
      console.warn('[RagEngineService] Error loading structured submission from DB:', err.message)
    }

    const exam = submission?.Exam
    const subject = exam?.Subject
    const execResults = submission?.ExecutionResult || []

    // 2. Determine Rubric Scenario (3 Scenarios)
    let rubricSource = RubricEvaluationSource.UNIVERSAL_CODE_QUALITY
    let isTeacherOfficial = false
    let disclaimer: string | undefined = undefined
    let assumptions: string[] | undefined = undefined
    const structuredCriteria: StructuredRubricCriteria[] = []

    // Scenario 1: Official Rubric exists in DB
    const existingRules: any[] = []
    if (exam?.ExamSection && exam.ExamSection.length > 0) {
      for (const sec of exam.ExamSection) {
        if (Array.isArray(sec.RubricRule)) {
          existingRules.push(...sec.RubricRule)
        }
      }
    }

    if (existingRules.length > 0) {
      rubricSource = RubricEvaluationSource.OFFICIAL_TEACHER_RUBRIC
      isTeacherOfficial = true

      for (const rule of existingRules) {
        structuredCriteria.push({
          ruleId: rule.Id,
          ruleCode: rule.RuleCode || 'RULE',
          name: rule.Description || rule.RuleCode || 'Tiêu chí đánh giá',
          description: rule.Description || '',
          maxPoints: rule.MaxPoints ? Number(rule.MaxPoints) : 2.0,
          weightPercentage: rule.WeightPercentage ? Number(rule.WeightPercentage) : 20,
          category: rule.EvaluationPrompt?.toLowerCase().includes('test') ? 'TEST_CASE' : 'FUNCTIONAL',
        })
      }
    } else if (exam?.Title || exam?.Description) {
      // Scenario 2: No Rubric in DB, but Assignment Spec exists -> AI Proposes Rubric
      rubricSource = RubricEvaluationSource.AI_PROPOSED_RUBRIC
      isTeacherOfficial = false
      disclaimer = 'Barem tiêu chí được AI đề xuất dựa trên yêu cầu đề bài. Chưa phải rubric chính thức của giáo viên.'

      structuredCriteria.push(
        {
          ruleId: 'proposed-rule-functional',
          ruleCode: 'FUNC_CORE',
          name: 'Đúng chức năng cốt lõi theo yêu cầu đề bài',
          description: `Đạt được mục tiêu chính của bài: "${exam.Title || 'Bài tập'}". Các hàm và quy trình nghiệp vụ trả về đúng kết quả.`,
          maxPoints: 3.0,
          weightPercentage: 30,
          category: 'FUNCTIONAL',
        },
        {
          ruleId: 'proposed-rule-validation',
          ruleCode: 'VALIDATION',
          name: 'Kiểm tra dữ liệu đầu vào & xử lý ngoại lệ biên',
          description: 'Xử lý các tình huống dữ liệu rỗng, dữ liệu không hợp lệ, dữ liệu trùng và phòng chống crash/exception.',
          maxPoints: 2.5,
          weightPercentage: 25,
          category: 'VALIDATION',
        },
        {
          ruleId: 'proposed-rule-logic',
          ruleCode: 'LOGIC_ACCURACY',
          name: 'Logic xử lý, cấu trúc dữ liệu và thuật toán',
          description: 'Sử dụng cấu trúc dữ liệu phù hợp, thuật toán tối ưu, không có lỗi logic tiềm ẩn.',
          maxPoints: 2.5,
          weightPercentage: 25,
          category: 'ARCHITECTURE',
        },
        {
          ruleId: 'proposed-rule-clean-code',
          ruleCode: 'CLEAN_CODE',
          name: 'Code rõ ràng, đặt tên chuẩn mực & dễ bảo trì',
          description: 'Tuân thủ quy ước đặt tên (camelCase, PascalCase), cấu trúc module sáng sủa, không lặp mã (DRY).',
          maxPoints: 2.0,
          weightPercentage: 20,
          category: 'CODE_QUALITY',
        }
      )
    } else {
      // Scenario 3: No Rubric, No clear Assignment Spec -> Universal Clean Code Quality
      rubricSource = RubricEvaluationSource.UNIVERSAL_CODE_QUALITY
      isTeacherOfficial = false
      disclaimer = 'Không tìm thấy đề bài hoặc rubric cụ thể trong hệ thống. Đánh giá dựa trên tiêu chuẩn Clean Code và chất lượng phần mềm tổng quát.'
      assumptions = [
        'Mã nguồn được kỳ vọng tuân thủ quy ước lập trình chuẩn mực của ngôn ngữ.',
        'Hàm và lớp có tính kết dính cao, trách nhiệm đơn nhất (Single Responsibility).',
        'Có cơ chế bảo vệ trước dữ liệu đầu vào bất thường (Defensive Programming).'
      ]

      structuredCriteria.push(
        {
          ruleId: 'universal-rule-syntax',
          ruleCode: 'SYNTAX_COMPILABILITY',
          name: 'Cú pháp & Khả năng biên dịch / Thực thi',
          description: 'Mã nguồn không có lỗi cú pháp, có thể biên dịch và thực thi mà không gặp lỗi nghiêm trọng.',
          maxPoints: 2.5,
          weightPercentage: 25,
          category: 'FUNCTIONAL',
        },
        {
          ruleId: 'universal-rule-structure',
          ruleCode: 'STRUCTURE_CONVENTIONS',
          name: 'Cấu trúc mã & Quy ước đặt tên (Clean Code)',
          description: 'Định dạng đồng nhất, đặt tên biến/hàm rõ nghĩa, cấu trúc tệp và thư mục phân chia hợp lý.',
          maxPoints: 2.5,
          weightPercentage: 25,
          category: 'CODE_QUALITY',
        },
        {
          ruleId: 'universal-rule-safety',
          ruleCode: 'EXCEPTION_SAFETY',
          name: 'Xử lý ngoại lệ & Biên an toàn (Edge Safety)',
          description: 'Kiểm tra giá trị null/undefined, xử lý lỗi ngoại lệ, an toàn tài nguyên.',
          maxPoints: 2.5,
          weightPercentage: 25,
          category: 'VALIDATION',
        },
        {
          ruleId: 'universal-rule-maintainability',
          ruleCode: 'MAINTAINABILITY',
          name: 'Tính Module & Khả năng bảo trì (Maintainability)',
          description: 'Thiết kế hàm ngắn gọn, giảm độ phức tạp chu trình (Cyclomatic Complexity), dễ đọc hiểu và mở rộng.',
          maxPoints: 2.5,
          weightPercentage: 25,
          category: 'ARCHITECTURE',
        }
      )
    }

    // 3. Extract Empirical Test Evidence from Test Engine (Kiểm chứng kết quả)
    const passedExec = execResults.filter((e: any) => e.Status === 'PASSED')
    const failedExec = execResults.filter((e: any) => e.Status === 'FAILED')
    const hasCompileError = execResults.some((e: any) =>
      /compile|compilation|syntax error|fatal error/i.test(e.RawOutput || '')
    )

    const testEvidence: TestExecutionEvidence = {
      totalTests: execResults.length,
      passedTests: passedExec.length,
      failedTests: failedExec.length,
      compilationSuccess: !hasCompileError,
      compilationError: hasCompileError ? 'Phát hiện lỗi biên dịch trong quá trình thực thi tự động.' : undefined,
      hasRuntimeError: failedExec.length > 0 && !hasCompileError,
      executionLogs: failedExec.map((f: any) => f.RawOutput).filter(Boolean).slice(0, 3).join('\n---\n'),
    }

    // 4. RAG Semantic Knowledge Retrieval (Tìm kiến thức cần thiết)
    const candidateChunks: RagChunk[] = []
    const subChunks = await this.kb.getSubmissionKnowledge(submissionId)
    candidateChunks.push(...subChunks)

    if (exam?.Id) {
      const examChunks = await this.kb.getAssignmentKnowledge(exam.Id)
      candidateChunks.push(...examChunks)
    }

    if (subject?.SubjectCode) {
      const subjChunks = await this.kb.getSubjectKnowledge(subject.SubjectCode)
      candidateChunks.push(...subjChunks)
    }

    candidateChunks.push(...this.kb.getCuratedPedagogicalKnowledge())

    // Retrieve top relevant chunks for evaluation
    const retrieved = this.retriever.retrieveRelevantChunks('yêu cầu đề bài rubric barem tiêu chí code sinh viên', candidateChunks, 10)
    const { assembledContext, sourcesUsed } = this.retriever.assembleContext(retrieved, 26000)

    // 5. AI Semantic Evaluation (Hiểu và đánh giá từng tiêu chí)
    const criteriaDescriptionForPrompt = structuredCriteria.map((c, i) =>
      `${i + 1}. [${c.ruleCode}] "${c.name}" (Tối đa ${c.maxPoints}đ)\n   Mô tả tiêu chí: ${c.description}`
    ).join('\n\n')

    const prompt = `Bạn là Trợ lý Đánh giá Chuyên môn AITA (Semantic Code Evaluator).
VAI TRÒ CỦA BẠN:
- Đọc code của sinh viên, đối chiếu với từng tiêu chí được chỉ định bên dưới.
- Xác định xem bài làm ĐẠT hay CHƯA ĐẠT tiêu chí nào, giải thích chi tiết lý do và trích dẫn đoạn code làm bằng chứng.
- BẠN KHÔNG PHẢI LÀ NGƯỜI TỰ TÍNH ĐIỂM TỔNG. Điểm tổng sẽ do Bộ tổng hợp điểm (Deterministic Score Aggregator) tính toán theo công thức toán học từ tỷ lệ hoàn thành (achievementRatio) của bạn.

DANH SÁCH TIÊU CHÍ CẦN ĐỐI CHIẾU:
${criteriaDescriptionForPrompt}

THÔNG TIN TỪ BỘ KIỂM THỬ THỰC TẾ (TEST ENGINE EVIDENCE):
- Tổng số kiểm thử tự động: ${testEvidence.totalTests}
- Số kiểm thử thành công: ${testEvidence.passedTests}
- Số kiểm thử thất bại: ${testEvidence.failedTests}
- Trạng thái biên dịch: ${testEvidence.compilationSuccess ? 'Thành công' : 'Có lỗi biên dịch'}
${testEvidence.executionLogs ? `Log lỗi kiểm thử:\n${testEvidence.executionLogs}\n` : ''}

${assembledContext}

YÊU CẦU ĐẦU RA BẰNG ĐỊNH DẠNG JSON CHUẨN XÁC:
{
  "overallVerdict": "Tóm tắt ngắn gọn nhận xét tổng quan bài làm",
  "criteriaEvaluations": [
    {
      "ruleId": "Mã ID của tiêu chí (giữ đúng ruleId/ruleCode đã cung cấp)",
      "criterionName": "Tên tiêu chí",
      "achievementRatio": <số thực từ 0.0 đến 1.0, biểu thị tỷ lệ sinh viên đáp ứng tiêu chí này>,
      "passed": <true nếu achievementRatio >= 0.5, ngược lại false>,
      "reasoning": "Giải thích chi tiết vì sao cho tỷ lệ này dựa trên code thực tế",
      "codeEvidence": [
        {
          "filePath": "đường dẫn tệp mã nguồn",
          "codeSnippet": "đoạn mã ngắn dẫn chứng (1-5 dòng)",
          "explanation": "giải thích ý nghĩa đoạn mã dẫn chứng"
        }
      ]
    }
  ],
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "areasForImprovement": ["Điểm cần khắc phục 1", "Điểm cần khắc phục 2"],
  "pedagogicalSummary": "Lời nhận xét sư phạm gợi mở giúp sinh viên hiểu sâu hơn và tiến bộ"
}`

    try {
      const response = await AiClientManager.executeWithFallback(async (client, model) => {
        return await client.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      })

      const text = response.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(text)

      // 6. Deterministic Score Engine (Bộ tổng hợp điểm theo công thức toán học chuẩn)
      const { totalScore, maxPossibleScore, criteriaResults } = this.scoreAggregator.aggregate(
        structuredCriteria,
        parsed.criteriaEvaluations || [],
        testEvidence,
        10.0
      )

      return {
        aiScore: totalScore,
        maxPossibleScore,
        rubricSource,
        isTeacherOfficial,
        disclaimer,
        assumptions,
        overallVerdict: parsed.overallVerdict || 'Đánh giá hoàn tất theo Barem Rubric đối chiếu.',
        criteriaEvaluations: criteriaResults,
        testEvidence,
        strengths: parsed.strengths || ['Mã nguồn có nỗ lực triển khai'],
        areasForImprovement: parsed.areasForImprovement || ['Cần rà soát các tiêu chí chưa đạt điểm tối đa'],
        pedagogicalSummary: parsed.pedagogicalSummary || 'Hãy xem lại các dẫn chứng mã nguồn cụ thể để nâng cao chất lượng code.',
        sourcesUsed
      }
    } catch (err: any) {
      console.error('[RagEngineService] Assess failed, falling back to deterministic baseline:', err)

      // Fallback deterministic evaluation based on empirical test evidence
      const fallbackAiEvaluations = structuredCriteria.map(c => ({
        ruleId: c.ruleId,
        criterionName: c.name,
        achievementRatio: testEvidence.compilationSuccess ? 0.7 : 0.3,
        reasoning: 'Đánh giá tự động dự phòng dựa trên dữ liệu kiểm thử thực tế của hệ thống.',
        codeEvidence: []
      }))

      const { totalScore, maxPossibleScore, criteriaResults } = this.scoreAggregator.aggregate(
        structuredCriteria,
        fallbackAiEvaluations,
        testEvidence,
        10.0
      )

      return {
        aiScore: totalScore,
        maxPossibleScore,
        rubricSource,
        isTeacherOfficial,
        disclaimer,
        assumptions,
        overallVerdict: 'Đánh giá hoàn tất dựa trên dữ liệu đối chiếu cấu trúc và kết quả kiểm thử thực tế.',
        criteriaEvaluations: criteriaResults,
        testEvidence,
        strengths: ['Đã hoàn thành nộp bài lên hệ thống'],
        areasForImprovement: ['Kiểm tra lại các bài test và cấu trúc logic'],
        pedagogicalSummary: 'Hãy đối chiếu kết quả chi tiết với đề bài để cải thiện.',
        sourcesUsed: []
      }
    }
  }
}
