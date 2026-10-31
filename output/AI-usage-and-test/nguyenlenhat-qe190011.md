# Nguyễn Lê Nhật — QE190011

# Nhật ký sử dụng AI, coding và kiểm thử hệ thống AITA

- Mã thành viên/tên file: `nguyenlenhat-qe190011`.
- Dự án: AI-Teaching-Assistant (AITA).
- Ngày biên soạn: 29/10/2026 (Asia/Bangkok).
- Phiên bản mã nguồn tham chiếu: `579c9dfa01ae04ba2a5dcf7569f8ca7d70918abf`.
- Nhóm công việc đề xuất: **Xác thực, phân quyền, quản lý lớp và tài khoản**.
- Phạm vi: Đăng nhập, kiểm soát quyền theo vai trò, lớp học và bảo vệ dữ liệu giữa các người dùng.

> Đây là hồ sơ khởi tạo theo mã nguồn hiện có. Phân công, prompt và công việc cá nhân bên dưới là đề xuất/mẫu để thành viên xác nhận; không phải lịch sử hoạt động đã được xác minh. Không có dữ liệu hội thoại AI, thời lượng sử dụng, token, chi phí hay xác nhận tác giả cá nhân để điền như sự kiện thực tế. Ảnh tham chiếu chỉ thể hiện danh sách 5 file Markdown, không cung cấp nội dung bên trong.

## 1. Bối cảnh và căn cứ

AITA gồm frontend Next.js/React, backend Express/Prisma và PostgreSQL có pgvector theo README và cấu hình dự án. Các miền chức năng gồm tài khoản, lớp học, bài tập, bài nộp, AI, rubric, chấm bài, thông báo và báo cáo.

Các đường dẫn dưới đây tính từ thư mục gốc dự án, dùng để đối chiếu nội dung; không phải bằng chứng thành viên đã viết các file đó.

- `aita-backend/src/modules/auth/presentation/auth.router.ts`
- `aita-backend/src/modules/auth/presentation/auth.controller.ts`
- `aita-backend/src/modules/classes/presentation/classes.router.ts`
- `aita-fontend/src/providers/auth-provider.tsx`

Các bộ kiểm tra liên quan có trong dự án:

- `aita-fontend/tests/api-contracts.test.mjs`
- `aita-fontend/tests/api-cache.test.mjs`
- `aita-backend/tests/production-hardening.test.ts`
- `aita-backend/tests/database-startup.test.ts`

## 2. Phạm vi coding đề xuất

Mỗi mục cần có commit/PR hoặc diff được thành viên xác nhận trước khi chuyển thành báo cáo đóng góp thực tế.

### CODE-01: Luồng xác thực

- Mục tiêu: Phân tích đăng nhập, tải thông tin người dùng, đăng xuất và xử lý phiên hết hạn trong AITA.
- Sản phẩm cần bàn giao: Sơ đồ request và trạng thái đăng nhập trên frontend.
- Cách kiểm tra: Đối chiếu auth router/controller và auth-provider.tsx; không giả định cookie/token khi chưa đọc code.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-02: Ma trận phân quyền

- Mục tiêu: Lập danh sách thao tác của Admin, Lecturer và Student cho tài khoản, lớp, bài tập và kết quả.
- Sản phẩm cần bàn giao: Ma trận quyền dự kiến cần xác nhận bằng API.
- Cách kiểm tra: Kiểm tra middleware và điều kiện sở hữu; không chỉ dựa vào nút bị ẩn trên UI.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-03: Validation đầu vào

- Mục tiêu: Đề xuất dữ liệu biên cho đăng nhập và thao tác tài khoản: rỗng, sai kiểu, chuỗi dài, ký tự đặc biệt.
- Sản phẩm cần bàn giao: Bộ dữ liệu thử và tiêu chí lỗi an toàn.
- Cách kiểm tra: Đối chiếu validator thực tế; không tự đặt quy tắc mật khẩu khi yêu cầu chưa có.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-04: Quản lý lớp

- Mục tiêu: Rà soát điều kiện xem lớp, danh sách sinh viên và ghi danh; chỉ ra nguy cơ truy cập lớp của người khác.
- Sản phẩm cần bàn giao: Danh sách API cần kiểm tra quyền và ownership.
- Cách kiểm tra: Đối chiếu classes.router.ts và repository liên quan.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-05: Cache theo người dùng

- Mục tiêu: Kiểm tra dữ liệu frontend sau đăng xuất A và đăng nhập B trên cùng trình duyệt.
- Sản phẩm cần bàn giao: Kịch bản xóa hoặc phân tách cache và khôi phục state.
- Cách kiểm tra: So khớp API cache, state auth và dữ liệu hiển thị; dùng hai tài khoản thử riêng.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-06: Kiểm tra cấu hình

- Mục tiêu: Tạo checklist khởi động backend, kết nối PostgreSQL và thông báo lỗi không để lộ bí mật.
- Sản phẩm cần bàn giao: Biên bản điều kiện môi trường và danh sách lỗi có thể tái hiện.
- Cách kiểm tra: Đọc database-startup.test.ts và production-hardening.test.ts; không reset DB đang sử dụng.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

## 3. Nhật ký sử dụng AI — các phiên mẫu cần xác nhận

Các prompt sau là gợi ý để thực hiện công việc. Chưa có bằng chứng chúng đã được gửi cho công cụ AI; phần phản hồi không được dựng thành lịch sử hội thoại. Mỗi phiên gắn với một đầu việc ở mục 2.

### AI-01: Luồng xác thực

- Liên kết công việc: CODE-01.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Sơ đồ request và trạng thái đăng nhập trên frontend.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Phân tích đăng nhập, tải thông tin người dùng, đăng xuất và xử lý phiên hết hạn trong AITA. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu auth router/controller và auth-provider.tsx; không giả định cookie/token khi chưa đọc code.
- Đầu ra dự kiến: Sơ đồ request và trạng thái đăng nhập trên frontend.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-02: Ma trận phân quyền

- Liên kết công việc: CODE-02.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Ma trận quyền dự kiến cần xác nhận bằng API.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Lập danh sách thao tác của Admin, Lecturer và Student cho tài khoản, lớp, bài tập và kết quả. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Kiểm tra middleware và điều kiện sở hữu; không chỉ dựa vào nút bị ẩn trên UI.
- Đầu ra dự kiến: Ma trận quyền dự kiến cần xác nhận bằng API.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-03: Validation đầu vào

- Liên kết công việc: CODE-03.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Bộ dữ liệu thử và tiêu chí lỗi an toàn.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Đề xuất dữ liệu biên cho đăng nhập và thao tác tài khoản: rỗng, sai kiểu, chuỗi dài, ký tự đặc biệt. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu validator thực tế; không tự đặt quy tắc mật khẩu khi yêu cầu chưa có.
- Đầu ra dự kiến: Bộ dữ liệu thử và tiêu chí lỗi an toàn.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-04: Quản lý lớp

- Liên kết công việc: CODE-04.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Danh sách API cần kiểm tra quyền và ownership.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Rà soát điều kiện xem lớp, danh sách sinh viên và ghi danh; chỉ ra nguy cơ truy cập lớp của người khác. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu classes.router.ts và repository liên quan.
- Đầu ra dự kiến: Danh sách API cần kiểm tra quyền và ownership.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-05: Cache theo người dùng

- Liên kết công việc: CODE-05.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Kịch bản xóa hoặc phân tách cache và khôi phục state.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Kiểm tra dữ liệu frontend sau đăng xuất A và đăng nhập B trên cùng trình duyệt. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: So khớp API cache, state auth và dữ liệu hiển thị; dùng hai tài khoản thử riêng.
- Đầu ra dự kiến: Kịch bản xóa hoặc phân tách cache và khôi phục state.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-06: Kiểm tra cấu hình

- Liên kết công việc: CODE-06.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Biên bản điều kiện môi trường và danh sách lỗi có thể tái hiện.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Tạo checklist khởi động backend, kết nối PostgreSQL và thông báo lỗi không để lộ bí mật. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đọc database-startup.test.ts và production-hardening.test.ts; không reset DB đang sử dụng.
- Đầu ra dự kiến: Biên bản điều kiện môi trường và danh sách lỗi có thể tái hiện.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

## 4. Kịch bản kiểm thử hệ thống

Các ca dưới đây là thiết kế kiểm thử thủ công/tích hợp; **chưa thực thi trong lần biên soạn này**. Kết quả mong đợi là tiêu chí cần kiểm chứng, không phải mô tả kết quả đã đạt. Dùng môi trường và tài khoản thử, không dùng dữ liệu sản xuất.

### TC-QE190011-01: Đăng nhập hợp lệ

- Tiền điều kiện/dữ liệu: Có tài khoản thử hoạt động.
- Các bước: Nhập thông tin đúng và đăng nhập.
- Kết quả mong đợi: Vào màn hình đúng vai trò; thông tin người dùng nhất quán.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190011-02: Sai thông tin đăng nhập

- Tiền điều kiện/dữ liệu: Tài khoản thử hợp lệ nhưng mật khẩu nhập sai.
- Các bước: Gửi đăng nhập với mật khẩu sai.
- Kết quả mong đợi: Từ chối đăng nhập; không tạo phiên hợp lệ và không tiết lộ mật khẩu.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190011-03: Trường đầu vào không hợp lệ

- Tiền điều kiện/dữ liệu: Dữ liệu thử rỗng hoặc sai kiểu.
- Các bước: Gửi từng dữ liệu vào API đăng nhập.
- Kết quả mong đợi: Trả lỗi có kiểm soát; không gây lỗi máy chủ hoặc bỏ qua validation.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190011-04: Chưa đăng nhập

- Tiền điều kiện/dữ liệu: Trình duyệt sạch, không có phiên.
- Các bước: Mở trang và gọi API yêu cầu xác thực.
- Kết quả mong đợi: Không trả dữ liệu bảo vệ; giao diện hướng dẫn đăng nhập.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190011-05: Sinh viên gọi API quản trị

- Tiền điều kiện/dữ liệu: Đã đăng nhập vai trò Student.
- Các bước: Gọi trực tiếp API quản lý tài khoản của Admin.
- Kết quả mong đợi: Backend từ chối dù có thể tự tạo request.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190011-06: Truy cập lớp ngoài quyền

- Tiền điều kiện/dữ liệu: Giảng viên A không phụ trách lớp B.
- Các bước: Thử lấy danh sách sinh viên hoặc thay đổi lớp B.
- Kết quả mong đợi: Không cho phép đọc/sửa dữ liệu ngoài phạm vi được cấp.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190011-07: Đăng xuất và đổi tài khoản

- Tiền điều kiện/dữ liệu: Có hai tài khoản A/B với dữ liệu khác nhau.
- Các bước: Đăng nhập A; đăng xuất; đăng nhập B.
- Kết quả mong đợi: Không hiển thị dữ liệu còn lưu của A cho B.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190011-08: Phiên hết hạn

- Tiền điều kiện/dữ liệu: Có phiên thử hết hiệu lực.
- Các bước: Gọi API bảo vệ và quay lại giao diện.
- Kết quả mong đợi: Từ chối phiên hết hạn; xử lý rõ ràng, không lặp gọi vô hạn.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

## 5. Kết quả kiểm tra tự động thực tế dùng chung

Các lệnh sau do Codex thực thi trong lần biên soạn ngày 29/10/2026 trên checkout tham chiếu ở đầu tài liệu. Kết quả được dùng chung cho cả nhóm; không quy cho riêng Nguyễn Lê Nhật và không cộng năm bản báo cáo thành năm lượt chạy độc lập.

### RUN-LOCAL: Cơ chế chạy local và sửa import

- Thư mục chạy: thư mục gốc dự án.
- Lệnh: `node --test --test-reporter=tap scripts/local-runtime.test.mjs aita-backend/scripts/fix-esm-imports.test.mjs`.
- Kết quả: **3 tests; 3 pass; 0 fail; 0 skipped**.
- Log gốc: [evidence/local-runtime.tap](evidence/local-runtime.tap).

### RUN-FE: Bộ kiểm tra hồi quy trong frontend

- Thư mục chạy: `aita-fontend`.
- Lệnh: `node --test --test-reporter=tap tests/*.test.mjs`.
- Kết quả: **114 tests; 113 pass; 0 fail; 1 skipped**.
- Ca bị bỏ qua được TAP đánh dấu SKIP: `upload proxy accepts a response beyond the previous 30-second cutoff`. Không tính ca này là pass.
- Log gốc: [evidence/frontend-regression.tap](evidence/frontend-regression.tap).

### Phạm vi và giới hạn kết quả

- Tổng hai lượt chạy: **117 tests; 116 pass; 0 fail; 1 skipped**.
- Các số liệu là số test theo TAP, không phải tỷ lệ bao phủ mã nguồn hoặc số chức năng E2E.
- Chưa chạy ứng dụng trên trình duyệt, kiểm tra E2E, bộ backend đầy đủ, integration PostgreSQL/Docker hoặc gọi dịch vụ AI thật trong lần biên soạn này.
- Tên và vị trí file test không chứng minh đó là kiểm thử giao diện thật; nhiều bài kiểm tra kiểm chứng logic/contract bằng fixture hoặc mock.
- Các bộ test ở mục 1 nằm ngoài hai lệnh đã ghi vẫn cần chạy riêng và lưu bằng chứng.

## 6. Quy trình bổ sung log thực tế

1. Xác nhận lại phân công và phạm vi cá nhân trong mục 2.
2. Ghi ngày/giờ, công cụ, model và nội dung prompt từ hội thoại thật vào mục 3.
3. Đối chiếu phản hồi AI với code/yêu cầu; mô tả quyết định chấp nhận, sửa hoặc loại bỏ.
4. Gắn commit/PR/diff để chứng minh phần coding cá nhân.
5. Chạy test liên quan, lưu nguyên log và ghi môi trường, phiên bản, người thực thi.
6. Thực hiện các ca mục 4; cập nhật Actual và PASS/FAIL/BLOCKED kèm bằng chứng.
7. Nhờ một thành viên khác review; chỉ chốt báo cáo cá nhân sau khi đối chiếu bằng chứng.

## 7. Mẫu báo lỗi và retest

- Bug ID: BUG-QE190011-[số].
- Tiêu đề: [chức năng + lỗi quan sát được].
- Liên kết test case: TC-QE190011-[số].
- Môi trường/phiên bản: [OS, browser, commit, cấu hình thử đã ẩn bí mật].
- Tiền điều kiện và dữ liệu: [dữ liệu tái hiện tối thiểu].
- Bước tái hiện: [các thao tác cụ thể].
- Expected: [điều yêu cầu quy định].
- Actual: [hành vi quan sát thật].
- Mức độ/ưu tiên: [đánh giá theo tác động].
- Bằng chứng: [ảnh, video hoặc log đã loại thông tin nhạy cảm].
- Phân tích AI nếu có: [gợi ý; chưa phải kết luận nguyên nhân].
- Nguyên nhân đã xác minh và bản sửa: [commit/PR].
- Retest: [ngày, người chạy, kết quả và log].

## 8. Tổng kết cá nhân cần hoàn thiện

- Công việc coding đã chứng minh: [chưa có xác nhận cá nhân].
- Phiên dùng AI đã chứng minh: [chưa cung cấp lịch sử].
- Test do thành viên trực tiếp chạy: [chưa có bằng chứng cá nhân].
- Kiểm tra tự động dùng chung: 116 pass, 0 fail, 1 skipped trong 117 tests; xem mục 5.
- Lỗi còn mở/điều kiện bị chặn: [cập nhật sau thực thi].
- Bài học khi dùng AI: [viết từ tình huống đã xảy ra, kèm ví dụ được kiểm chứng].
- Người xác nhận hồ sơ: [thành viên] — [người review] — [ngày].
