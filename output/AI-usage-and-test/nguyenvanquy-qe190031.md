# Nguyễn Văn Quý — QE190031

# Nhật ký sử dụng AI, coding và kiểm thử hệ thống AITA

- Mã thành viên/tên file: `nguyenvanquy-qe190031`.
- Dự án: AI-Teaching-Assistant (AITA).
- Ngày biên soạn: 29/10/2026 (Asia/Bangkok).
- Phiên bản mã nguồn tham chiếu: `579c9dfa01ae04ba2a5dcf7569f8ca7d70918abf`.
- Nhóm công việc đề xuất: **AI, phân tích đề, rubric và RAG**.
- Phạm vi: Trích xuất tài liệu, nhận diện tiêu chí, kiểm tra thang điểm và hỗ trợ truy xuất rubric.

> Đây là hồ sơ khởi tạo theo mã nguồn hiện có. Phân công, prompt và công việc cá nhân bên dưới là đề xuất/mẫu để thành viên xác nhận; không phải lịch sử hoạt động đã được xác minh. Không có dữ liệu hội thoại AI, thời lượng sử dụng, token, chi phí hay xác nhận tác giả cá nhân để điền như sự kiện thực tế. Ảnh tham chiếu chỉ thể hiện danh sách 5 file Markdown, không cung cấp nội dung bên trong.

## 1. Bối cảnh và căn cứ

AITA gồm frontend Next.js/React, backend Express/Prisma và PostgreSQL có pgvector theo README và cấu hình dự án. Các miền chức năng gồm tài khoản, lớp học, bài tập, bài nộp, AI, rubric, chấm bài, thông báo và báo cáo.

Các đường dẫn dưới đây tính từ thư mục gốc dự án, dùng để đối chiếu nội dung; không phải bằng chứng thành viên đã viết các file đó.

- `aita-backend/src/modules/ai/infrastructure/analysis/document-extractor.service.ts`
- `aita-backend/src/modules/ai/infrastructure/analysis/deterministic-parser.service.ts`
- `aita-backend/src/modules/ai/infrastructure/analysis/analysis-validator.service.ts`
- `aita-backend/src/modules/ai/infrastructure/rag/rag-engine.service.ts`

Các bộ kiểm tra liên quan có trong dự án:

- `aita-backend/tests/rubric-score-extraction.test.ts`
- `aita-backend/tests/rag-rubric.test.ts`
- `aita-backend/tests/rag-pipeline.test.ts`
- `aita-fontend/tests/rubric-points.test.mjs`

## 2. Phạm vi coding đề xuất

Mỗi mục cần có commit/PR hoặc diff được thành viên xác nhận trước khi chuyển thành báo cáo đóng góp thực tế.

### CODE-01: Phân tích pipeline AI

- Mục tiêu: Mô tả pipeline đọc tài liệu, chuẩn hóa văn bản, trích xuất yêu cầu, tạo rubric, validation và người dùng duyệt kết quả.
- Sản phẩm cần bàn giao: Tài liệu đầu vào/đầu ra của từng bước.
- Cách kiểm tra: Đối chiếu service và contract; phân biệt parse xác định với suy luận bằng mô hình.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-02: Trích xuất điểm rubric

- Mục tiêu: Đề xuất cách phân biệt tiêu chí chấm, dòng tổng điểm, tiêu đề đánh số và quy định phạt muộn trong đề tiếng Việt.
- Sản phẩm cần bàn giao: Bộ ví dụ biên và quy tắc kiểm tra tổng điểm.
- Cách kiểm tra: Kiểm tra fixture thật; giữ nguyên điểm gốc khi tổng không khớp và yêu cầu người dùng xem lại.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-03: Kiểm tra đầu ra AI

- Mục tiêu: Rà soát schema đầu ra: trường bắt buộc, số điểm hữu hạn, tổng điểm, nguồn tiêu chí và dấu hiệu cần review.
- Sản phẩm cần bàn giao: Checklist validation và thông báo khi đầu ra không hợp lệ.
- Cách kiểm tra: Đối chiếu analysis-validator.service.ts và assignment-contract.ts.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-04: Truy xuất RAG

- Mục tiêu: Giải thích quy trình truy xuất rubric theo ngữ cảnh môn học; đề xuất kiểm tra khi không có kết quả liên quan.
- Sản phẩm cần bàn giao: Tiêu chí đánh giá độ liên quan và phương án fallback.
- Cách kiểm tra: Kiểm tra truy vấn, bộ lọc và bằng chứng nguồn; không khẳng định độ chính xác khi chưa đánh giá.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-05: Prompt injection trong đề

- Mục tiêu: Tạo bộ tình huống tài liệu chứa câu yêu cầu bỏ qua quy tắc, lộ cấu hình hoặc tự nâng điểm.
- Sản phẩm cần bàn giao: Dữ liệu thử vô hại và yêu cầu cô lập nội dung tài liệu.
- Cách kiểm tra: Đối chiếu prompt-guard.service.ts; không đưa bí mật thật vào dữ liệu thử.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-06: Lỗi dịch vụ AI

- Mục tiêu: Đề xuất xử lý timeout, giới hạn lượt gọi, phản hồi rỗng và JSON lỗi mà không làm mất nội dung giảng viên nhập.
- Sản phẩm cần bàn giao: Danh sách trạng thái lỗi, retry và thông tin cần ghi log.
- Cách kiểm tra: Dùng mock hoặc tài khoản thử; không ghi API key hay nội dung nhạy cảm vào log.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

## 3. Nhật ký sử dụng AI — các phiên mẫu cần xác nhận

Các prompt sau là gợi ý để thực hiện công việc. Chưa có bằng chứng chúng đã được gửi cho công cụ AI; phần phản hồi không được dựng thành lịch sử hội thoại. Mỗi phiên gắn với một đầu việc ở mục 2.

### AI-01: Phân tích pipeline AI

- Liên kết công việc: CODE-01.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Tài liệu đầu vào/đầu ra của từng bước.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Mô tả pipeline đọc tài liệu, chuẩn hóa văn bản, trích xuất yêu cầu, tạo rubric, validation và người dùng duyệt kết quả. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu service và contract; phân biệt parse xác định với suy luận bằng mô hình.
- Đầu ra dự kiến: Tài liệu đầu vào/đầu ra của từng bước.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-02: Trích xuất điểm rubric

- Liên kết công việc: CODE-02.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Bộ ví dụ biên và quy tắc kiểm tra tổng điểm.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Đề xuất cách phân biệt tiêu chí chấm, dòng tổng điểm, tiêu đề đánh số và quy định phạt muộn trong đề tiếng Việt. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Kiểm tra fixture thật; giữ nguyên điểm gốc khi tổng không khớp và yêu cầu người dùng xem lại.
- Đầu ra dự kiến: Bộ ví dụ biên và quy tắc kiểm tra tổng điểm.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-03: Kiểm tra đầu ra AI

- Liên kết công việc: CODE-03.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Checklist validation và thông báo khi đầu ra không hợp lệ.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Rà soát schema đầu ra: trường bắt buộc, số điểm hữu hạn, tổng điểm, nguồn tiêu chí và dấu hiệu cần review. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu analysis-validator.service.ts và assignment-contract.ts.
- Đầu ra dự kiến: Checklist validation và thông báo khi đầu ra không hợp lệ.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-04: Truy xuất RAG

- Liên kết công việc: CODE-04.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Tiêu chí đánh giá độ liên quan và phương án fallback.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Giải thích quy trình truy xuất rubric theo ngữ cảnh môn học; đề xuất kiểm tra khi không có kết quả liên quan. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Kiểm tra truy vấn, bộ lọc và bằng chứng nguồn; không khẳng định độ chính xác khi chưa đánh giá.
- Đầu ra dự kiến: Tiêu chí đánh giá độ liên quan và phương án fallback.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-05: Prompt injection trong đề

- Liên kết công việc: CODE-05.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Dữ liệu thử vô hại và yêu cầu cô lập nội dung tài liệu.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Tạo bộ tình huống tài liệu chứa câu yêu cầu bỏ qua quy tắc, lộ cấu hình hoặc tự nâng điểm. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu prompt-guard.service.ts; không đưa bí mật thật vào dữ liệu thử.
- Đầu ra dự kiến: Dữ liệu thử vô hại và yêu cầu cô lập nội dung tài liệu.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-06: Lỗi dịch vụ AI

- Liên kết công việc: CODE-06.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Danh sách trạng thái lỗi, retry và thông tin cần ghi log.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Đề xuất xử lý timeout, giới hạn lượt gọi, phản hồi rỗng và JSON lỗi mà không làm mất nội dung giảng viên nhập. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Dùng mock hoặc tài khoản thử; không ghi API key hay nội dung nhạy cảm vào log.
- Đầu ra dự kiến: Danh sách trạng thái lỗi, retry và thông tin cần ghi log.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

## 4. Kịch bản kiểm thử hệ thống

Các ca dưới đây là thiết kế kiểm thử thủ công/tích hợp; **chưa thực thi trong lần biên soạn này**. Kết quả mong đợi là tiêu chí cần kiểm chứng, không phải mô tả kết quả đã đạt. Dùng môi trường và tài khoản thử, không dùng dữ liệu sản xuất.

### TC-QE190031-01: Rubric đủ 10 điểm

- Tiền điều kiện/dữ liệu: Đề có 5 tiêu chí, mỗi tiêu chí 2 điểm.
- Các bước: Phân tích đề; xem các tiêu chí và tổng điểm.
- Kết quả mong đợi: Có đúng 5 tiêu chí; tổng 10; dòng tổng không thành tiêu chí riêng.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190031-02: Tổng điểm không khớp

- Tiền điều kiện/dữ liệu: Đề ghi tổng 10 nhưng tiêu chí cộng lại bằng 5.
- Các bước: Phân tích và xem cảnh báo.
- Kết quả mong đợi: Giữ điểm được trích xuất và báo lệch; không âm thầm chuẩn hóa thành 10.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190031-03: Tiêu đề và phạt muộn

- Tiền điều kiện/dữ liệu: Đề có tiêu đề đánh số và mục phạt nộp muộn.
- Các bước: Trích xuất rubric từ đề.
- Kết quả mong đợi: Không tính tiêu đề hoặc quy định phạt thành tiêu chí nội dung.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190031-04: Bảng rubric

- Tiền điều kiện/dữ liệu: Đề có bảng STT, tiêu chí, điểm và dòng tổng.
- Các bước: Phân tích tài liệu.
- Kết quả mong đợi: Giữ đúng tên, điểm thành phần và bằng chứng; bỏ dòng tổng khỏi danh sách tiêu chí.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190031-05: Ngắt trang PDF

- Tiền điều kiện/dữ liệu: Fixture chứa dấu phân trang chen giữa output mẫu.
- Các bước: Trích xuất test case và expected output.
- Kết quả mong đợi: Không đưa dấu phân trang tổng hợp vào expected output.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190031-06: Nội dung chỉ dẫn độc hại

- Tiền điều kiện/dữ liệu: Đề thử có câu yêu cầu bỏ qua quy tắc hoặc nâng điểm.
- Các bước: Gửi phân tích trên môi trường thử.
- Kết quả mong đợi: Nội dung được xử lý như dữ liệu; không lộ cấu hình và không nâng điểm theo chỉ dẫn trong đề.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190031-07: AI trả JSON sai

- Tiền điều kiện/dữ liệu: Mock provider trả JSON thiếu trường hoặc không hợp lệ.
- Các bước: Gọi phân tích và xem phản hồi.
- Kết quả mong đợi: Validation phát hiện lỗi; không lưu kết quả sai như bản hoàn chỉnh.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190031-08: RAG không có nguồn phù hợp

- Tiền điều kiện/dữ liệu: Kho thử không có rubric liên quan.
- Các bước: Truy xuất và phân tích kết quả.
- Kết quả mong đợi: Có xử lý thiếu nguồn rõ ràng; không gán tài liệu không liên quan làm bằng chứng.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

## 5. Kết quả kiểm tra tự động thực tế dùng chung

Các lệnh sau do Codex thực thi trong lần biên soạn ngày 29/10/2026 trên checkout tham chiếu ở đầu tài liệu. Kết quả được dùng chung cho cả nhóm; không quy cho riêng Nguyễn Văn Quý và không cộng năm bản báo cáo thành năm lượt chạy độc lập.

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

- Bug ID: BUG-QE190031-[số].
- Tiêu đề: [chức năng + lỗi quan sát được].
- Liên kết test case: TC-QE190031-[số].
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
