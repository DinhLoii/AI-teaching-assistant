// @ts-nocheck
/**
 * StubAiGenerator provides realistic, high-quality mocked responses
 * for AI operations when AI_STUB_MODE is enabled or when external AI API keys
 * are not yet configured.
 */

export class StubAiGenerator {
  public static generate(systemMsg: string, userPrompt: string, responseFormat?: any): string {
    const isJsonRequested = responseFormat?.type === 'json_object' || systemMsg.includes('OUTPUT JSON') || systemMsg.includes('JSON ONLY');

    // 1. Requirement Extraction / Blueprint Parsing (JSON)
    if (
      systemMsg.includes('Extract ALL grading criteria') ||
      systemMsg.includes('ParsedBlueprint') ||
      systemMsg.includes('STEP 0 — CRITICAL RULES') ||
      systemMsg.includes('GRADING GROUPS')
    ) {
      return this.generateParsedBlueprintJson(userPrompt);
    }

    // 2. Probe Configurations (JSON)
    if (systemMsg.includes('relative URL path') || systemMsg.includes('probe')) {
      return this.generateProbeConfigsJson(userPrompt);
    }

    // 3. Overall Feedback (Markdown)
    if (systemMsg.includes('Tech Lead') || systemMsg.includes('tổng hợp Feedback') || systemMsg.includes('Feedback')) {
      return this.generateFeedbackMarkdown(userPrompt);
    }

    // 4. Assignment Content Generation (HTML) - only when JSON is not requested
    if (
      !isJsonRequested &&
      (systemMsg.includes('university professor') ||
       systemMsg.includes('designing an assignment') ||
       userPrompt.includes('Tạo một bài Assignment') ||
       userPrompt.includes('FULL-STACK') ||
       userPrompt.includes('Assignment type:'))
    ) {
      return this.generateAssignmentHtml(userPrompt);
    }

    // 5. Code Review / Assessment / Evaluation (JSON)
    if (systemMsg.includes('evaluate') || systemMsg.includes('review') || systemMsg.includes('grader') || isJsonRequested) {
      return this.generateEvaluationJson(userPrompt);
    }

    // Fallback default
    return 'Thực hiện thành công theo yêu cầu (Chế độ giả lập AI Stub Mode).';
  }

  private static generateAssignmentHtml(prompt: string): string {
    const subjectMatch = prompt.match(/Subject:\s*([A-Za-z0-9]+)/i);
    const subject = subjectMatch ? subjectMatch[1].toUpperCase() : 'PRJ301';

    return `<div class="assignment-specification">
  <h2>Assignment Specification: Full-Stack Web Application Development</h2>
  <div style="display:inline-block; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 16px;">
    Môn học: ${subject} | Thang điểm: 10.0 | Hình thức: Nộp Source Code & SQL
  </div>

  <h3>1. Mục tiêu & Tổng quan (Overview)</h3>
  <p>
    Bài tập yêu cầu sinh viên xây dựng một hệ thống Web Application hoàn chỉnh từ cơ sở dữ liệu, backend REST API đến frontend giao diện người dùng.
    Mục tiêu nhằm kiểm tra năng lực thiết kế dữ liệu chuẩn hóa, áp dụng kiến trúc phân tầng (Layered/Clean Architecture), xử lý ngoại lệ toàn cục và kiểm thử tự động (Unit Test).
  </p>

  <h3>2. Công nghệ bắt buộc (Tech Stack)</h3>
  <ul>
    <li><strong>Backend:</strong> Java 21, Spring Boot 3.x, Spring Data JPA, Hibernate, Bean Validation.</li>
    <li><strong>Database:</strong> PostgreSQL / Microsoft SQL Server (quan hệ chuẩn 3NF, ràng buộc khóa chính/ngoại).</li>
    <li><strong>Frontend:</strong> React, Axios / TanStack Query, Responsive Layout.</li>
    <li><strong>Kiểm thử:</strong> JUnit 5, Mockito.</li>
  </ul>

  <h3>3. Yêu cầu chi tiết các phần (Detailed Requirements)</h3>

  <h4>PART A – DATA ARCHITECTURE & DOMAIN MODELS (3.0 Điểm)</h4>
  <ul>
    <li>Thiết kế cơ sở dữ liệu quan hệ cho bảng <code>items</code> bao gồm: Primary Key (UUID hoặc Identity), Unique Constraint cho mã danh mục/mã hàng.</li>
    <li>Tạo các trường audit metadata: <code>created_at</code>, <code>updated_at</code> tự động cập nhật thời gian.</li>
    <li>Cài đặt cơ chế <strong>Soft Delete</strong> với trường <code>deleted</code> (boolean). Không xóa vật lý dữ liệu khỏi database.</li>
    <li>Cung cấp file SQL Schema hoàn chỉnh có thể khởi tạo trực tiếp trên hệ cơ sở dữ liệu.</li>
    <li>Implement Entity/Domain Model với đầy đủ Bean Validation annotations (<code>@NotNull</code>, <code>@NotBlank</code>, <code>@Size</code>).</li>
    <li>Cài đặt Repository layer kế thừa Spring Data JPA.</li>
  </ul>

  <h4>PART B – BUSINESS LOGIC & REST API (4.0 Điểm)</h4>
  <ul>
    <li><code>GET /api/items</code>: Hỗ trợ phân trang (Pagination), sắp xếp đa trường (Sorting), và tìm kiếm từ khóa (Keyword search).</li>
    <li><code>GET /api/items/{id}</code>: Lấy thông tin chi tiết một item theo ID. Trả về mã lỗi HTTP <code>404 Not Found</code> nếu không tồn tại.</li>
    <li><code>POST /api/items</code>: Thêm mới item với Request DTO validation. Trả về mã HTTP <code>201 Created</code> kèm dữ liệu vừa tạo.</li>
    <li><code>PUT /api/items/{id}</code>: Cập nhật thông tin item. Kiểm tra hợp lệ và trả về <code>200 OK</code> hoặc <code>404 Not Found</code>.</li>
    <li><code>DELETE /api/items/{id}</code>: Thực hiện xóa mềm (Soft Delete). Cập nhật <code>deleted = true</code> và trả về HTTP <code>204 No Content</code>.</li>
    <li>Cài đặt <strong>Global Exception Handler</strong> (<code>@ControllerAdvice</code>) để chuẩn hóa định dạng JSON phản hồi lỗi (timestamp, status, message, errors).</li>
    <li>Tách biệt nghiêm ngặt Controller / Service / Repository; tuân thủ nguyên lý SOLID.</li>
  </ul>

  <h4>PART C – TESTING & CODE QUALITY (3.0 Điểm)</h4>
  <ul>
    <li>Viết Unit Test bằng <strong>JUnit 5</strong> và <strong>Mockito</strong> kiểm thử Service layer:
      <ul>
        <li>Test tạo mới thành công và test khi dữ liệu bị trùng lặp (Duplicate Exception).</li>
        <li>Test tìm kiếm theo ID tồn tại và test trường hợp ID không tồn tại (NotFoundException).</li>
        <li>Test chức năng xóa mềm (Soft Delete).</li>
      </ul>
    </li>
    <li>Xây dựng giao diện Frontend tối thiểu bằng React kết nối với API backend để hiển thị danh sách và thêm mới dữ liệu.</li>
    <li>Tuân thủ Naming Convention chuẩn của Java và Spring Boot.</li>
    <li>Cung cấp file <code>README.md</code> hướng dẫn chi tiết cách cấu hình môi trường, chạy backend, frontend và chạy test suite.</li>
  </ul>

  <h3>4. Hướng dẫn nộp bài (Submission Guidelines)</h3>
  <p>
    Sinh viên nén toàn bộ project (bao gồm source code backend, frontend, file SQL schema và README.md) thành một file định dạng <code>.ZIP</code> và nộp lên hệ thống trước thời hạn quy định. Hệ thống sẽ tự động build, chạy test và chấm điểm tự động.
  </p>
</div>`;
  }

  private static generateParsedBlueprintJson(prompt: string): string {
    const subjectMatch = prompt.match(/Subject:\s*([A-Za-z0-9]+)/i);
    const subject = subjectMatch ? subjectMatch[1].toUpperCase() : 'PRJ301';

    const blueprint = {
      assignmentTitle: `Assignment ${subject} - Full-Stack Web Application Development`,
      projectType: 'fullstack',
      language: 'Java',
      framework: 'Spring Boot',
      description: 'Phát triển ứng dụng Web Full-Stack hoàn chỉnh với Spring Boot, PostgreSQL, React và Unit Testing.',
      totalMarks: 10,
      gradingGroups: [
        { id: 'PART_A', name: 'Part A – Data Architecture & Domain Models', points: 3 },
        { id: 'PART_B', name: 'Part B – Business Logic & REST API', points: 4 },
        { id: 'PART_C', name: 'Part C – Testing & Code Quality', points: 3 }
      ],
      requirements: [
        {
          id: 'REQ-01',
          groupId: 'PART_A',
          partLabel: 'PART A',
          title: 'Database Schema & Entity Models',
          description: 'Thiết kế cơ sở dữ liệu cho bảng items có Primary Key, Unique Constraint, created_at, updated_at và cơ chế soft-delete.',
          marks: 3,
          complexity: 'medium',
          complexityReason: 'Yêu cầu ánh xạ quan hệ đúng chuẩn, ràng buộc toàn vẹn và xử lý xóa mềm.',
          isUIVisible: false,
          isCRUD: true,
          crudOperations: ['create', 'read', 'update', 'delete'],
          recommendedEngine: 'AICodeReview'
        },
        {
          id: 'REQ-02',
          groupId: 'PART_B',
          partLabel: 'PART B',
          title: 'Business Logic & REST API Endpoints',
          description: 'Cài đặt Service và REST Controller với các endpoint: GET, POST, PUT, DELETE, hỗ trợ phân trang, sắp xếp và Global Exception Handler.',
          marks: 4,
          complexity: 'high',
          complexityReason: 'Cần phân tầng kiến trúc chặt chẽ, validation DTO đầy đủ và trả đúng mã HTTP status code.',
          isUIVisible: false,
          isCRUD: true,
          crudOperations: ['create', 'read', 'update', 'delete', 'search'],
          recommendedEngine: 'HTTPProbe'
        },
        {
          id: 'REQ-03',
          groupId: 'PART_C',
          partLabel: 'PART C',
          title: 'Unit Testing & React Frontend',
          description: 'Viết unit test với JUnit 5 và Mockito kiểm thử các luồng Service; tích hợp giao diện React tối thiểu kết nối API.',
          marks: 3,
          complexity: 'medium',
          complexityReason: 'Đảm bảo code coverage cho các case thành công và ngoại lệ; kiểm tra giao tiếp frontend-backend.',
          isUIVisible: true,
          isCRUD: false,
          recommendedEngine: 'AICodeReview'
        }
      ]
    };

    return JSON.stringify(blueprint, null, 2);
  }

  private static generateProbeConfigsJson(prompt: string): string {
    return JSON.stringify({
      'REQ-02': {
        url: '/api/items',
        method: 'GET',
        expectedStatus: 200,
        headers: { 'Accept': 'application/json' }
      }
    }, null, 2);
  }

  private static generateFeedbackMarkdown(prompt: string): string {
    const titleMatch = prompt.match(/Bài tập:\s*([^\n]+)/i);
    const assignmentTitle = titleMatch ? titleMatch[1].trim() : 'Bài tập chuyên môn';

    const scoreMatch = prompt.match(/Điểm số:\s*([\d.]+)\s*\/\s*([\d.]+)/i);
    const totalScore = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
    const maxScore = scoreMatch ? parseFloat(scoreMatch[2]) : 10;

    const passedMatch = prompt.match(/--- CÁC TIÊU CHÍ ĐÃ ĐẠT ---([\s\S]*?)--- CÁC TIÊU CHÍ CHƯA ĐẠT/i);
    const passedText = passedMatch ? passedMatch[1].trim() : '';

    const failedMatch = prompt.match(/--- CÁC TIÊU CHÍ CHƯA ĐẠT \/ BỊ LỖI ---([\s\S]*?)Hãy viết feedback/i);
    const failedText = failedMatch ? failedMatch[1].trim() : '';

    const isPass = totalScore >= maxScore * 0.5;

    // Detect subject / domain from assignmentTitle or prompt
    const isDSA = /csd|data\s*structure|algorithm|cấu\s*trúc\s*dữ\s*liệu|thuật\s*toán|linked\s*list|danh\s*sách\s*liên\s*kết|student/i.test(assignmentTitle + ' ' + prompt);
    const isMobile = /prm|mobile|flutter|android|react\s*native/i.test(assignmentTitle + ' ' + prompt);
    const isWeb = /prj|web|spring|controller|service|repository|react|rest\s*api/i.test(assignmentTitle + ' ' + prompt);
    const isDatabase = /db|database|sql|cơ\s*sở\s*dữ\s*liệu/i.test(assignmentTitle + ' ' + prompt);

    let strengths = '';
    let improvements = '';

    if (isDSA) {
      if (passedText && !passedText.includes('(Không có)')) {
        strengths = `  - Cài đặt cấu trúc dữ liệu chính xác: định nghĩa cấu trúc Student (ID, Name, GPA) và Node đơn liên kết hoàn chỉnh.
  - Cài đặt và thực thi đúng các chức năng CRUD trên Linked List: Thêm mới, Tìm kiếm theo ID, Xóa theo ID và Hiển thị danh sách sinh viên.
  - Thuật toán sắp xếp (Bubble Sort) và tìm kiếm tuyến tính hoạt động đúng, kết quả chính xác.
  - Có giải phóng bộ nhớ động (destructor/clear) tránh thất thoát tài nguyên và có tài liệu phân tích độ phức tạp thuật toán (Time Complexity).`;
      } else {
        strengths = `  - Bài làm đã tải lên file mã nguồn nhưng các chức năng cốt lõi chưa vượt qua các tiêu chí kiểm thử của barem rubric.`;
      }

      if (totalScore < maxScore) {
        improvements = `  - Cần bổ sung xử lý các trường hợp biên đặc biệt: kiểm tra danh sách rỗng trước khi xóa/sắp xếp, xử lý nhập liệu sai kiểu dữ liệu.
  - Đối với thuật toán sắp xếp trên Linked List, có thể tối ưu từ Bubble Sort O(n²) sang Merge Sort O(n log n) để cải thiện tốc độ khi danh sách sinh viên lớn.
  - Nên kiểm tra tính duy nhất của Student ID trước khi thêm vào danh sách để tránh trùng lặp mã sinh viên.`;
      } else {
        improvements = `  - Mã nguồn đã hoàn thiện đầy đủ toàn bộ yêu cầu đề bài. Để nâng cao, có thể mở rộng sang cấu trúc Doubly Linked List hoặc áp dụng Merge Sort trên Linked List để tối ưu độ phức tạp thời gian.`;
      }
    } else if (isDatabase) {
      strengths = `  - Thiết kế Schema và các ràng buộc toàn vẹn dữ liệu (Primary Key, Foreign Key, Not Null) chính xác.
  - Câu truy vấn đáp ứng đúng yêu cầu nghiệp vụ, kết quả trả về đúng định dạng mong đợi.`;
      improvements = `  - Chú ý tối ưu chỉ mục (Index) trên các cột thường xuyên tìm kiếm và join bảng để tối ưu hiệu năng truy vấn.`;
    } else if (isMobile) {
      strengths = `  - Giao diện người dùng được tổ chức rõ ràng theo chuẩn di động, tương tác và điều hướng mượt mà.
  - Quản lý trạng thái và kết nối dữ liệu đáp ứng mục tiêu bài thực hành.`;
      improvements = `  - Chú ý xử lý các trạng thái tải (Loading state), trạng thái rỗng (Empty state) và hiển thị thông báo lỗi thân thiện khi mất kết nối mạng.`;
    } else if (isWeb) {
      strengths = `  - Cấu trúc thư mục được phân chia rõ ràng theo mô hình phân tầng Controller - Service - Repository.
  - Các Entity được cấu hình đầy đủ annotations validation và cơ chế soft-delete hoạt động chuẩn xác.
  - Các endpoint RESTful trả đúng quy chuẩn HTTP Status (200, 201, 204, 404).`;
      improvements = `  - Cần bổ sung thêm test cases cho các trường hợp biên và tối ưu tốc độ truy vấn khi dữ liệu tăng lớn.`;
    } else {
      if (passedText && !passedText.includes('(Không có)')) {
        strengths = `  - Triển khai đầy đủ các logic cốt lõi theo đúng đặc tả yêu cầu của bài tập.
  - Mã nguồn có tổ chức rõ ràng, đặt tên biến và hàm tường minh, dễ đọc và bảo trì.`;
      } else {
        strengths = `  - Đã nộp bài làm nhưng các phần cài đặt chính chưa đạt yêu cầu của bài tập.`;
      }

      if (totalScore < maxScore) {
        improvements = `  - Cần xem lại các tiêu chí chưa đạt để bổ sung các xử lý còn thiếu, đặc biệt là kiểm tra tính hợp lệ của dữ liệu đầu vào.
  - Bổ sung chú thích và xử lý ngoại lệ để chương trình hoạt động ổn định hơn.`;
      } else {
        improvements = `  - Bài làm hoàn thành xuất sắc các yêu cầu đề bài. Tiếp tục duy trì phong cách code sạch và tư duy cấu trúc tốt.`;
      }
    }

    return `### Đánh giá tổng quan bài tập (Tech Lead Review)

**Môn học / Bài tập:** ${assignmentTitle}
**Trạng thái:** ${isPass ? 'Đạt yêu cầu chuyên môn' : 'Chưa đạt yêu cầu đề bài'} (${totalScore.toFixed(1)} / ${maxScore.toFixed(1)} điểm).

#### Đánh giá kỹ thuật:
- **Ưu điểm:**
${strengths}

- **Điểm cần lưu ý & Tối ưu:**
${improvements}
`;
  }

  private static generateEvaluationJson(prompt: string): string {
    // 1. Parse all files from prompt (// FILE: <path>\n<content>)
    const files: { path: string; content: string }[] = [];
    const fileRegex = /\/\/\s*FILE:\s*([^\n]+)\n([\s\S]*?)(?=\n\/\/\s*FILE:|\n\n---|(?:\.\.\. \[CONTENT TRUNCATED)|$)/gi;
    let m;
    while ((m = fileRegex.exec(prompt)) !== null) {
      files.push({ path: m[1].trim(), content: m[2] });
    }

    // 2. Parse criterion title and description
    const ruleTitle = prompt.match(/Grading Criterion:\s*"([^"]+)"/i)?.[1] || '';
    const taskMatch = prompt.match(/YOUR TASK\s*═════*\s*([\s\S]*?)(?=\s*═════*|\s*SOURCE CODE)/i);
    const task = taskMatch ? taskMatch[1].trim() : '';

    const combinedQuery = (ruleTitle + ' ' + task).toLowerCase();

    // 3. Find relevant files and extract snippets
    let bestFile = files.find(f => !f.path.endsWith('.md') && !f.path.endsWith('.txt')) || files[0];
    let matchedSnippet = '';
    let reasoning = '';
    let explanation = '';
    let percentageComplete = 1.0;

    // A. Check for CSD / Data Structures & Algorithms
    const isDataStructureRule = /data structure|cấu trúc|student|linked list|danh sách liên kết|node/i.test(combinedQuery);
    const isFunctionalityRule = /functionality|chức năng|thêm|xóa|tìm kiếm|hiển thị|add|delete|search|display/i.test(combinedQuery);
    const isSortSearchRule = /searching|sorting|sắp xếp|tìm kiếm|sort|search|bubble|algorithm/i.test(combinedQuery);
    const isComplexityRule = /complexity|độ phức tạp|time complexity|thời gian|o\(n\)/i.test(combinedQuery);
    const isQualityRule = /quality|chất lượng|cấu trúc|format|chuẩn mực|ngoại lệ/i.test(combinedQuery);

    if (isComplexityRule) {
      const readmeFile = files.find(f => f.path.toLowerCase().includes('readme') || f.path.toLowerCase().includes('doc'));
      if (readmeFile && /complexity|o\(n\)|thời gian/i.test(readmeFile.content)) {
        bestFile = readmeFile;
        const compMatch = readmeFile.content.match(/(?:#*\s*Complexity[\s\S]*?)(?=\n#|$)/i);
        matchedSnippet = compMatch ? compMatch[0].trim().slice(0, 350) : readmeFile.content.slice(0, 300);
        reasoning = 'Sinh viên đã trình bày phân tích độ phức tạp thời gian (Time Complexity) rõ ràng, chính xác cho các thao tác chính trong file README.md.';
        explanation = 'Bảng phân tích độ phức tạp thời gian O(n) và O(n²) được cung cấp đầy đủ.';
        percentageComplete = 1.0;
      } else {
        reasoning = 'Không tìm thấy tài liệu phân tích độ phức tạp thời gian trong mã nguồn hoặc tệp tài liệu.';
        explanation = 'Thiếu phần phân tích Time Complexity của các thao tác.';
        percentageComplete = 0.0;
      }
    } else if (isDataStructureRule) {
      const source = files.find(f => /struct|class|node/i.test(f.content)) || bestFile;
      if (source && /student/i.test(source.content) && /node|link/i.test(source.content)) {
        bestFile = source;
        const structMatch = source.content.match(/(?:struct\s+Student[\s\S]*?struct\s+Node[\s\S]*?\{[\s\S]*?\};)/i);
        matchedSnippet = structMatch ? structMatch[0].trim() : source.content.slice(0, 300);
        reasoning = 'Mã nguồn đã cài đặt chính xác cấu trúc Student (ID, Name, GPA) và cấu trúc Node của danh sách liên kết đơn với đầy đủ con trỏ và cơ chế cấp phát/giải phóng bộ nhớ.';
        explanation = 'Định nghĩa đúng cấu trúc Student và cấu trúc dữ liệu Linked List.';
        percentageComplete = 1.0;
      } else {
        percentageComplete = 0.5;
        reasoning = 'Chưa tìm thấy đầy đủ cấu trúc Student hoặc danh sách liên kết theo đúng đặc tả.';
        explanation = 'Cấu trúc dữ liệu chưa hoàn chỉnh.';
      }
    } else if (isSortSearchRule) {
      const source = files.find(f => /sort|swap|search/i.test(f.content)) || bestFile;
      if (source && (/sort/i.test(source.content) || /swap/i.test(source.content))) {
        bestFile = source;
        const sortMatch = source.content.match(/(?:void\s+sortBy[\s\S]*?\n\s*\})/i);
        matchedSnippet = sortMatch ? sortMatch[0].trim() : source.content.slice(0, 300);
        reasoning = 'Đã cài đặt thuật toán sắp xếp (Bubble Sort) trên danh sách liên kết theo GPA giảm dần và thuật toán tìm kiếm tuyến tính chính xác.';
        explanation = 'Thuật toán sắp xếp và tìm kiếm hoạt động chuẩn xác theo yêu cầu đề bài.';
        percentageComplete = 1.0;
      } else {
        percentageComplete = 0.0;
        reasoning = 'Chưa tìm thấy thuật toán sắp xếp hoặc tìm kiếm theo yêu cầu.';
        explanation = 'Thiếu thuật toán sắp xếp/tìm kiếm.';
      }
    } else if (isFunctionalityRule) {
      const source = files.find(f => /add|delete|search|display/i.test(f.content)) || bestFile;
      if (source && (/add/i.test(source.content) || /delete/i.test(source.content))) {
        bestFile = source;
        const funcMatch = source.content.match(/(?:bool\s+deleteStudent[\s\S]*?\n\s*\})/i) || source.content.match(/(?:void\s+addStudent[\s\S]*?\n\s*\})/i);
        matchedSnippet = funcMatch ? funcMatch[0].trim() : source.content.slice(0, 300);
        reasoning = 'Hoàn thành đầy đủ các chức năng quản lý danh sách: Thêm sinh viên, Xóa theo ID, Tìm kiếm theo ID và Hiển thị danh sách sinh viên có định dạng.';
        explanation = 'Các phương thức chức năng thêm/xóa/tìm kiếm/hiển thị được triển khai hoàn thiện.';
        percentageComplete = 1.0;
      } else {
        percentageComplete = 0.0;
        reasoning = 'Chưa cài đặt đủ các chức năng thêm, xóa, tìm kiếm theo yêu cầu.';
        explanation = 'Thiếu các chức năng thao tác trên danh sách.';
      }
    } else if (isQualityRule) {
      const source = files.find(f => /gpa|input|cin|clear/i.test(f.content)) || bestFile;
      if (source) {
        bestFile = source;
        const valMatch = source.content.match(/(?:double\s+inputGPA[\s\S]*?\n\s*\})/i);
        matchedSnippet = valMatch ? valMatch[0].trim() : source.content.slice(0, 300);
        reasoning = 'Mã nguồn có cấu trúc rõ ràng, đặt tên biến/hàm theo quy chuẩn, có xử lý lỗi nhập liệu và kiểm tra các trường hợp danh sách rỗng.';
        explanation = 'Code sạch, phân chia hàm hợp lý và có xử lý ngoại lệ.';
        percentageComplete = 1.0;
      }
    } else {
      // General Keyword & Semantic Extraction across ALL files for Any Subject (Java, C#, Web, Mobile, etc.)
      const stopWords = new Set([
        'và', 'các', 'của', 'cho', 'với', 'trong', 'được', 'phải', 'theo', 'yêu', 'cầu', 'chính', 'xác', 'đúng',
        'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'has', 'class', 'method', 'function', 'test'
      ]);
      const words = combinedQuery
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));

      let bestMatchFile = null;
      let bestMatchScore = 0;
      let bestMatchSnippet = '';

      for (const f of files) {
        if (f.path.endsWith('.png') || f.path.endsWith('.jpg') || f.path.endsWith('.zip')) continue;
        const lowerContent = f.content.toLowerCase();
        let matchCount = 0;
        let firstMatchIndex = -1;

        for (const w of words) {
          const idx = lowerContent.indexOf(w);
          if (idx !== -1) {
            matchCount++;
            if (firstMatchIndex === -1 || idx < firstMatchIndex) {
              firstMatchIndex = idx;
            }
          }
        }

        if (matchCount > bestMatchScore) {
          bestMatchScore = matchCount;
          bestMatchFile = f;
          if (firstMatchIndex !== -1) {
            const start = Math.max(0, firstMatchIndex - 50);
            bestMatchSnippet = f.content.substring(start, start + 350).trim();
          }
        }
      }

      if (bestMatchFile && bestMatchScore > 0) {
        bestFile = bestMatchFile;
        matchedSnippet = bestMatchSnippet || bestFile.content.slice(0, 300);
        percentageComplete = bestMatchScore >= Math.min(3, words.length * 0.4) ? 1.0 : 0.75;
        reasoning = `Mã nguồn trong tệp ${bestFile.path} đã được kiểm tra và đáp ứng các yêu cầu kỹ thuật của tiêu chí '${ruleTitle}'.`;
        explanation = `Thành phần kỹ thuật tương ứng đã được triển khai trong ${bestFile.path}.`;
      } else if (bestFile && bestFile.content) {
        matchedSnippet = bestFile.content.slice(0, 250);
        percentageComplete = 0.5;
        reasoning = `Đã tìm thấy mã nguồn trong ${bestFile.path} nhưng chưa tìm thấy các hàm/thành phần thể hiện rõ ràng tiêu chí '${ruleTitle}'.`;
        explanation = `Chưa tìm thấy đủ triển khai cho tiêu chí '${ruleTitle}'.`;
      } else {
        reasoning = `Không tìm thấy mã nguồn hoặc thành phần cài đặt liên quan đến tiêu chí '${ruleTitle}' trong bài nộp.`;
        explanation = 'Thiếu triển khai cho tiêu chí này.';
        percentageComplete = 0.0;
      }
    }

    if (!matchedSnippet && bestFile) {
      matchedSnippet = bestFile.content.slice(0, 250);
    }

    const passed = percentageComplete >= 0.5;

    return JSON.stringify({
      passed,
      confidence: 0.95,
      percentageComplete,
      reasoning,
      relevantSnippets: matchedSnippet ? [
        {
          codeSnippet: matchedSnippet.replace(/\r/g, ''),
          filePath: bestFile?.path || 'main.cpp',
          explanation: explanation || reasoning
        }
      ] : [],
      relevantFiles: bestFile ? [bestFile.path] : []
    }, null, 2);
  }
}
