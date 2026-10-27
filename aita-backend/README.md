# AITA Backend (`aita-backend/`)

API Node.js cho frontend `aita-fontend/`.

## FER202 / React frontend

Runner React Vite và Create React App dùng `node:20-alpine`, giữ đúng thư mục
`package.json` kể cả ZIP lồng folder và công bố giao diện ở cổng 8080. Vite
khởi động với `--host 0.0.0.0 --port 8080 --strictPort`; không chèn CommonJS
vào dự án ESM. Dependency cần mạng ở lần cài đầu hoặc npm cache đã có.
React độc lập được nhận diện từ mã nguồn kể cả đề ghi loại `project`/`zip`.
Chỉ kiểm tra các cổng công khai mà trình duyệt truy cập được, có giới hạn thời
gian mỗi yêu cầu; frontend phải trả HTML thành công, 404 không được coi là sẵn sàng.

Trên máy chạy backend, chạy `npm run playwright:install` để cài Chromium.
`npm run test:fer202` dựng ZIP React mẫu, chạy qua Docker/Playwright thật,
kiểm tra form, thêm/xóa, trạng thái, lưu dữ liệu, chuyển trang và mobile;
đồng thời xác minh workflow đạt được điểm và workflow lỗi không được điểm.
Lệnh không gọi AI và không ghi điểm sinh viên. Báo cáo ở
`output/FER202_Readiness/verification.json` tính từ thư mục gốc repository.

Các test thao tác được lưu trong `PublishedAssignment.testSuites.browser`.
Sinh viên nộp bài UI chỉ lưu lần nộp ở trạng thái Pending, không tạo việc chấm
tự động. Giảng viên bấm **Bắt đầu chấm UI & Logs** (hoặc chủ động chấm batch)
để bắt đầu; nút đợi server nhận việc rồi mới mở log của lượt mới.
Đề đăng ký/đăng nhập thiếu browser tests được chuẩn bị từ mẫu yêu cầu auth và
form thực tế: email sai, xác nhận mật khẩu sai, đăng ký, email trùng, mật khẩu
đăng nhập sai, đăng nhập đúng/đối chiếu hồ sơ, đăng xuất. Các tiêu chí chức năng
liên quan lấy điểm từ workflow thật; không bấm mọi button tùy tiện. Đề hoặc form
không phù hợp mẫu cần cấu hình test riêng, log ghi rõ chưa xác minh thao tác.
Tiêu chí `AIVision` có `requiredEvidence[].browserProbe.testIds` sẽ tính điểm
theo đúng workflow đã liên kết, không dùng AI thay cho kết quả fail. Test chưa
chạy yêu cầu giảng viên duyệt. Tiêu chí AIVision không liên kết workflow vẫn
dùng ảnh chụp và cơ chế chấm giao diện hiện có. Cần cấu hình selector và kết
quả mong đợi phù hợp từng đề; không chuyển test giao diện thành stdin/stdout.

Khi chấm bài có giao diện, Chromium tự mở cửa sổ trên máy chạy backend để
bạn quan sát trang và các thao tác kiểm thử. Không cần bật tùy chọn, không có
khung truyền ảnh trong modal. Chạy xong hoặc lỗi, trình duyệt tự đóng qua
finally; chỉ đóng phiên Chromium do lượt chấm tạo ra. Nếu không có workflow
cấu hình hoặc mẫu phù hợp thì chỉ chụp bằng chứng, không nhận là đã test form.
Máy không có desktop sẽ ghi rõ việc chuyển sang chạy nền.
Docker dùng endpoint của context hiện tại (bao gồm pipe Docker Desktop Linux
trên Windows); DOCKER_HOST cấu hình tường minh vẫn được ưu tiên. UI runtime
không khởi động được sẽ dừng lượt chấm, không tiếp tục chấm code thay cho UI.

Chạy `npm run test:fer202` để kiểm tra Docker và Chromium thật với React mẫu.
Không gọi AI và không ghi điểm sinh viên.

## Chạy nhanh

```bash
cd aita-backend
cp .env.example .env   # nếu chưa có .env
npm install
npm run setup        # prisma + seed
npm run dev          # http://localhost:3001
```

## Lỗi kết nối Neon khi khởi động

Nếu gặp `P1001: Can't reach database server`, thêm `&connect_timeout=20&pool_timeout=20`
vào URL Neon trong `.env` (dùng `?` nếu URL chưa có tham số).
Giữ `DATABASE_URL` là URL pooled; `DIRECT_URL` dùng hostname không có `-pooler`.
Khởi động lại `npm run dev` sau khi sửa `.env`.

Backend chờ kết nối database trước khi mở HTTP và chạy hàng đợi/realtime.
Lỗi kết nối tạm thời được thử lại tối đa 5 lần; nếu vẫn thất bại, backend dừng
và báo lỗi để kiểm tra mạng, URL hoặc trạng thái database. Lỗi sai mật khẩu
hoặc cấu hình sẽ dừng ngay.

Mặc định, các giao dịch dùng chung `DB_TRANSACTION_TIMEOUT=30000` và
`DB_TRANSACTION_MAX_WAIT=15000` (mili giây), bao gồm gia hạn cho mọi môn,
nộp bài và các module dùng Prisma trực tiếp hoặc Unit of Work. Có thể chỉnh
trong `.env`; khởi động lại backend sau khi đổi. Giao dịch gia hạn lưu cả
hạn mới và thông báo trước khi báo thành công. Nếu giao dịch hết thời gian,
API trả thông báo dễ hiểu thay vì đưa chi tiết Prisma ra giao diện.

Kiểm tra lỗi giao dịch chậm trên database đang cấu hình (PowerShell):

```powershell
$env:TEST_DATABASE_LATENCY='true'
node --import tsx --test tests/transaction-timeouts.postgres.test.ts
Remove-Item Env:TEST_DATABASE_LATENCY
```

Hai test cố ý chờ 6 giây, chỉ đọc và dùng bảng tạm tự xóa; không thay đổi
bài nộp hoặc thông báo thật. Bộ test mặc định bỏ qua kiểm tra kết nối này.

## Tài khoản demo

| Email | Mật khẩu | Cổng FE |
|-------|----------|---------|
| admin@fpt.edu.vn | admin123 | /admin |
| lecturer@fpt.edu.vn | lecturer123 | /lecturer |
| student@fpt.edu.vn | student123 | /student |

## FE kết nối

Trong thư mục `aita-fontend`:

```bash
npm run dev   # proxy /api → localhost:3001
```

Đăng nhập tại `/login` trước khi vào dashboard.

## Các lệnh kiểm tra & vận hành

| Lệnh | Mục đích |
|---|---|
| `npm run build` | Biên dịch toàn bộ TypeScript backend (`tsc`) |
| `npm run dev` | Chạy dev server với hot reload qua `tsx watch` |
| `npm run start` | Khởi chạy server production (`node dist/server.js`) |
| `npm run db:generate` | Sinh Prisma client types |
| `npm run db:push` | Đồng bộ schema Prisma vào database |
| `npm run db:seed` | Nạp dữ liệu mẫu ban đầu |

## CI/CD Pipeline

Dự án đã được tích hợp sẵn trong GitHub Actions tại `.github/workflows/ci.yml`:
- **Job `backend-ci`**: Tự động checkout code, cài đặt dependencies với npm cache, chạy `prisma generate` và `npm run build` kiểm tra typecheck.
- **Job `docker-build`**: Tự động kiểm tra build Docker Image của `aita-backend`.

## Kiến trúc API & Routing

Hệ thống backend được thiết kế theo **Clean Architecture**:
- Khởi động app: `src/app.ts` & `src/server.ts`.
- Quản lý định tuyến toàn bộ modules: `src/shared/presentation/route-manager.ts`.
- Tất cả endpoint đều nằm dưới prefix `/api`.

