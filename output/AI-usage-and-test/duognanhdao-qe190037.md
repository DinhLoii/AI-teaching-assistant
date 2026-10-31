# Dương Anh Đào — QE190037

# Nhật ký sử dụng AI, coding và kiểm thử hệ thống AITA

- Mã thành viên/tên file: `duognanhdao-qe190037`.
- Dự án: AI-Teaching-Assistant (AITA).
- Ngày biên soạn: 29/10/2026 (Asia/Bangkok).
- Phiên bản mã nguồn tham chiếu: `579c9dfa01ae04ba2a5dcf7569f8ca7d70918abf`.
- Nhóm công việc đề xuất: **Frontend, màn hình bài tập và trải nghiệm người dùng**.
- Phạm vi: Màn hình sinh viên/giảng viên, tạo bài tập, hiển thị tài liệu và đồng bộ hạn nộp.

> Đây là hồ sơ khởi tạo theo mã nguồn hiện có. Phân công, prompt và công việc cá nhân bên dưới là đề xuất/mẫu để thành viên xác nhận; không phải lịch sử hoạt động đã được xác minh. Không có dữ liệu hội thoại AI, thời lượng sử dụng, token, chi phí hay xác nhận tác giả cá nhân để điền như sự kiện thực tế. Ảnh tham chiếu chỉ thể hiện danh sách 5 file Markdown, không cung cấp nội dung bên trong.

## 1. Bối cảnh và căn cứ

AITA gồm frontend Next.js/React, backend Express/Prisma và PostgreSQL có pgvector theo README và cấu hình dự án. Các miền chức năng gồm tài khoản, lớp học, bài tập, bài nộp, AI, rubric, chấm bài, thông báo và báo cáo.

Các đường dẫn dưới đây tính từ thư mục gốc dự án, dùng để đối chiếu nội dung; không phải bằng chứng thành viên đã viết các file đó.

- `aita-fontend/src/features/assignments/screens/StudentAssignmentsPage.tsx`
- `aita-fontend/src/features/assignments/screens/StudentAssignmentDetailPage.tsx`
- `aita-fontend/src/features/assignments/components/CreateAssignmentWizardModal.tsx`
- `aita-fontend/src/features/assignments/hooks/useAssignmentSync.ts`

Các bộ kiểm tra liên quan có trong dự án:

- `aita-fontend/tests/student-assignment-loading.test.mjs`
- `aita-fontend/tests/assignment-documents.test.mjs`
- `aita-fontend/tests/assignment-analysis.test.mjs`
- `aita-fontend/tests/assignment-rubric.test.mjs`

## 2. Phạm vi coding đề xuất

Mỗi mục cần có commit/PR hoặc diff được thành viên xác nhận trước khi chuyển thành báo cáo đóng góp thực tế.

### CODE-01: Phân tích giao diện

- Mục tiêu: Đề xuất luồng màn hình danh sách, chi tiết bài tập và tạo bài cho ba vai trò của AITA; mô tả loading, empty và error.
- Sản phẩm cần bàn giao: Sơ đồ thao tác và danh sách trạng thái giao diện.
- Cách kiểm tra: Đối chiếu màn hình có thật trong src/features và route map.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-02: Tải chi tiết bài tập

- Mục tiêu: Rà soát luồng tải bài theo ID khi người dùng đổi trang nhanh; chỉ ra nguy cơ kết quả cũ ghi đè kết quả mới.
- Sản phẩm cần bàn giao: Đề xuất kiểm soát request và xử lý bài không tồn tại.
- Cách kiểm tra: Đối chiếu load-student-assignment.ts và bài kiểm tra liên quan.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-03: Wizard tạo bài

- Mục tiêu: Đề xuất validation từng bước cho thông tin bài, tài liệu, rubric, test case và xem lại trước khi lưu.
- Sản phẩm cần bàn giao: Checklist trường bắt buộc và thông báo lỗi theo bước.
- Cách kiểm tra: Kiểm tra state khi quay lại bước trước và khi API lưu bị lỗi.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-04: Hiển thị tài liệu

- Mục tiêu: Rà soát cách hiển thị nội dung đề, dấu xuống dòng, mã nguồn và ký tự đặc biệt mà vẫn hạn chế nội dung nguy hiểm.
- Sản phẩm cần bàn giao: Các trường hợp tài liệu cần kiểm tra trực quan.
- Cách kiểm tra: Đối chiếu document-content.ts và test tài liệu; mở trình duyệt để xác nhận layout.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-05: Đồng bộ hạn nộp

- Mục tiêu: Phân tích việc cập nhật deadline, gia hạn cá nhân và đồng hồ đếm ngược khi assignment chưa có dữ liệu.
- Sản phẩm cần bàn giao: Danh sách tình huống null, hết hạn và cập nhật thời gian thực.
- Cách kiểm tra: Đối chiếu useAssignmentSync.ts; kiểm tra không phát sinh lỗi render với dữ liệu thiếu.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-06: Rà soát khả dụng

- Mục tiêu: Tạo checklist dùng bàn phím, focus modal, màn hình nhỏ và trạng thái nút gửi khi đang tải.
- Sản phẩm cần bàn giao: Biên bản kiểm tra khả dụng có ảnh màn hình.
- Cách kiểm tra: Xác nhận trực tiếp trên trình duyệt; unit test không thay thế kiểm tra giao diện.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

## 3. Nhật ký sử dụng AI — các phiên mẫu cần xác nhận

Các prompt sau là gợi ý để thực hiện công việc. Chưa có bằng chứng chúng đã được gửi cho công cụ AI; phần phản hồi không được dựng thành lịch sử hội thoại. Mỗi phiên gắn với một đầu việc ở mục 2.

### AI-01: Phân tích giao diện

- Liên kết công việc: CODE-01.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Sơ đồ thao tác và danh sách trạng thái giao diện.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Đề xuất luồng màn hình danh sách, chi tiết bài tập và tạo bài cho ba vai trò của AITA; mô tả loading, empty và error. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu màn hình có thật trong src/features và route map.
- Đầu ra dự kiến: Sơ đồ thao tác và danh sách trạng thái giao diện.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-02: Tải chi tiết bài tập

- Liên kết công việc: CODE-02.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Đề xuất kiểm soát request và xử lý bài không tồn tại.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Rà soát luồng tải bài theo ID khi người dùng đổi trang nhanh; chỉ ra nguy cơ kết quả cũ ghi đè kết quả mới. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu load-student-assignment.ts và bài kiểm tra liên quan.
- Đầu ra dự kiến: Đề xuất kiểm soát request và xử lý bài không tồn tại.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-03: Wizard tạo bài

- Liên kết công việc: CODE-03.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Checklist trường bắt buộc và thông báo lỗi theo bước.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Đề xuất validation từng bước cho thông tin bài, tài liệu, rubric, test case và xem lại trước khi lưu. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Kiểm tra state khi quay lại bước trước và khi API lưu bị lỗi.
- Đầu ra dự kiến: Checklist trường bắt buộc và thông báo lỗi theo bước.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-04: Hiển thị tài liệu

- Liên kết công việc: CODE-04.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Các trường hợp tài liệu cần kiểm tra trực quan.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Rà soát cách hiển thị nội dung đề, dấu xuống dòng, mã nguồn và ký tự đặc biệt mà vẫn hạn chế nội dung nguy hiểm. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu document-content.ts và test tài liệu; mở trình duyệt để xác nhận layout.
- Đầu ra dự kiến: Các trường hợp tài liệu cần kiểm tra trực quan.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-05: Đồng bộ hạn nộp

- Liên kết công việc: CODE-05.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Danh sách tình huống null, hết hạn và cập nhật thời gian thực.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Phân tích việc cập nhật deadline, gia hạn cá nhân và đồng hồ đếm ngược khi assignment chưa có dữ liệu. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu useAssignmentSync.ts; kiểm tra không phát sinh lỗi render với dữ liệu thiếu.
- Đầu ra dự kiến: Danh sách tình huống null, hết hạn và cập nhật thời gian thực.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-06: Rà soát khả dụng

- Liên kết công việc: CODE-06.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Biên bản kiểm tra khả dụng có ảnh màn hình.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Tạo checklist dùng bàn phím, focus modal, màn hình nhỏ và trạng thái nút gửi khi đang tải. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Xác nhận trực tiếp trên trình duyệt; unit test không thay thế kiểm tra giao diện.
- Đầu ra dự kiến: Biên bản kiểm tra khả dụng có ảnh màn hình.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

## 4. Kịch bản kiểm thử hệ thống

Các ca dưới đây là thiết kế kiểm thử thủ công/tích hợp; **chưa thực thi trong lần biên soạn này**. Kết quả mong đợi là tiêu chí cần kiểm chứng, không phải mô tả kết quả đã đạt. Dùng môi trường và tài khoản thử, không dùng dữ liệu sản xuất.

### TC-QE190037-01: Danh sách có dữ liệu

- Tiền điều kiện/dữ liệu: Sinh viên đã đăng ký lớp có bài tập.
- Các bước: Đăng nhập; mở danh sách; chọn một bài.
- Kết quả mong đợi: Hiển thị đúng bài theo lớp và mở chi tiết đúng ID.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190037-02: Danh sách rỗng

- Tiền điều kiện/dữ liệu: Tài khoản thử không có bài tập.
- Các bước: Mở danh sách bài tập.
- Kết quả mong đợi: Có trạng thái rỗng dễ hiểu và không báo lỗi kỹ thuật.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190037-03: Chuyển bài nhanh

- Tiền điều kiện/dữ liệu: Có hai bài A và B; mạng được làm chậm.
- Các bước: Mở A rồi ngay lập tức mở B.
- Kết quả mong đợi: Nội dung cuối cùng thuộc B; phản hồi muộn của A không ghi đè.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190037-04: Thiếu trường bắt buộc

- Tiền điều kiện/dữ liệu: Giảng viên đang ở wizard tạo bài.
- Các bước: Bỏ trống trường bắt buộc rồi nhấn tiếp/lưu.
- Kết quả mong đợi: Chỉ rõ trường thiếu; dữ liệu đã nhập được giữ lại.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190037-05: Tài liệu có ký tự đặc biệt

- Tiền điều kiện/dữ liệu: Đề chứa tiếng Việt, đoạn code và ký tự < > &.
- Các bước: Mở phần xem tài liệu.
- Kết quả mong đợi: Nội dung đọc được, giữ cấu trúc cần thiết và không thực thi nội dung chèn vào.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190037-06: Hạn nộp chưa tải

- Tiền điều kiện/dữ liệu: Phản hồi assignment bị trì hoãn.
- Các bước: Mở chi tiết và quan sát đồng hồ.
- Kết quả mong đợi: Không crash hoặc hiện NaN; có trạng thái chờ phù hợp.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190037-07: Cập nhật gia hạn

- Tiền điều kiện/dữ liệu: Sinh viên A có gia hạn; B không có.
- Các bước: Mở bài bằng từng tài khoản và cập nhật lại dữ liệu.
- Kết quả mong đợi: Mỗi người thấy hạn hiệu lực đúng của mình.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190037-08: Màn hình nhỏ và bàn phím

- Tiền điều kiện/dữ liệu: Trình duyệt có chế độ mobile và bàn phím.
- Các bước: Mở wizard; chuyển bước bằng Tab; đóng/mở modal.
- Kết quả mong đợi: Nút thao tác tiếp cận được; focus hợp lý; nội dung không che nút chính.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

## 5. Kết quả kiểm tra tự động thực tế dùng chung

Các lệnh sau do Codex thực thi trong lần biên soạn ngày 29/10/2026 trên checkout tham chiếu ở đầu tài liệu. Kết quả được dùng chung cho cả nhóm; không quy cho riêng Dương Anh Đào và không cộng năm bản báo cáo thành năm lượt chạy độc lập.

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

- Bug ID: BUG-QE190037-[số].
- Tiêu đề: [chức năng + lỗi quan sát được].
- Liên kết test case: TC-QE190037-[số].
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
