# BÁO CÁO PHÂN TÍCH & KẾ HOẠCH TỐI ƯU HIỆU NĂNG HỆ THỐNG AITA
*(AI-powered Teaching Assistant - Performance Optimization Report)*

---

## 1. Current Architecture (Kiến trúc hiện tại)

Hệ thống AITA là một nền tảng hỗ trợ giảng dạy và tự động chấm bài code theo Rubric AI dành cho Đại học FPT, gồm 2 thành phần chính:
- **Frontend**: Next.js 16.3.6 (React 19, Tailwind CSS v4, Lucide icons, Framer Motion) chạy độc lập tại cổng 5174/5173, thực hiện proxy các request `/api/*` và `/uploads/*` sang Backend qua Next.js rewrites/proxy.
- **Backend**: Node.js / Express 5.1.0 (TypeScript, ES Modules) chạy tại cổng 3001, cung cấp RESTful API, quản lý xác thực JWT, kết nối Neon PostgreSQL thông qua Prisma ORM 6.8.2, quản lý chấm điểm tự động Sandbox Docker và gọi LLM (Google Gemini / OpenAI).
- **Database**: Neon Serverless PostgreSQL với connection pooling và auto-suspend compute.
- **Caching**: Module `memoryCache` (in-memory TTL cache) đã được triển khai bước đầu trong backend cho một số endpoints.
- **Queue**: `SubmissionQueue` (in-memory FIFO concurrency queue) và `SubmissionJobManager` (Event-driven progress tracking) hỗ trợ cả chế độ chấm ngầm (continuous queue concurrency 1) và chấm dồn theo lớp (batch queue concurrency 3).

---

## 2. Current Stack (Công nghệ hiện tại)

- **Frontend**: Next.js 16.3.6, React 19.2.8, Tailwind CSS v4, Framer Motion 13.4.4, Lucide-react 1.48.0, XLSX 0.18.5, PDF.js 4.10.38.
- **Backend**: Express 5.1.0, TypeScript 5.8.3, Node.js 22+, Prisma ORM 6.8.2, Zod 3.25.42, Dockerode 5.0.0.
- **Database**: PostgreSQL trên Neon Serverless (hỗ trợ `DATABASE_URL` pooler và `DIRECT_URL`).
- **Cache**: In-memory TTL MemoryCache trong Node.js process.
- **Queue/Worker**: In-memory EventEmitter-based concurrency queue (`SubmissionQueue`, `SubmissionJobManager`).
- **AI Engine**: Google Generative AI (Gemini 1.5 Flash), OpenAI SDK.
- **Containerization**: Docker Sandbox container isolation cho thực thi mã nguồn sinh viên an toàn.

---

## 3. Performance Bottlenecks (Các điểm nghẽn hiệu năng)

### Bottleneck 1: Khởi tạo nhiều kết nối PrismaClient riêng biệt (Multiple PrismaClient Instances)
- **Vị trí**: 
  - `aita-backend/src/modules/users/application/use-cases/import-lecturers-excel.use-case.ts`
  - `aita-backend/src/modules/users/application/use-cases/import-teaching-assignments-excel.use-case.ts`
  - `aita-backend/src/modules/users/application/use-cases/import-users.use-case.ts`
  - `aita-backend/src/modules/users/application/use-cases/preview-import-students-excel.use-case.ts`
  - `aita-backend/src/modules/users/application/use-cases/preview-import-lecturers-excel.use-case.ts`
  - `aita-backend/src/modules/users/application/use-cases/update-user.use-case.ts`
  - `aita-backend/src/modules/notifications/application/use-cases/send-assignment-notification.use-case.ts`
- **Hành vi hiện tại**: Mỗi file use-case trên đều khai báo `const prisma = new PrismaClient()`.
- **Nguyên nhân chậm**: Với cơ sở dữ liệu serverless như Neon PostgreSQL, mỗi instance `PrismaClient` tạo riêng một connection pool mới. Việc này gây lãng phí socket, handshake latency cao, cạn kiệt connection pooler limits của Neon và nguy cơ rò rỉ RAM (memory leak).
- **Mức độ ảnh hưởng**: Rất cao (P0).
- **Giải pháp**: Thay thế toàn bộ bằng shared singleton `prisma` từ `aita-backend/src/database/prisma.ts`.
- **Rủi ro**: Không có rủi ro; bảo toàn 100% logic nghiệp vụ.
- **Ưu tiên**: P0 - Critical.

---

### Bottleneck 2: Thiếu Database Indexes trên các bảng có tần suất truy vấn cao
- **Vị trí**: `aita-backend/prisma/schema.prisma`
- **Hành vi hiện tại**: 
  - Bảng `SubmissionArtifact` không có index trên cột `SubmissionId`.
  - Bảng `ExecutionResult` không có index trên `SubmissionId` và `GradingJobId`.
  - Bảng `RuleScore` không có index trên `ExecutionResultId`.
  - Bảng `CriterionScore` không có index trên `RuleScoreId`.
  - Bảng `TestCase` không có index trên `ExamId`.
  - Bảng `GradingSession` không có index trên `SubmissionId`.
  - Bảng `GradingJob` không có index trên `GradingSessionId`.
  - Bảng `Appeal` không có index trên `SubmissionId` và `StudentId`.
  - Bảng `User` thiếu index trên `StudentCode` và `LecturerCode` (thường dùng trong tìm kiếm, đăng nhập, import Excel).
  - Bảng `Submission` thiếu composite index trên `[StudentId, ReviewStatus]`.
- **Nguyên nhân chậm**: Mỗi khi truy vấn bài nộp (Submission Details), kết quả thực thi kiểm thử (Execution Result, Rule Score), hoặc tính điểm Dashboard, PostgreSQL buộc phải thực hiện **Sequential Scan (quét toàn bộ bảng)** thay vì Index Scan.
- **Mức độ ảnh hưởng**: Rất cao (P0).
- **Giải pháp**: Thêm các chỉ mục index cần thiết vào `prisma/schema.prisma` và đồng bộ qua `prisma db push`.
- **Rủi ro**: Thấp (chỉ thêm index, không đổi kiểu dữ liệu hay xóa cột).
- **Ưu tiên**: P0 - Critical.

---

### Bottleneck 3: Over-fetching dữ liệu khổng lồ trong Dashboard & Stats
- **Vị trí**:
  - `aita-backend/src/modules/student-portal/presentation/student-portal.controller.ts` (`getDashboard`)
  - `aita-backend/src/modules/stats/infrastructure/repositories/prisma-stats-repository.ts`
  - `aita-backend/src/modules/submissions/infrastructure/repositories/prisma-submission-repository.ts`
- **Hành vi hiện tại**:
  - `student-portal.controller.ts`: Query `enrolledClasses` sử dụng `include: { StudentClass: true }`, tải toàn bộ danh sách sinh viên của tất cả các lớp học vào bộ nhớ chỉ để hiển thị tên môn và mã lớp!
  - `prisma-stats-repository.ts`: `getStudentSummary` lấy toàn bộ bài nộp `findMany({ where: { StudentId } })` bao gồm cả cột nặng `@db.Text ReportData` chỉ để đếm số lượng; `getLecturerSummary` đếm tổng số bài thi trên toàn hệ thống thay vì của giảng viên.
  - `prisma-submission-repository.ts`: Mặc định `includeDefault` kéo cả `SubmissionArtifact: true` (chứa dữ liệu file) và `Exam: { include: { SubmissionOverride: true } }` trên mọi truy vấn danh sách bài nộp mà không có giới hạn `take` mặc định.
- **Nguyên nhân chậm**: Dữ liệu truyền từ Neon Postgres về Node.js quá lớn, tốn network bandwidth, tốn bộ nhớ RAM, thời gian JSON parsing lâu.
- **Mức độ ảnh hưởng**: Rất cao (P0).
- **Giải pháp**:
  - Tinh chỉnh `select` chỉ lấy các trường cần thiết (loại bỏ `StudentClass` dư thừa trong `enrolledClasses`).
  - Sử dụng `prisma.submission.count()` cho thống kê số lượng thay vì `findMany().length`.
  - Tránh nạp `ReportData` trong danh sách tóm tắt.
- **Rủi ro**: Rất thấp (kiểm tra chặt chẽ DTO và contract).
- **Ưu tiên**: P0 - Critical.

---

### Bottleneck 4: Bộ nhớ Cache trong RAM không có giới hạn kích thước (Unbounded Memory Cache)
- **Vị trí**: `aita-backend/src/shared/infrastructure/memory-cache.ts`
- **Hành vi hiện tại**: `MemoryCache` lưu trữ trong `Map<string, CacheEntry>` không có giới hạn số lượng phần tử (`maxSize`) và không dọn dẹp các key hết hạn trừ khi được truy cập lại hoặc xóa prefix.
- **Nguyên nhân chậm**: Khi số lượng request và các tổ hợp tham số URL tăng cao, `Map` sẽ tăng kích thước liên tục, gây tiêu tốn RAM của server Node.js.
- **Mức độ ảnh hưởng**: Trung bình (P1).
- **Giải pháp**: Bổ sung cơ chế giới hạn dung lượng (Max items: 2000) và dọn dẹp tự động (sweep expired keys định kỳ 5 phút).
- **Rủi ro**: Không có rủi ro.
- **Ưu tiên**: P1 - High.

---

### Bottleneck 5: Bundle Size Frontend bị đội dung lượng do thư viện nặng (XLSX, Lucide imports)
- **Vị trí**:
  - `aita-fontend/src/features/users/screens/AdminUsersPage.tsx`
  - `aita-fontend/next.config.ts`
- **Hành vi hiện tại**: `AdminUsersPage.tsx` import tĩnh `import * as XLSX from 'xlsx'` ngay đầu file. Cả thư viện SheetJS (~300KB) bị đóng gói vào bundle của trang ngay cả khi người dùng chỉ xem danh sách người dùng.
- **Nguyên nhân chậm**: Làm tăng thời gian tải trang ban đầu (LCP) và tăng dung lượng JavaScript gửi về client.
- **Mức độ ảnh hưởng**: Trung bình (P1).
- **Giải pháp**:
  - Sử dụng dynamic import `const XLSX = await import('xlsx')` chỉ khi người dùng click "Import" hoặc "Export".
  - Thêm cấu hình `optimizePackageImports: ['lucide-react', 'framer-motion']` vào `next.config.ts` để Turbopack tối ưu tree-shaking triệt để.
- **Rủi ro**: Không ảnh hưởng giao diện; hoàn toàn giữ nguyên UI.
- **Ưu tiên**: P1 - High.

---

## 4. Proposed Architecture (Kiến trúc đề xuất)

```
[ Trình duyệt (Browser) ]
       │
       ▼
[ Next.js 16 App (Port 5174/5173) ]
       │  (Reverse Proxy / Next rewrites)
       ▼
[ Express API Server (Port 3001) ]
       │
       ├─► [ MemoryCache (LRU, Bounded) ] (Hit: 0ms response)
       │
       ▼ (Miss)
[ Service Layer & Repository ]
       │
       ├─► [ Shared PrismaClient Singleton (Connection Pool) ]
       │             │
       │             ▼
       │     [ Neon Serverless PostgreSQL ]
       │     (Indexed Lookups, Lean SELECTs, Fast Aggregations)
       │
       └─► [ Background Queue (SubmissionQueue + JobManager) ]
                     │
                     ▼
             [ Docker Sandbox / AI Engine (Non-blocking) ]
```

---

## 5. Expected Improvements (Hiệu quả kỳ vọng)

- **Database Connection Handshake Latency**: Giảm từ 100-300ms xuống < 5ms cho các request tái sử dụng connection pooler singleton.
- **Dashboard Data Fetching Latency**: Giảm tải dữ liệu thừa từ hàng chục KB xuống mức cần thiết (giảm ~60-80% over-fetched rows).
- **Submissions & Results Lookup Query Time**: Giảm từ 50-200ms (Seq Scan) xuống 2-10ms (Index Scan trên Neon).
- **Client Bundle Size**: Giảm tải SheetJS (~300KB) khỏi initial bundle của Admin Users.
- **UI/UX Preservation**: 100% Giao diện giữ nguyên, không thay đổi bất kỳ thành phần hiển thị nào.
