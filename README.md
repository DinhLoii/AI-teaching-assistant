# AI-Teaching-Assistant

Ứng dụng trợ lý giảng dạy gồm frontend Next.js, backend Express/Prisma và PostgreSQL có pgvector.

Xem [hướng dẫn cập nhật và triển khai](PRODUCTION_HARDENING.md) trước khi nâng cấp cơ sở dữ liệu hoặc chạy Docker. Thông tin cấu hình hiện tại nằm trong `.env.example` và `aita-backend/.env.example`; các migration SQL Server cũ chỉ được giữ để tham chiếu.

## Chạy local nhanh

Sau khi cài thư viện (`npm ci` trong `aita-fontend` và `aita-backend`) và cấu hình `.env` của backend, chạy từ thư mục gốc:

```sh
npm run local
```

Mở **http://localhost:5194**. Lệnh này biên dịch frontend và backend trước khi chạy, nên chuyển trang không phải chờ biên dịch như `next dev`. Lần đầu cần chờ tạo bản dựng; các lần sau tự dùng lại nếu mã nguồn và cấu hình không đổi. Sau khi sửa code, dừng bằng Ctrl+C rồi chạy lại lệnh này để nhận thay đổi. `npm run local:build` chỉ tạo bản dựng.

Frontend local dùng `.next-local` và backend cổng **3002**, tách khỏi các phiên dev trên 5174/3001. API dùng cùng cơ sở dữ liệu đã cấu hình trong `aita-backend/.env`; lệnh không seed, reset hay tự chạy migration. Kết nối và bảng cần thiết được kiểm tra trước khi báo sẵn sàng. Dữ liệu tài khoản và bài tập là dữ liệu thật của cơ sở dữ liệu đó.

Có thể đổi cổng bằng `npm run local -- --port 5195 --api-port 3003`. Các phiên đang chiếm cổng được giữ nguyên; lệnh sẽ báo lỗi thay vì tắt chúng. Nếu sửa giao diện và cần cập nhật ngay khi lưu, vẫn chạy `npm run dev` trong từng thư mục; lần mở trang mới ở chế độ dev có thêm chi phí biên dịch.

Local dùng Webpack để tạo bản production vì tiến trình CSS của Turbopack hiện lỗi trên môi trường Windows này. Log thông thường giảm còn cảnh báo/lỗi; đặt `LOG_LEVEL=debug` khi cần xem chi tiết. Chạy `npm run test:local` để kiểm tra cơ chế dùng lại bản dựng.
