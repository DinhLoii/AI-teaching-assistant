# Nguyễn Quân Sơn — QE190121

# Nhật ký sử dụng AI, coding và kiểm thử hệ thống AITA

- Mã thành viên/tên file: `nguyenquanson-qe190121`.
- Dự án: AI-Teaching-Assistant (AITA).
- Ngày biên soạn: 29/10/2026 (Asia/Bangkok).
- Phiên bản mã nguồn tham chiếu: `579c9dfa01ae04ba2a5dcf7569f8ca7d70918abf`.
- Nhóm công việc đề xuất: **Kiểm thử, báo cáo, thông báo và kiểm tra hồi quy**.
- Phạm vi: Kịch bản xuyên suốt, báo cáo điểm, thông báo cá nhân và tổng hợp bằng chứng kiểm thử.

> Đây là hồ sơ khởi tạo theo mã nguồn hiện có. Phân công, prompt và công việc cá nhân bên dưới là đề xuất/mẫu để thành viên xác nhận; không phải lịch sử hoạt động đã được xác minh. Không có dữ liệu hội thoại AI, thời lượng sử dụng, token, chi phí hay xác nhận tác giả cá nhân để điền như sự kiện thực tế. Ảnh tham chiếu chỉ thể hiện danh sách 5 file Markdown, không cung cấp nội dung bên trong.

## 1. Bối cảnh và căn cứ

AITA gồm frontend Next.js/React, backend Express/Prisma và PostgreSQL có pgvector theo README và cấu hình dự án. Các miền chức năng gồm tài khoản, lớp học, bài tập, bài nộp, AI, rubric, chấm bài, thông báo và báo cáo.

Các đường dẫn dưới đây tính từ thư mục gốc dự án, dùng để đối chiếu nội dung; không phải bằng chứng thành viên đã viết các file đó.

- `aita-backend/src/modules/reports/application/report-range.ts`
- `aita-backend/src/modules/stats/application/use-cases/stats.use-case.ts`
- `aita-backend/src/modules/notifications/presentation/notifications.controller.ts`
- `aita-fontend/src/lib/notifications/feed.ts`

Các bộ kiểm tra liên quan có trong dự án:

- `aita-fontend/tests/analytics-range.test.mjs`
- `aita-fontend/tests/notifications.test.mjs`
- `aita-fontend/tests/grading-log.test.mjs`
- `aita-backend/tests/notification-timestamps.test.ts`

## 2. Phạm vi coding đề xuất

Mỗi mục cần có commit/PR hoặc diff được thành viên xác nhận trước khi chuyển thành báo cáo đóng góp thực tế.

### CODE-01: Thiết kế kiểm thử

- Mục tiêu: Tạo chiến lược kiểm thử AITA theo rủi ro cho auth, bài tập, nộp bài, AI, chấm điểm và báo cáo.
- Sản phẩm cần bàn giao: Danh sách mức kiểm thử, dữ liệu cần dùng và tiêu chí kết thúc.
- Cách kiểm tra: Gắn từng test với yêu cầu cụ thể; phân biệt test tự động, thủ công và E2E.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-02: Báo cáo theo thời gian

- Mục tiêu: Đề xuất dữ liệu biên cho lọc ngày, khoảng rỗng, cuối ngày và múi giờ Asia/Bangkok.
- Sản phẩm cần bàn giao: Bộ kỳ vọng thống kê được tính từ dữ liệu thử cố định.
- Cách kiểm tra: Đối chiếu report-range.ts và analytics-range.test.mjs; không lấy số trên UI làm nguồn duy nhất.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-03: Thông báo cá nhân

- Mục tiêu: Rà soát đọc/chưa đọc, phân trang, realtime và trường hợp sự kiện bị gửi lại.
- Sản phẩm cần bàn giao: Kịch bản chống trùng và kiểm tra phạm vi người nhận.
- Cách kiểm tra: Đối chiếu feed.ts và backend; kiểm tra bằng hai tài khoản độc lập.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-04: Đối soát kết quả

- Mục tiêu: Lập checklist đối chiếu điểm tổng, điểm rubric, trạng thái công bố và nội dung sinh viên xem được.
- Sản phẩm cần bàn giao: Biên bản đối soát giao diện với dữ liệu API được phép truy cập.
- Cách kiểm tra: Chọn bài thử biết trước điểm; xác minh cả trước và sau công bố.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-05: Ghi bug report

- Mục tiêu: Tạo mẫu bug gồm môi trường, bước tái hiện, expected, actual, bằng chứng, mức độ và kết quả retest.
- Sản phẩm cần bàn giao: Bug report có thể giao lại cho người phát triển.
- Cách kiểm tra: Không ghi bug là đã xác nhận khi mới chỉ là giả thuyết từ AI.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-06: Tổng hợp hồi quy

- Mục tiêu: Hướng dẫn đọc TAP để phân biệt pass, fail, skipped và phạm vi test; đề xuất tiêu chí bàn giao.
- Sản phẩm cần bàn giao: Báo cáo tổng hợp giữ nguyên số liệu và giới hạn kiểm chứng.
- Cách kiểm tra: Đối chiếu log evidence; trường hợp skip cần giải thích, không cộng vào pass.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

## 3. Nhật ký sử dụng AI — các phiên mẫu cần xác nhận

Các prompt sau là gợi ý để thực hiện công việc. Chưa có bằng chứng chúng đã được gửi cho công cụ AI; phần phản hồi không được dựng thành lịch sử hội thoại. Mỗi phiên gắn với một đầu việc ở mục 2.

### AI-01: Thiết kế kiểm thử

- Liên kết công việc: CODE-01.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Danh sách mức kiểm thử, dữ liệu cần dùng và tiêu chí kết thúc.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Tạo chiến lược kiểm thử AITA theo rủi ro cho auth, bài tập, nộp bài, AI, chấm điểm và báo cáo. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Gắn từng test với yêu cầu cụ thể; phân biệt test tự động, thủ công và E2E.
- Đầu ra dự kiến: Danh sách mức kiểm thử, dữ liệu cần dùng và tiêu chí kết thúc.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-02: Báo cáo theo thời gian

- Liên kết công việc: CODE-02.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Bộ kỳ vọng thống kê được tính từ dữ liệu thử cố định.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Đề xuất dữ liệu biên cho lọc ngày, khoảng rỗng, cuối ngày và múi giờ Asia/Bangkok. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu report-range.ts và analytics-range.test.mjs; không lấy số trên UI làm nguồn duy nhất.
- Đầu ra dự kiến: Bộ kỳ vọng thống kê được tính từ dữ liệu thử cố định.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-03: Thông báo cá nhân

- Liên kết công việc: CODE-03.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Kịch bản chống trùng và kiểm tra phạm vi người nhận.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Rà soát đọc/chưa đọc, phân trang, realtime và trường hợp sự kiện bị gửi lại. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu feed.ts và backend; kiểm tra bằng hai tài khoản độc lập.
- Đầu ra dự kiến: Kịch bản chống trùng và kiểm tra phạm vi người nhận.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-04: Đối soát kết quả

- Liên kết công việc: CODE-04.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Biên bản đối soát giao diện với dữ liệu API được phép truy cập.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Lập checklist đối chiếu điểm tổng, điểm rubric, trạng thái công bố và nội dung sinh viên xem được. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Chọn bài thử biết trước điểm; xác minh cả trước và sau công bố.
- Đầu ra dự kiến: Biên bản đối soát giao diện với dữ liệu API được phép truy cập.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-05: Ghi bug report

- Liên kết công việc: CODE-05.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Bug report có thể giao lại cho người phát triển.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Tạo mẫu bug gồm môi trường, bước tái hiện, expected, actual, bằng chứng, mức độ và kết quả retest. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Không ghi bug là đã xác nhận khi mới chỉ là giả thuyết từ AI.
- Đầu ra dự kiến: Bug report có thể giao lại cho người phát triển.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-06: Tổng hợp hồi quy

- Liên kết công việc: CODE-06.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Báo cáo tổng hợp giữ nguyên số liệu và giới hạn kiểm chứng.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Hướng dẫn đọc TAP để phân biệt pass, fail, skipped và phạm vi test; đề xuất tiêu chí bàn giao. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu log evidence; trường hợp skip cần giải thích, không cộng vào pass.
- Đầu ra dự kiến: Báo cáo tổng hợp giữ nguyên số liệu và giới hạn kiểm chứng.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

## 4. Kịch bản kiểm thử hệ thống

Các ca dưới đây là thiết kế kiểm thử thủ công/tích hợp; **chưa thực thi trong lần biên soạn này**. Kết quả mong đợi là tiêu chí cần kiểm chứng, không phải mô tả kết quả đã đạt. Dùng môi trường và tài khoản thử, không dùng dữ liệu sản xuất.

### TC-QE190121-01: Kịch bản xuyên suốt

- Tiền điều kiện/dữ liệu: Dữ liệu lớp thử, tài khoản giảng viên/sinh viên, runtime sẵn sàng.
- Các bước: Tạo bài; sinh viên nộp; giảng viên chấm và công bố; sinh viên xem kết quả.
- Kết quả mong đợi: Dữ liệu xuyên suốt đúng bài và đúng người; điểm và trạng thái nhất quán.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190121-02: Lọc báo cáo theo khoảng

- Tiền điều kiện/dữ liệu: Có dữ liệu thử ở trước, trong và sau khoảng chọn.
- Các bước: Chọn khoảng ngày và tải báo cáo.
- Kết quả mong đợi: Chỉ thống kê dữ liệu trong khoảng theo quy tắc đã xác nhận.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190121-03: Khoảng không có dữ liệu

- Tiền điều kiện/dữ liệu: Chọn khoảng ngày không có bản ghi.
- Các bước: Mở dashboard/báo cáo.
- Kết quả mong đợi: Có trạng thái rỗng; không hiển thị số cũ hoặc NaN.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190121-04: Biên múi giờ

- Tiền điều kiện/dữ liệu: Có bản ghi gần 00:00 theo Asia/Bangkok.
- Các bước: Lọc ngày liền trước và ngày chứa bản ghi.
- Kết quả mong đợi: Bản ghi được tính vào đúng ngày; không bị tính hai lần.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190121-05: Thông báo đúng người nhận

- Tiền điều kiện/dữ liệu: Hai sinh viên A và B.
- Các bước: Tạo một sự kiện riêng cho A; mở tài khoản A/B.
- Kết quả mong đợi: A nhận được thông báo; B không thấy nội dung riêng của A.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190121-06: Đọc và chống trùng

- Tiền điều kiện/dữ liệu: Một thông báo chưa đọc và một sự kiện bị phát lại.
- Các bước: Đánh dấu đọc; tải lại; nhận lại sự kiện.
- Kết quả mong đợi: Trạng thái đọc nhất quán; không nhân đôi cùng thông báo.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190121-07: Điểm trước công bố

- Tiền điều kiện/dữ liệu: Có bài chấm xong nhưng chưa công bố.
- Các bước: Mở kết quả bằng vai trò sinh viên rồi công bố bằng giảng viên.
- Kết quả mong đợi: Trước/sau công bố tuân thủ chính sách hiển thị; không lộ dữ liệu ngoài quyền.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190121-08: Kiểm tra hồi quy sau sửa lỗi

- Tiền điều kiện/dữ liệu: Có bug đã tái hiện và bản sửa cụ thể.
- Các bước: Chạy lại bước bug và những luồng chịu ảnh hưởng.
- Kết quả mong đợi: Ghi kết quả thực tế, phiên bản và bằng chứng; chỉ đóng bug khi retest đạt.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

## 5. Kết quả kiểm tra tự động thực tế dùng chung

Các lệnh sau do Codex thực thi trong lần biên soạn ngày 29/10/2026 trên checkout tham chiếu ở đầu tài liệu. Kết quả được dùng chung cho cả nhóm; không quy cho riêng Nguyễn Quân Sơn và không cộng năm bản báo cáo thành năm lượt chạy độc lập.

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

- Bug ID: BUG-QE190121-[số].
- Tiêu đề: [chức năng + lỗi quan sát được].
- Liên kết test case: TC-QE190121-[số].
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
