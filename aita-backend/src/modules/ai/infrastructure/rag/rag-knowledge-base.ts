import { prisma } from '../../../../database/prisma.js'
import { RagChunk, RagDocumentType } from '../../domain/rag/rag.types.js'

export class RagKnowledgeBase {
  /**
   * Ingest and chunk an Assignment / Exam from the database.
   */
  async getAssignmentKnowledge(examId: string): Promise<RagChunk[]> {
    const chunks: RagChunk[] = []

    try {
      const exam = await prisma.exam.findUnique({
        where: { Id: examId },
        include: {
          Subject: true,
          TestCase: true,
          SampleCode: true,
          ReferenceArtifact: true,
          ProjectType: true,
        }
      })

      if (!exam) return chunks

      // 1. Problem Specification Chunk
      const specContent = [
        `Môn học: ${exam.Subject?.SubjectCode || 'N/A'} - ${exam.Subject?.SubjectName || 'N/A'}`,
        `Tên bài tập/Đề thi: ${exam.Title || 'Không tên'}`,
        `Mô tả yêu cầu: ${exam.Description || 'Không có mô tả chi tiết'}`,
        `Thời gian làm bài: ${exam.Duration ? `${exam.Duration} phút` : 'Tự do'}`,
        `Tổng điểm tối đa: ${exam.TotalPoints ? Number(exam.TotalPoints) : 10}`,
        `Loại dự án: ${exam.ProjectType?.DisplayName || exam.ProjectType?.Code || exam.SubmissionFormat || 'Source code repository'}`,
        exam.AiGeneratedContent ? `Chi tiết đặc tả kỹ thuật:\n${exam.AiGeneratedContent}` : '',
      ].filter(Boolean).join('\n\n')

      chunks.push({
        id: `exam-spec-${exam.Id}`,
        docType: RagDocumentType.ASSIGNMENT_SPEC,
        title: `Đặc tả đề bài: ${exam.Title || 'Bài tập'}`,
        sourceRef: exam.Id,
        content: specContent,
        metadata: {
          examId: exam.Id,
          subjectCode: exam.Subject?.SubjectCode ?? undefined,
          importanceWeight: 5,
          tags: ['exam-spec', 'problem-statement', exam.Subject?.SubjectCode || 'general']
        }
      })

      // 2. Rubric Rules & Criteria Chunks via ExamSection
      const examSections = await prisma.examSection.findMany({
        where: { ExamId: examId },
        include: {
          RubricRule: {
            include: { RubricCriterion: true }
          }
        }
      })

      for (const section of examSections) {
        for (const rule of section.RubricRule) {
          const criteriaDetails = (rule.RubricCriterion || []).map((c: any) => 
            `- Tiêu chí con: "${c.Description || 'Tiêu chuẩn'}" (${c.MaxPoints ? Number(c.MaxPoints) : 0}đ, Loại: ${c.ValidationType || 'Auto'})`
          ).join('\n')

          const ruleContent = [
            `Mục: "${section.Title || 'Phần thi'}"`,
            `Tiêu chí đánh giá (Rule ${rule.RuleCode || ''}): "${rule.Description || 'Không có mô tả'}" (Tối đa ${rule.MaxPoints ? Number(rule.MaxPoints) : 0} điểm)`,
            rule.EvaluationPrompt ? `Hướng dẫn chấm AI: ${rule.EvaluationPrompt}` : '',
            rule.ReferenceAnswer ? `Đáp án tham chiếu: ${rule.ReferenceAnswer}` : '',
            criteriaDetails ? `Các mức độ đạt yêu cầu:\n${criteriaDetails}` : ''
          ].filter(Boolean).join('\n')

          chunks.push({
            id: `rubric-rule-${rule.Id}`,
            docType: RagDocumentType.RUBRIC_CRITERIA,
            title: `Rubric: ${rule.RuleCode || 'Tiêu chí'} - ${rule.Description?.substring(0, 40) || ''}`,
            sourceRef: rule.Id,
            content: ruleContent,
            metadata: {
              examId: exam.Id,
              importanceWeight: 4,
              tags: ['rubric', 'grading-rule', (rule.RuleCode || '').toLowerCase()]
            }
          })
        }
      }

      // 3. Test Cases Chunks
      if (exam.TestCase && exam.TestCase.length > 0) {
        const testSummary = exam.TestCase.map((tc: any, idx: number) => {
          return `Testcase #${idx + 1} [${tc.Name || 'Test'}]: Input="${tc.InputData || ''}" | Output kỳ vọng="${tc.ExpectedOutput || ''}" | Trọng số=${tc.Weight ? Number(tc.Weight) : 1}đ`
        }).join('\n')

        chunks.push({
          id: `testcases-${exam.Id}`,
          docType: RagDocumentType.TEST_SPECIFICATION,
          title: `Đặc tả kiểm thử và Test Cases (${exam.TestCase.length} cases)`,
          sourceRef: exam.Id,
          content: `Tập hợp các ca kiểm thử chuẩn được cấu hình cho bài tập:\n${testSummary}`,
          metadata: {
            examId: exam.Id,
            importanceWeight: 4,
            tags: ['test-spec', 'testcases', 'expected-output']
          }
        })
      }

      // 4. Sample Code / Reference Artifacts
      if (exam.SampleCode && exam.SampleCode.length > 0) {
        for (const sample of exam.SampleCode) {
          chunks.push({
            id: `sample-code-${sample.Id}`,
            docType: RagDocumentType.REFERENCE_SOLUTION,
            title: `Mã nguồn mẫu / Skeleton [${sample.Language || 'Code'}]`,
            sourceRef: sample.Id,
            content: `// Mẫu tham chiếu (${sample.Language || 'Source'}):\n${sample.Explanation ? `// Giải thích: ${sample.Explanation}\n` : ''}${sample.Code || ''}`,
            metadata: {
              examId: exam.Id,
              importanceWeight: 3,
              tags: ['sample-code', 'reference', (sample.Language || '').toLowerCase()]
            }
          })
        }
      }

    } catch (err) {
      console.error('[RagKnowledgeBase] Error ingesting assignment knowledge:', err)
    }

    return chunks
  }

  /**
   * Ingest and chunk a student Submission (including files, test results, ReportData).
   */
  async getSubmissionKnowledge(submissionId: string): Promise<RagChunk[]> {
    const chunks: RagChunk[] = []

    try {
      const submission = await prisma.submission.findUnique({
        where: { Id: submissionId },
        include: {
          Exam: {
            include: { Subject: true }
          },
          ExecutionResult: true,
          SubmissionArtifact: true
        }
      })

      if (!submission) return chunks

      // 1. Submission Overview & Execution Result
      const execResults = submission.ExecutionResult || []
      const failedExec = execResults.filter((e: any) => e.Status === 'FAILED')
      const passedExec = execResults.filter((e: any) => e.Status === 'PASSED')

      let execContent = `Trạng thái chấm: ${submission.GradingStatus || 'PENDING'}\n`
      execContent += `Điểm hiện tại: ${submission.FinalScore ? Number(submission.FinalScore) : (submission.TotalScore ? Number(submission.TotalScore) : 'Chưa chấm')}/10\n`
      if (execResults.length > 0) {
        execContent += `Kết quả thực thi tự động trong Sandbox: ${passedExec.length}/${execResults.length} bước thành công.\n`
      }

      if (failedExec.length > 0) {
        execContent += `\nCÁC LỖI THỰC THI GHI NHẬN ĐƯỢC:\n`
        for (const f of failedExec) {
          execContent += `[Bước ${f.ExecutionLabel || f.EngineType || 'Execution'}]: Trạng thái ${f.Status}\nLog chi tiết: ${f.RawOutput || 'Không có chi tiết'}\n`
        }
      }

      if (submission.InstructorFeedback) {
        execContent += `\nNhận xét của Giảng viên/AI trước đó: ${submission.InstructorFeedback}\n`
      }

      chunks.push({
        id: `submission-meta-${submission.Id}`,
        docType: RagDocumentType.EXECUTION_LOG,
        title: `Nhật ký thực thi bài nộp #${submission.Id.substring(0, 8)}`,
        sourceRef: submission.Id,
        content: execContent,
        metadata: {
          submissionId: submission.Id,
          examId: submission.ExamId ?? undefined,
          importanceWeight: 5,
          tags: ['submission', 'execution-log', 'error-log']
        }
      })

      // 2. Student Source Code Files from ReportData (if present)
      if (submission.ReportData) {
        try {
          const report = JSON.parse(submission.ReportData)

          // Ingest decisive code snippets from report
          const failedRules = report.failedRules || []
          const passedRules = report.passedRules || []

          for (const rule of [...failedRules, ...passedRules]) {
            const snippets = rule.evidence?.snippets || []
            for (let i = 0; i < snippets.length; i++) {
              const snip = snippets[i]
              if (snip.codeSnippet && snip.filePath) {
                chunks.push({
                  id: `snippet-${rule.ruleId || rule.id || 'rule'}-${i}`,
                  docType: RagDocumentType.STUDENT_SOURCE_FILE,
                  title: `Mã nguồn sinh viên: ${snip.filePath}`,
                  sourceRef: snip.filePath,
                  content: `// FILE: ${snip.filePath}\n${snip.codeSnippet}\n\n// Nhận định AI: ${snip.explanation || ''}`,
                  metadata: {
                    submissionId: submission.Id,
                    examId: submission.ExamId ?? undefined,
                    importanceWeight: 4,
                    tags: ['student-code', 'evidence', snip.filePath.toLowerCase()]
                  }
                })
              }
            }
          }

          // If raw files are saved in report
          if (Array.isArray(report.sourceFiles)) {
            for (const file of report.sourceFiles.slice(0, 15)) {
              if (file.content && file.relativePath) {
                chunks.push({
                  id: `source-file-${file.relativePath}`,
                  docType: RagDocumentType.STUDENT_SOURCE_FILE,
                  title: `Tệp nguồn sinh viên: ${file.relativePath}`,
                  sourceRef: file.relativePath,
                  content: `// FILE: ${file.relativePath}\n${file.content.substring(0, 3000)}`,
                  metadata: {
                    submissionId: submission.Id,
                    examId: submission.ExamId ?? undefined,
                    importanceWeight: 3,
                    tags: ['student-code', 'full-source', file.relativePath.toLowerCase()]
                  }
                })
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse error if ReportData isn't formatted JSON
        }
      }

    } catch (err) {
      console.error('[RagKnowledgeBase] Error ingesting submission knowledge:', err)
    }

    return chunks
  }

  /**
   * Ingest subject context and course competencies.
   */
  async getSubjectKnowledge(subjectCode: string): Promise<RagChunk[]> {
    const chunks: RagChunk[] = []

    try {
      const subject = await prisma.subject.findFirst({
        where: { SubjectCode: subjectCode }
      })

      if (!subject) return chunks

      const content = [
        `Môn học: ${subject.SubjectCode} - ${subject.SubjectName}`,
        `Số tín chỉ: ${subject.Credit ?? 3}`,
        `Mô tả môn học: ${subject.Description || 'Không có mô tả'}`,
        subject.SyllabusData ? `Đề cương & Chuẩn đầu ra (Syllabus):\n${subject.SyllabusData}` : ''
      ].filter(Boolean).join('\n\n')

      chunks.push({
        id: `subject-${subject.Id}`,
        docType: RagDocumentType.SYLLABUS_CONCEPT,
        title: `Đề cương môn học: ${subject.SubjectCode}`,
        sourceRef: subject.Id,
        content,
        metadata: {
          subjectCode: subject.SubjectCode ?? undefined,
          importanceWeight: 4,
          tags: ['syllabus', 'subject-guide', subject.SubjectCode?.toLowerCase() || '']
        }
      })
    } catch (err) {
      console.error('[RagKnowledgeBase] Error ingesting subject knowledge:', err)
    }

    return chunks
  }

  /**
   * Curated pedagogical best-practice knowledge base for University IT Education.
   */
  getCuratedPedagogicalKnowledge(language?: string): RagChunk[] {
    const lang = (language || '').toLowerCase()
    const curated: RagChunk[] = [
      {
        id: 'curated-clean-code',
        docType: RagDocumentType.SYLLABUS_CONCEPT,
        title: 'Quy chuẩn Clean Code & Đặt tên chuẩn mực',
        sourceRef: 'fpt-se-clean-code-guidelines',
        content: `Tiêu chuẩn Clean Code trong chấm bài lập trình:
1. Đặt tên (Naming): Tên biến, hàm, class phải phản ánh đúng ý nghĩa nghiệp vụ (Self-explanatory). Tránh đặt tên vô nghĩa như a, b, temp, x1, func1.
2. Hàm đơn nhiệm (Single Responsibility): Mỗi hàm chỉ thực hiện đúng một nhiệm vụ, độ dài khuyến nghị dưới 30 dòng.
3. Tránh lặp mã (DRY - Don't Repeat Yourself): Tái sử dụng logic qua helper functions hoặc inheritance/composition.
4. Xử lý ngoại lệ (Exception Handling): Tuyệt đối không để trống catch block ("swallowing exceptions"). Bắt đúng loại exception cụ thể.`,
        metadata: { importanceWeight: 3, tags: ['clean-code', 'best-practice'] }
      },
      {
        id: 'curated-algo-optimization',
        docType: RagDocumentType.SYLLABUS_CONCEPT,
        title: 'Độ phức tạp thuật toán (Big-O) & Cấu trúc dữ liệu',
        sourceRef: 'fpt-se-dsa-guidelines',
        content: `Nguyên tắc tối ưu thuật toán & cấu trúc dữ liệu:
1. Độ phức tạp thời gian (Time Complexity):
   - Tránh vòng lặp lồng nhau vô cớ dẫn đến O(N^2) khi N lớn (> 100,000 phần tử).
   - Tra cứu dữ liệu: Ưu tiên HashMap/HashSet O(1) thay vì duyệt mảng tuyến tính O(N).
2. Binary Search Tree / AVL / Red-Black Tree:
   - Duyệt hậu thứ tự (Post-order: Left -> Right -> Current) khi giải phóng bộ nhớ (C++/C).
   - Đảm bảo độ cao O(log N) bằng các phép quay cân bằng để tránh suy biến thành danh sách liên kết.`,
        metadata: { importanceWeight: 3, tags: ['dsa', 'algorithm', 'complexity', 'bst'] }
      },
      {
        id: 'curated-oop-solid',
        docType: RagDocumentType.SYLLABUS_CONCEPT,
        title: 'Nguyên lý Thiết kế Hướng đối tượng (SOLID)',
        sourceRef: 'fpt-se-oop-solid-guidelines',
        content: `Nguyên lý SOLID trong phát triển ứng dụng:
1. S - Single Responsibility: Mỗi class chỉ có một lý do duy nhất để thay đổi.
2. O - Open/Closed: Mở rộng tính năng bằng interface/abstract class, không sửa code cũ.
3. L - Liskov Substitution: Lớp con phải thay thế được lớp cha mà không làm hỏng tính đúng đắn.
4. I - Interface Segregation: Tách interface nhỏ chuyên biệt thay vì interface to ôm đồm.
5. D - Dependency Inversion: Module cấp cao không phụ thuộc module cấp thấp, cả hai phụ thuộc vào Abstraction (Interface / Repository pattern).`,
        metadata: { importanceWeight: 3, tags: ['oop', 'solid', 'architecture'] }
      }
    ]

    if (lang.includes('net') || lang.includes('cs') || lang.includes('prn')) {
      curated.push({
        id: 'curated-dotnet-guidelines',
        docType: RagDocumentType.SYLLABUS_CONCEPT,
        title: 'Chuẩn phát triển C# .NET & WPF / Entity Framework',
        sourceRef: 'fpt-se-prn212-guidelines',
        content: `Chuẩn lập trình C# / .NET tại FPT University:
- Kiến trúc MVVM: ViewModel không tham chiếu namespace UI (System.Windows.Controls). Sử dụng INotifyPropertyChanged và RelayCommand / ICommand.
- Entity Framework Core: Sử dụng DbContext với Dependency Injection, quản lý ConnectionString qua appsettings.json.
- Asynchronous Programming: Áp dụng async/await đúng cách cho các tác vụ I/O, tránh .Result hoặc .Wait() gây Deadlock.`,
        metadata: { importanceWeight: 4, tags: ['csharp', 'dotnet', 'wpf', 'efcore'] }
      })
    }

    if (lang.includes('java') || lang.includes('pro192') || lang.includes('csd201')) {
      curated.push({
        id: 'curated-java-guidelines',
        docType: RagDocumentType.SYLLABUS_CONCEPT,
        title: 'Chuẩn phát triển Java OOP & DSA',
        sourceRef: 'fpt-se-java-guidelines',
        content: `Chuẩn lập trình Java tại FPT University:
- Tránh NullPointerException: Kiểm tra null trước khi gọi method, dùng Optional hoặc Objects.requireNonNull.
- Bộ sưu tập Collections: Phân biệt List, Set, Map. Dùng ArrayList cho truy xuất ngẫu nhiên, LinkedList cho chèn/xóa liên tục, HashMap cho key-value.
- Ghi đè phương thức (Override): Luôn có annotation @Override khi viết lại equals(), hashCode(), toString().`,
        metadata: { importanceWeight: 4, tags: ['java', 'oop', 'collections'] }
      })
    }

    return curated
  }
}
