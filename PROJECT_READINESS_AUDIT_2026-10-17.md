# Đánh giá mức sẵn sàng của AI Teaching Assistant — 17/10/2026

## Kết luận

Dự án đã có các luồng chính cho quản trị viên, giảng viên và sinh viên, cùng hệ thống nộp ZIP, đọc mã nguồn, chấm theo rubric, lưu lịch sử và thông báo trực tiếp. Có thể tiếp tục dùng để phát triển và trình diễn trong môi trường kiểm soát. **Chưa đủ điều kiện kết luận sẵn sàng production**: còn các điểm chặn về phân quyền, bảo vệ tệp bài nộp, cấu hình triển khai và độ bền của hàng đợi chấm bài. Đừng công bố điểm AI hàng loạt trước khi kiểm chứng điểm trên bộ bài mẫu có đáp án và có giảng viên duyệt.

Đánh giá này dựa trên mã nguồn và các kiểm tra tại máy ngày 17/10/2026; không phải kết quả kiểm thử tải, xâm nhập hay vận hành liên tục trên môi trường production. Một lần chấm bài thật trước đó đã tạo được điểm/báo cáo bản nháp, nhưng một trường hợp thành công chưa chứng minh mọi bài đều chấm được.

## Kết quả kiểm tra hiện tại

- Backend `npm run build`: đạt.
- Frontend `npm test`: **77/77 đạt**.
- Frontend `npm run typecheck` và `npm run check:structure`: đạt; kiểm tra cấu trúc bao phủ 220 tệp nguồn và 56 route.
- Frontend `npm run lint`: **không đạt**, 5 lỗi truy cập/cập nhật React ref trong lúc render tại `StudentSubmissionModal.tsx` và `LiveGradingRunnerModal.tsx`; thêm 1.029 cảnh báo. CI hiện không chạy lint.
- Frontend `npm run build`: **không đạt trong môi trường kiểm tra này** vì không truy cập được Google Fonts để tải JetBrains Mono và Plus Jakarta Sans. Chưa kết luận đây là lỗi biên dịch mã nguồn; cần tự lưu font hoặc kiểm tra lại trong môi trường có mạng.
- Có 178 mục thay đổi/chưa theo dõi trong working tree. Kết quả kiểm tra chỉ phản ánh trạng thái máy hiện tại, chưa phải bản phát hành đã chốt và có thể tái tạo nguyên vẹn.

## Việc phải sửa trước khi đưa vào sử dụng thật

### 1. Chặn quyền ghi ở API bài tập và giới hạn phạm vi giảng viên — nghiêm trọng

`/api/grading/assignments` chỉ yêu cầu đăng nhập ở router cha. Nhiều route thay đổi dữ liệu như `/publish`, `/:id`, `/strategy/update-all`, `/:id/update-answer-key` không kiểm tra vai trò ở router con. `updateAllStrategy` gọi `prisma.exam.updateMany` trên toàn bộ bài tập. Như mã hiện tại, người dùng đăng nhập với vai trò sinh viên có thể gửi trực tiếp các yêu cầu này, vượt qua việc ẩn nút trên giao diện. Các route thùng rác đã có chặn vai trò nhưng chưa thấy giới hạn bản ghi theo giảng viên sở hữu. Cần thêm kiểm tra vai trò **và** quyền đối với từng lớp/bài ở tầng dịch vụ; viết kiểm thử API cho sinh viên, giảng viên khác và admin.

Nguồn: `aita-backend/src/modules/grading/presentation/grading.router.ts`, `aita-backend/src/modules/grading/engine/modules/assignments/routes/index.ts`, `aita-backend/src/modules/grading/engine/modules/assignments/controllers/AssignmentController.ts`.

### 2. Chuyển ZIP bài nộp ra khỏi thư mục tĩnh công khai — nghiêm trọng

Khi sinh viên nộp, backend lưu ZIP vào `uploads/submissions/...` và trả URL `/uploads/submissions/...`. `app.ts` phục vụ toàn bộ `/uploads` bằng `express.static` **trước** các route `/api` có xác thực. Như vậy ai có đường dẫn tới ZIP có thể tải trực tiếp mà không qua kiểm tra quyền của endpoint `/api/submissions/:id/source`. Tên tệp có UUID khiến khó đoán nhưng không thay thế kiểm soát quyền. Cần kho lưu trữ riêng, chỉ trả tệp qua endpoint đã xác minh chủ bài/giảng viên phụ trách, hoặc dùng URL ký thời hạn ngắn. Kiểm tra quyền cả các ZIP đã lưu và xử lý các liên kết cũ.

Nguồn: `aita-backend/src/app.ts`, `aita-backend/src/modules/submissions/application/use-cases/create-submission.use-case.ts`, `aita-backend/src/modules/submissions/presentation/submissions.controller.ts`.

### 3. Sửa cấu hình triển khai — nghiêm trọng

Prisma khai báo PostgreSQL, còn `docker-compose.yml` và `.env.example` đang cấu hình SQL Server. Compose vì vậy không phản ánh stack hiện tại. Compose cũng chứa mật khẩu cơ sở dữ liệu/JWT dạng mẫu ghi thẳng trong tệp và gắn Docker socket vào container backend. Cần chọn PostgreSQL nhất quán, chuyển bí mật sang secret manager hoặc biến môi trường được cấp khi triển khai, hạn chế quyền Docker socket, chạy thử deploy từ cấu hình sạch và kiểm tra khôi phục dữ liệu. Không suy ra cấu hình Compose này đang được dùng trên production.

Nguồn: `aita-backend/prisma/schema.prisma`, `aita-backend/.env.example`, `docker-compose.yml`.

### 4. Làm hàng đợi chấm bài bền vững — ưu tiên cao

Hàng đợi và tiến độ chấm nằm trong mảng/Map của tiến trình Node. Backend đặt bài ở trạng thái `Processing` trước khi đưa vào hàng đợi. Nếu tiến trình dừng hoặc triển khai lại, công việc đang chờ biến mất; chưa thấy cơ chế tự khôi phục những bài `Processing` cũ khi khởi động. Cần hàng đợi có lưu trữ bền vững, khóa tránh chấm trùng, timeout/retry có giới hạn và quy trình khôi phục có kiểm soát. Kiểm thử tắt backend giữa lúc xếp hàng và lúc Gemini lỗi.

Nguồn: `aita-backend/src/modules/grading/engine/application/queue/SubmissionQueue.ts`, `SubmissionJobManager.ts`, `aita-backend/src/modules/grading/engine/modules/submissions/controllers/SubmissionController.ts`.

### 5. Xác định đúng giới hạn chấm bài Android — ưu tiên cao

Rubric và đọc mã nguồn Kotlin có thể chấm bằng chứng tĩnh/AI. Nhưng `ExecutionSandboxService` hiện nhận diện `build.gradle` thành nhánh `java` và dùng lệnh chạy Maven/Spring Boot; chưa có bằng chứng hệ thống biên dịch Android APK hoặc chạy các acceptance test tương tác TC01–TC10 trong emulator. Vì vậy điểm rubric không được mô tả như bằng chứng rằng ứng dụng Android đã chạy qua 10 test. Cần hiển thị rõ từng tiêu chí dùng AI, phân tích tĩnh hay kiểm thử thực thi; chỉ hiện `Pass`/số test đạt khi có log chạy test thật. Nếu muốn chấm chức năng Android tự động, cần runner Android chuyên dụng và bộ test do giảng viên duyệt.

Nguồn: `aita-backend/src/modules/grading/engine/application/sandbox/ExecutionSandboxService.ts`, `aita-backend/src/modules/grading/engine/application/evaluator/RubricEvaluator.ts`.

## Nên hoàn thiện sau các điểm chặn

- Sửa 5 lỗi lint trước, rồi giảm cảnh báo theo từng khu vực. Thêm `lint` và kiểm thử backend có kiểm tra phân quyền vào CI; CI hiện chỉ biên dịch backend và chạy unit tests frontend.
- Font giao diện đang được tải qua Google Fonts lúc build. Tự lưu font hoặc bảo đảm build pipeline có kết nối ổn định, sau đó xác nhận build từ bản checkout sạch.
- `server.ts` tự tạo tài khoản demo với mật khẩu cố định khi `NODE_ENV=development`. Chỉ cho phép seed khi bật cờ chủ đích trong DB cục bộ; kiểm tra không còn tài khoản demo trên dữ liệu thật.
- `authenticate` chấp nhận JWT trong query string và access log ghi URL. Token trong URL có thể lọt vào log. Dùng cơ chế xác thực stream riêng, có thời hạn ngắn; loại token khỏi log.
- SSE/WebSocket thông báo hiện giữ danh sách kết nối trong bộ nhớ từng tiến trình. Nếu chạy nhiều instance, cần bus sự kiện dùng chung; kiểm thử gửi/đọc/xóa trên nhiều tab và qua restart.
- Bổ sung bộ bài mẫu nhiều mức điểm, bài thiếu tệp, ZIP lỗi, bài nộp lặp, lỗi AI và chấm lại để so sánh điểm AI với giảng viên. Kiểm tra hiệu năng điều hướng, API p95 và tải đồng thời trước khi hứa “realtime” hay “mượt” trên quy mô thật.

## Thứ tự thực hiện đề xuất

1. Khóa quyền API bài tập và tệp ZIP; rà soát URL đã phát hành.
2. Chốt hạ tầng PostgreSQL, secrets, storage và giới hạn quyền Docker; triển khai thử từ đầu.
3. Tách hàng đợi chấm khỏi bộ nhớ tiến trình; kiểm tra phục hồi sau restart và lỗi Gemini.
4. Chuẩn hóa chứng cứ chấm Android và bộ bài đối chiếu với giảng viên.
5. Sửa lint, đưa lint/backend tests vào CI, kiểm tra build không phụ thuộc tải font ngoài.
6. Kiểm thử end-to-end ba vai trò, đa tab, nhiều instance, backup/restore và tải đồng thời; chốt commit/phát hành từ working tree sạch.

Mức đánh giá hiện tại: **đủ cơ sở làm bản thử nghiệm nội bộ; chưa nên gọi là hoàn chỉnh theo chuẩn production**.

## Cập nhật sau khi sửa mã nguồn

Các điểm phân quyền API, bảo vệ ZIP, hàng đợi PostgreSQL có phục hồi/khóa lượt chấm, relay realtime giữa tiến trình, cấu hình PostgreSQL/pgvector, nhận diện Android, JWT trong URL, seed demo, font và 5 lỗi lint đã có bản sửa. Chi tiết và thủ tục nâng cấp nằm trong [PRODUCTION_HARDENING.md](PRODUCTION_HARDENING.md).

Kiểm chứng tại máy: build backend và frontend đạt; typecheck và cấu trúc đạt; bộ test frontend đạt, thêm kiểm thử SSE chấm bài. Kiểm thử backend gồm API quyền truy cập, chặn ZIP, không tạo điểm 0 từ lỗi và kết quả worker khác; kiểm thử PostgreSQL riêng xác minh ghi bài/task nguyên tử, khóa chống trùng, phục hồi lease, retry/hủy và relay sự kiện. PostgreSQL tạm cục bộ không có pgvector nên nhóm test này không xác minh RAG/vector; CI đã cấu hình image pgvector để kiểm tra migration đầy đủ.

Lint hiện không còn lỗi; còn 1.029 cảnh báo có sẵn cần xử lý dần. Hai bảng mới đã được áp dụng lên Neon sau khi chủ dự án cho phép; xác minh quyền ứng dụng và đọc/ghi thử có rollback. Kiểm thử đạt: 78 frontend, 7 backend, 7 PostgreSQL cục bộ. Chưa nghiệm thu runner Android, triển khai Docker đầy đủ, tải production, backup/restore hoặc các URL Cloudinary cũ. Không coi những mục này là đã hoàn thành chỉ vì build/test mã nguồn đạt.

### Bổ sung quản lý điểm admin — 2026-10-31

Đã thêm `/admin/gradebook` theo học kỳ → mã lớp trong kỳ → môn học phần,
điểm từng bài/lần nộp hiện hành, điều chỉnh kèm lý do/audit, công bố/thu hồi
hàng loạt, cấu hình trọng số riêng từng học phần và xuất Excel. API kiểm tra
quyền admin, phạm vi lớp/môn/sinh viên, thang điểm và phiên bản trước khi lưu
nguyên tử điểm/audit/thông báo. Sửa thẻ điểm sinh viên để ẩn điểm chưa công bố;
API sửa điểm cũ bổ sung kiểm tra quyền và phạm vi giảng viên.

Kiểm chứng: bộ test frontend 113 đạt/1 bỏ qua; backend 88 đạt/4 bỏ qua, gồm 12
test mới về bảng điểm. Kiểm thử trình duyệt bằng dữ liệu giả lập đạt các luồng
sửa, lịch sử, xung đột, công bố hàng loạt, trọng số, nội dung Excel và responsive.
Đối chiếu chỉ đọc thành công với 3 kỳ/8 học phần trong DB hiện tại. Không thay
đổi điểm thật. Typecheck/cấu trúc/lint phần mới đạt; build frontend Webpack đạt.
Turbopack build còn lỗi tiến trình xử lý CSS font trong môi trường kiểm tra;
không thay đổi cấu hình build mặc định để che lỗi này. Chưa kiểm thử mutation
bảng điểm trên PostgreSQL thật hoặc nghiệm thu tải lớn/đồng thời nhiều instance.
Chi tiết: `aita-fontend/docs/admin-gradebook.md`. Các hạng mục production khác
của audit vẫn giữ nguyên trạng thái.
