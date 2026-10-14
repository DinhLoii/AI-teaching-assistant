import type {
  AnalyzedRubricCriterion,
  RubricDetectionStatus,
  RubricSourceType,
} from '../../domain/analysis/analysis.types.js'

export interface RubricResolutionResult {
  rubricCriteria: AnalyzedRubricCriterion[]
  rubricSourceType: RubricSourceType
  rubricDetectionStatus: RubricDetectionStatus
  statedTotalPoints?: number
  effectiveTotalPoints: number
  pointsSumDelta: number
  analysisNotes: string
}

export class AdaptiveRubricService {
  /**
   * Resolves final rubric according to Branch A (Original) vs Branch B (Adaptive Generation)
   */
  public resolveRubric(
    extractedCriteria: AnalyzedRubricCriterion[],
    detectionStatus: RubricDetectionStatus,
    targetMaxScore: number = 10,
    language: string = 'Java',
    category: 'standard' | 'sql' | 'multimodule' = 'standard',
    problemContext: {
      title?: string
      requirements?: string[]
      constraints?: string[]
      ragReferences?: Array<{ rubricTitle: string; itemName?: string; itemDescription?: string; itemMaxPoints?: number; similarity: number }>
    } = {}
  ): RubricResolutionResult {
    // ══════════════════════════════════════════════════════════════════
    // NHÁNH A: ĐỀ BÀI ĐÃ CÓ BAREM / RUBRIC GỐC
    // ══════════════════════════════════════════════════════════════════
    if (
      detectionStatus === 'DETECTED_COMPLETE' ||
      detectionStatus === 'DETECTED_INCOMPLETE_POINTS' ||
      detectionStatus === 'DETECTED_MISMATCH_TOTAL'
    ) {
      const criteria = [...extractedCriteria]
      const sum = Number(criteria.reduce((acc, c) => acc + (c.maxPoints || 0), 0).toFixed(2))

      // If document points perfectly match targetMaxScore or stand alone
      let notes = `Đã phát hiện và giữ nguyên Barem Rubric gốc từ đề bài (${criteria.length} tiêu chí, tổng ${sum}đ). Không ghi đè bằng AI.`
      let status = detectionStatus
      let sourceType: RubricSourceType = 'ORIGINAL_DOCUMENT'

      if (detectionStatus === 'DETECTED_MISMATCH_TOTAL') {
        notes = `CẢNH BÁO: Barem gốc trong đề có tổng điểm là ${sum}đ, không khớp với thang điểm chuẩn ${targetMaxScore}đ. Hệ thống giữ nguyên các tiêu chí gốc để giảng viên xem xét và chuẩn hóa.`
      } else if (detectionStatus === 'DETECTED_INCOMPLETE_POINTS') {
        notes = `CẢNH BÁO: Đã trích xuất ${criteria.length} tiêu chí từ đề bài, nhưng một số tiêu chí chưa ghi rõ điểm thành phần. Giảng viên vui lòng nhập điểm cho các mục được đánh dấu.`
      }

      return {
        rubricCriteria: criteria,
        rubricSourceType: sourceType,
        rubricDetectionStatus: status,
        statedTotalPoints: sum,
        effectiveTotalPoints: sum,
        pointsSumDelta: Number(Math.abs(sum - targetMaxScore).toFixed(2)),
        analysisNotes: notes,
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // NHÁNH B: ĐỀ BÀI KHÔNG CÓ RUBRIC HOẶC RUBRIC KHÔNG ĐỌC ĐƯỢC (ENRICHED BY RAG)
    // ══════════════════════════════════════════════════════════════════
    const generated = this.generateAdaptiveRubric(
      targetMaxScore,
      language,
      category,
      problemContext
    )

    const hasRag = problemContext.ragReferences && problemContext.ragReferences.length > 0
    if (hasRag) {
      const topRef = problemContext.ragReferences![0]
      for (const c of generated) {
        if (!c.evidenceSource) {
          c.evidenceSource = `Tham khảo RAG: "${topRef.rubricTitle}" (tương đồng ${(topRef.similarity * 100).toFixed(0)}%)`
        }
      }
    }

    let notes = `Đề bài không có Barem Rubric gốc. Hệ thống đã tự động xây dựng Barem đề xuất ${targetMaxScore} điểm, được tùy biến riêng cho bài tập ${language} (${problemContext.title || 'Bài tập'}).`
    if (hasRag) {
      notes += ` [RAG Enriched: Đã tham chiếu ${problemContext.ragReferences!.length} tiêu chí chuẩn từ các rubric tương tự trong cơ sở dữ liệu]`
    }
    if (detectionStatus === 'UNREADABLE_RUBRIC') {
      notes = `Khu vực thang điểm trong đề không đọc được cấu trúc chi tiết. Hệ thống đã tự động đề xuất một barem chuẩn ${targetMaxScore} điểm để giảng viên tham khảo hoặc thay thế.`
    }

    return {
      rubricCriteria: generated,
      rubricSourceType: 'AI_GENERATED',
      rubricDetectionStatus: detectionStatus === 'UNREADABLE_RUBRIC' ? 'UNREADABLE_RUBRIC' : 'NO_RUBRIC',
      statedTotalPoints: undefined,
      effectiveTotalPoints: targetMaxScore,
      pointsSumDelta: 0,
      analysisNotes: notes,
    }
  }

  /**
   * Generates a tailored, adaptive rubric based on specific problem characteristics,
   * paradigm, language, and requirements.
   */
  public generateAdaptiveRubric(
    targetMaxScore: number,
    language: string,
    category: 'standard' | 'sql' | 'multimodule',
    context: {
      title?: string
      requirements?: string[]
      constraints?: string[]
    }
  ): AnalyzedRubricCriterion[] {
    const isSql = category === 'sql' || language === 'SQL'
    const isJavaOrCSharp = language === 'Java' || language === 'C#'
    const isC = language === 'C'
    const isCpp = language === 'C++'

    const titleLower = (context.title || '').toLowerCase()
    const reqStr = (context.requirements || []).join(' ').toLowerCase()
    const isDataStructure = /cây|tree|linked\s*list|danh\s*sách\s*liên\s*kết|stack|queue|ngăn\s*xếp|hàng\s*đợi|graph|đồ\s*thị|bst/i.test(titleLower + ' ' + reqStr)
    const isAlgorithm = /thuật\s*toán|sort|sắp\s*xếp|search|tìm\s*kiếm|đệ\s*quy|recursion|dp|quy\s*hoạch\s*động|greedy|tham\s*lam/i.test(titleLower + ' ' + reqStr)

    // Calculate score distribution summing exactly to targetMaxScore
    // Standard split: 40% functional tests, 30% architecture/algorithm, 20% edge cases, 10% conventions
    const ptsTest = Number((targetMaxScore * 0.4).toFixed(1))
    const ptsQuality = Number((targetMaxScore * 0.3).toFixed(1))
    const ptsEdge = Number((targetMaxScore * 0.2).toFixed(1))
    const ptsRules = Number((targetMaxScore - ptsTest - ptsQuality - ptsEdge).toFixed(1))

    if (isSql) {
      return [
        {
          id: `rc-sql-1`,
          name: 'Đúng kết quả truy vấn & Bộ dữ liệu kiểm thử',
          description: 'Câu lệnh SQL trả về đúng danh sách các cột, số lượng bản ghi và thứ tự sắp xếp theo yêu cầu đề bài.',
          maxPoints: ptsTest,
          method: 'test_runner',
          passCondition: 'Kết quả SELECT khớp 100% với dữ liệu kỳ vọng trên cơ sở dữ liệu mẫu PostgreSQL.',
          failCondition: 'Sai số dòng, thiếu cột hoặc không hiển thị đúng kết quả theo điều kiện lọc.',
          aiGuidance: 'So sánh bảng kết quả của câu lệnh truy vấn sinh viên với bảng kết quả mẫu.',
          source: 'AI_SUGGESTED',
          rationale: 'Yêu cầu cốt lõi của bài tập Cơ sở dữ liệu: tính chính xác của dữ liệu trích xuất.',
          reviewNeeded: false,
        },
        {
          id: `rc-sql-2`,
          name: 'Kỹ thuật JOIN, Mệnh đề WHERE & Gom nhóm GROUP BY / HAVING',
          description: 'Sử dụng đúng các phép nối bảng (INNER/LEFT/RIGHT JOIN), điều kiện lọc và hàm tổng hợp (SUM, COUNT, AVG).',
          maxPoints: ptsQuality,
          method: 'ai_assessment',
          passCondition: 'Cú pháp chuẩn, quan hệ khóa chính/ngoại chính xác, không dùng tích Đề-các (Cartesian product).',
          failCondition: 'JOIN sai khóa, thiếu điều kiện WHERE gây quét toàn bảng hoặc gom nhóm sai cú pháp.',
          aiGuidance: 'Đánh giá cấu trúc câu lệnh SQL, cách liên kết bảng và tối ưu câu truy vấn.',
          source: 'AI_SUGGESTED',
          rationale: 'Đánh giá kỹ năng thiết kế câu lệnh SQL chuẩn mực của sinh viên.',
          reviewNeeded: false,
        },
        {
          id: `rc-sql-3`,
          name: 'Xử lý giá trị NULL & Dữ liệu biên',
          description: 'Kiểm soát tốt trường hợp giá trị NULL trong bảng (dùng IS NULL / COALESCE), trường hợp bảng rỗng hoặc không có dữ liệu thỏa mãn.',
          maxPoints: ptsEdge + ptsRules,
          method: 'hybrid',
          passCondition: 'Xử lý an toàn khi gặp dữ liệu NULL hoặc bảng không có bản ghi nào khớp.',
          failCondition: 'Câu truy vấn bị lỗi hoặc tính toán sai kết quả khi gặp giá trị NULL.',
          aiGuidance: 'Kiểm tra xem câu lệnh có phòng thủ trước giá trị rỗng/NULL và logic điều kiện biên.',
          source: 'AI_SUGGESTED',
          rationale: 'Các bẫy lỗi thường gặp nhất trong các truy vấn SQL nghiệp vụ.',
          reviewNeeded: false,
        },
      ]
    }

    if (isJavaOrCSharp) {
      const paradigmDesc = isJavaOrCSharp ? 'Kiến trúc OOP, Class/Interface & Đóng gói' : 'Thiết kế hàm & Module'
      return [
        {
          id: `rc-oop-1`,
          name: 'Đúng chức năng nghiệp vụ & Test Cases',
          description: 'Chương trình thực thi chính xác toàn bộ các yêu cầu bài toán và vượt qua bộ test cases kiểm thử tự động.',
          maxPoints: ptsTest,
          method: 'test_runner',
          passCondition: 'Vượt qua 100% test cases tự động trong Docker Sandbox.',
          failCondition: 'Không in đúng kết quả mong đợi hoặc văng lỗi RuntimeException.',
          aiGuidance: 'Đối chiếu kết quả in ra stdout với dữ liệu mẫu mong đợi.',
          source: 'AI_SUGGESTED',
          rationale: 'Đảm bảo chức năng thuật toán và logic hoạt động đúng yêu cầu đề bài.',
          reviewNeeded: false,
        },
        {
          id: `rc-oop-2`,
          name: paradigmDesc,
          description: `Định nghĩa các lớp, thuộc tính và phương thức đúng phạm vi truy cập (private/public), áp dụng tính kế thừa/đa hình nếu đề bài yêu cầu.`,
          maxPoints: ptsQuality,
          method: 'ai_assessment',
          passCondition: 'Cấu trúc class rõ ràng, đóng gói thuộc tính đầy đủ qua getter/setter, tách biệt nhiệm vụ.',
          failCondition: 'Tất cả code dồn vào một file Main, vi phạm tính bao đóng hoặc biến toàn cục public bừa bãi.',
          aiGuidance: 'Phân tích thiết kế hướng đối tượng và mức độ phân tách trách nhiệm giữa các class/service.',
          source: 'AI_SUGGESTED',
          rationale: `Đề bài lập trình ${language} yêu cầu tuân thủ nguyên lý hướng đối tượng và chuẩn Clean Code.`,
          reviewNeeded: false,
        },
        {
          id: `rc-oop-3`,
          name: 'Xử lý ngoại lệ, Bẫy lỗi biên & An toàn tài nguyên',
          description: 'Kiểm soát lỗi NullPointerException, chia cho 0, đóng tài nguyên Scanner/File sau khi sử dụng.',
          maxPoints: ptsEdge,
          method: 'hybrid',
          passCondition: 'Bắt lỗi ngoại lệ cẩn thận, có kiểm tra null/giá trị biên, đóng tài nguyên an toàn.',
          failCondition: 'Chương trình bị crash khi gặp input bất thường, rò rỉ tài nguyên IO.',
          aiGuidance: 'Kiểm tra cơ chế phòng vệ dữ liệu và giải phóng tài nguyên của chương trình.',
          source: 'AI_SUGGESTED',
          rationale: 'Tránh lỗi phổ biến sinh viên hay gặp ở Java/C# khi dữ liệu đầu vào bất thường.',
          reviewNeeded: false,
        },
        {
          id: `rc-oop-4`,
          name: 'Quy ước đặt tên & Chuẩn cấu trúc nộp bài',
          description: `Đặt tên biến/hàm theo chuẩn camelCase, tên class PascalCase, đúng tệp entry ${language === 'Java' ? 'Main.java' : 'Program.cs'}.`,
          maxPoints: ptsRules,
          method: 'deterministic_rule',
          passCondition: 'Mã nguồn định dạng sạch sẽ, đúng quy ước đặt tên và cấu trúc thư mục quy định.',
          failCondition: 'Đặt tên biến tùy tiện (a, b, c1, xx), format code lộn xộn.',
          aiGuidance: 'Kiểm tra quy ước đặt tên và phong cách viết code.',
          source: 'AI_SUGGESTED',
          rationale: 'Hình thành tác phong lập trình chuyên nghiệp và dễ bảo trì.',
          reviewNeeded: false,
        },
      ]
    }

    if (isC || isCpp) {
      const pointerAspect = isDataStructure ? 'Thao tác Con trỏ, Cấu trúc dữ liệu & Giải phóng bộ nhớ' : 'Quản lý Bộ nhớ, Con trỏ & Tối ưu hàm'
      return [
        {
          id: `rc-c-1`,
          name: 'Tính đúng đắn thuật toán qua Test Cases',
          description: 'Chương trình chạy hoàn thành đúng tất cả kịch bản dữ liệu đầu vào và in ra chuẩn định dạng đầu ra.',
          maxPoints: ptsTest,
          method: 'test_runner',
          passCondition: 'Vượt qua 100% test cases tự động, không lỗi Time Limit Exceeded.',
          failCondition: 'In sai kết quả, sai định dạng khoảng trắng hoặc xuống dòng.',
          aiGuidance: 'Kiểm tra kết quả thực thi chương trình trong môi trường GCC/G++.',
          source: 'AI_SUGGESTED',
          rationale: 'Tiêu chí tiên quyết cho bài tập thuật toán C/C++.',
          reviewNeeded: false,
        },
        {
          id: `rc-c-2`,
          name: pointerAspect,
          description: `Sử dụng con trỏ an toàn, kiểm tra NULL trước khi truy xuất, giải phóng bộ nhớ động (free/delete), không gây tràn mảng (Buffer Overflow).`,
          maxPoints: ptsQuality,
          method: 'ai_assessment',
          passCondition: 'Quản lý con trỏ an toàn, không có lỗi rò rỉ bộ nhớ (Memory Leak), phân tách hàm hợp lý.',
          failCondition: 'Gặp lỗi Segmentation Fault, con trỏ treo (dangling pointer) hoặc malloc không free.',
          aiGuidance: 'Đánh giá kỹ thuật quản lý bộ nhớ và tính an toàn con trỏ trong mã nguồn C/C++.',
          source: 'AI_SUGGESTED',
          rationale: `Trọng tâm đánh giá môn học ${language}: kỹ năng quản trị bộ nhớ và an toàn hệ thống.`,
          reviewNeeded: false,
        },
        {
          id: `rc-c-3`,
          name: 'Trường hợp biên & Điều kiện dừng giải thuật',
          description: 'Xử lý tốt các trường hợp biên: mảng rỗng (kích thước 0), số âm, giá trị cực đại INT_MAX/LONG_MAX, chuỗi rỗng.',
          maxPoints: ptsEdge,
          method: 'hybrid',
          passCondition: 'Có kiểm tra điều kiện biên đầu vào, đệ quy có điều kiện dừng rõ ràng.',
          failCondition: 'Vòng lặp vô tận, tràn bộ nhớ Stack Overflow hoặc crash khi gặp giá trị 0.',
          aiGuidance: 'Kiểm tra khả năng chịu lỗi và tính bền vững của thuật toán khi gặp dữ liệu đặc biệt.',
          source: 'AI_SUGGESTED',
          rationale: 'Chống gian lận và rèn luyện tư duy lập trình chặt chẽ cho sinh viên.',
          reviewNeeded: false,
        },
        {
          id: `rc-c-4`,
          name: 'Chuẩn mã nguồn & Quy ước nộp bài',
          description: 'Tuân thủ định dạng mã nguồn, thụt lề đúng chuẩn, tệp nộp đúng quy định.',
          maxPoints: ptsRules,
          method: 'deterministic_rule',
          passCondition: 'Mã nguồn định dạng chuẩn mực, chú thích đầy đủ ở các thuật toán phức tạp.',
          failCondition: 'Mã nguồn rối rắm, lạm dụng biến toàn cục.',
          aiGuidance: 'Đánh giá phong cách code và tuân thủ quy ước nộp bài.',
          source: 'AI_SUGGESTED',
          rationale: 'Quy chuẩn coding convention trong môn học lập trình C/C++.',
          reviewNeeded: false,
        },
      ]
    }

    // Default Python & Standard generic adaptive rubric
    return [
      {
        id: `rc-py-1`,
        name: 'Đúng chức năng nghiệp vụ & Test Cases',
        description: 'Chương trình xử lý chính xác logic bài toán và vượt qua các test cases kiểm thử tự động.',
        maxPoints: ptsTest,
        method: 'test_runner',
        passCondition: 'Vượt qua 100% test cases tự động.',
        failCondition: 'In sai kết quả mong đợi hoặc văng lỗi runtime.',
        aiGuidance: 'Đối chiếu kết quả in ra màn hình với dữ liệu mẫu.',
        source: 'AI_SUGGESTED',
        rationale: 'Đảm bảo yêu cầu chức năng bài toán được giải quyết chính xác.',
        reviewNeeded: false,
      },
      {
        id: `rc-py-2`,
        name: isAlgorithm ? 'Tối ưu giải thuật & Cấu trúc dữ liệu' : 'Cấu trúc giải thuật & Tính module hóa',
        description: 'Tổ chức hàm rõ ràng, sử dụng cấu trúc dữ liệu phù hợp, mã nguồn sạch sẽ dễ bảo trì.',
        maxPoints: ptsQuality,
        method: 'ai_assessment',
        passCondition: 'Phân tách hàm độc lập, mã nguồn sạch đẹp, thuật toán tối ưu.',
        failCondition: 'Code dồn cục, lặp code nhiều lần, độ phức tạp quá cao không cần thiết.',
        aiGuidance: 'Đánh giá thiết kế giải thuật và phong cách lập trình.',
        source: 'AI_SUGGESTED',
        rationale: `Phù hợp với đặc thù ngôn ngữ ${language} và tiêu chuẩn Clean Code.`,
        reviewNeeded: false,
      },
      {
        id: `rc-py-3`,
        name: 'Xử lý dữ liệu biên & Phòng vệ ngoại lệ',
        description: 'Kiểm soát tốt dữ liệu đầu vào đặc biệt (danh sách rỗng, số 0, số âm, ký tự đặc biệt).',
        maxPoints: ptsEdge,
        method: 'hybrid',
        passCondition: 'Có kiểm tra điều kiện biên và ép kiểu dữ liệu an toàn.',
        failCondition: 'Chương trình bị crash khi gặp dữ liệu biên.',
        aiGuidance: 'Đánh giá tính phòng vệ của mã nguồn khi gặp dữ liệu bất thường.',
        source: 'AI_SUGGESTED',
        rationale: 'Bảo đảm chương trình không bị lỗi khi người dùng nhập dữ liệu biên.',
        reviewNeeded: false,
      },
      {
        id: `rc-py-4`,
        name: 'Quy chuẩn đặt tên & Định dạng mã nguồn',
        description: 'Tuân thủ quy ước đặt tên biến/hàm và định dạng mã nguồn theo tiêu chuẩn.',
        maxPoints: ptsRules,
        method: 'deterministic_rule',
        passCondition: 'Đặt tên biến có nghĩa, định dạng code chuẩn mực.',
        failCondition: 'Đặt tên biến tùy tiện, thiếu format.',
        aiGuidance: 'Kiểm tra quy ước lập trình chuẩn.',
        source: 'AI_SUGGESTED',
        rationale: 'Rèn luyện thói quen lập trình chuyên nghiệp.',
        reviewNeeded: false,
      },
    ]
  }
}
