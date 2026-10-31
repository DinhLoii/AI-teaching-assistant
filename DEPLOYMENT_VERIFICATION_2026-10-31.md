# Kiểm chứng triển khai AITA — 31/10/2026

## Kết luận

**Frontend Vercel và backend Render đã deploy và kết nối thành công.** Kiểm tra trực tiếp qua HTTPS, trình duyệt thật và API xác nhận đăng nhập, phiên, các API đọc chính và phân quyền hoạt động. Có một lỗi chức năng được phát hiện trên bản đang deploy: API danh sách người dùng của admin trả HTTP 500. Bản sửa đã có trong working tree, chưa tự commit/push hoặc triển khai lên Render.

- Frontend: https://ai-teaching-assistant-roan.vercel.app
- Backend: https://aita-backend-68p2.onrender.com
- Readiness: https://aita-backend-68p2.onrender.com/api/ready

## Những gì đã kiểm tra trực tiếp

- Frontend `/login`: HTTP 200 qua HTTPS.
- Backend `/api/health`: HTTP 200, `status: ok`.
- Backend `/api/ready`: HTTP 200, `status: ready`.
- `/api/ready` qua domain Vercel: HTTP 200, xác nhận rewrite/proxy đến Render.
- CORS chấp nhận đúng domain frontend hiện tại; origin không liên quan không nhận header cho phép. OPTIONS của origin bị từ chối trả 200 là hành vi HTTP hợp lệ ở đây; header CORS mới quyết định trình duyệt cho phép hay chặn.
- Form đăng nhập admin trên frontend thật gọi đúng Render API và đăng nhập thành công. Giảng viên/sinh viên đăng nhập API và dùng phiên đó trên trình duyệt thật thành công.
- Profile hiện tại của ba vai trò; API lớp học, môn, học kỳ; catalog và bảng điểm một lớp có sinh viên: đọc thành công.
- Student dashboard, danh sách bài tập và lớp: đọc thành công.
- Không đăng nhập không đọc được API users (401); sinh viên không đọc được users hoặc bảng điểm admin (403).
- Đường dẫn ZIP riêng tư qua public uploads trả 404.
- Stream thông báo có xác thực trả 200 và sự kiện CONNECTED.
- Refresh token quay vòng thành công; token đã tiêu thụ và refresh token sau logout bị từ chối 401.
- Các route `/admin`, `/admin/classes`, `/admin/gradebook`, `/admin/reports`, `/lecturer`, `/lecturer/classes`, `/lecturer/grading/assignments`, `/student`, `/student/classes`, `/student/assignments`, `/student/results` mở được, giữ phiên và không có JavaScript exception trong khoảng quan sát. Đây là smoke giao diện, không thay thế nghiệm thu mọi thao tác CRUD trên từng màn hình.
- Login mobile sau khi hoàn tất hydration: rộng viewport/scroll đều 390px, ảnh hiển thị, không tràn ngang. Lần probe ban đầu chụp quá sớm ở trạng thái Loading đã được phân loại và chạy lại với điều kiện chờ đúng.
- Email recovery trả 503 đúng cấu hình EMAIL_ENABLED=false; không gửi email thật.

## Lỗi đã tìm thấy và bản sửa

**API `/api/users` trên Render trả 500.** `PrismaUserRepository.findMany` dùng `raws.map(UserMapper.toDomain)`. Phần mapper mới gọi `this.rememberSecurityState` nhưng Array.map không giữ ngữ cảnh `this`, nên danh sách bị lỗi dù đăng nhập từng tài khoản vẫn hoạt động.

Đã đổi lời gọi trong mapper sang `UserMapper.rememberSecurityState(user)`, giữ khả năng sử dụng mapper như callback. Thêm regression qua repository để kiểm tra một danh sách hai người dùng vẫn được ánh xạ và giữ security-state snapshot.

Kiểm chứng bản sửa:

- Truy vấn đọc danh sách qua repository/use case trên Neon trả 10 dòng thành công; không in dữ liệu cá nhân vào báo cáo.
- Backend tests: **108 đạt, 0 thất bại, 4 bỏ qua**.
- Backend build: đạt.

Để đưa bản sửa lên link, cần commit/merge thay đổi mapper và test vào `main`, chờ Render tự deploy hoặc chọn Manual Deploy → Deploy latest commit. Sau đó kiểm tra lại API users và màn hình quản lý người dùng. Chưa coi API users đang deploy là đã sửa chỉ vì kiểm chứng local đạt.

## Giới hạn của kết luận

- Đây là xác nhận triển khai demo theo yêu cầu, không phải chứng nhận production đầy đủ hoặc cam kết đã tìm mọi bug.
- Không sửa điểm, tạo/xóa tài khoản, import, upload, gọi AI hoặc đổi mật khẩu để kiểm thử. Đăng nhập có cập nhật last-login và tạo phiên như thông thường; các refresh session dùng để kiểm chứng đã được logout/thu hồi.
- Backend đang dùng schema compatibility mode; lịch sử baseline migration chưa được hòa giải. Chế độ mặc định history vẫn dùng cho triển khai production nghiêm ngặt.
- Email và worker chấm bài được tắt cho deployment-only demo; chưa nghiệm thu gửi mail, AI thật hoặc thực thi mã sinh viên trên hosting.
- File local trên Render Free có thể mất khi nghỉ/restart/redeploy. Chưa kiểm tra upload/restore hoặc tải đồng thời; dữ liệu báo cáo vẫn dùng localhost như chủ dự án đã chọn.
- Bằng chứng kỹ thuật và ảnh trình duyệt được lưu riêng trong `aita-backend/temp/deployment-verification-2026-10-31/` (Git-ignored). File kết quả không lưu access token, refresh token hoặc mật khẩu.
