# Đinh Văn Lợi — QE190167

# Nhật ký sử dụng AI, coding và kiểm thử hệ thống AITA

- Mã thành viên/tên file: `dinhvanloi-qe190167`.
- Dự án: AI-Teaching-Assistant (AITA).
- Ngày biên soạn: 29/10/2026 (Asia/Bangkok).
- Phiên bản mã nguồn tham chiếu: `579c9dfa01ae04ba2a5dcf7569f8ca7d70918abf`.
- Nhóm công việc đề xuất: **Tích hợp hệ thống, backend chấm bài và môi trường chạy**.
- Phạm vi: Luồng nộp bài → hàng đợi chấm → thực thi bài → lưu kết quả → hiển thị tiến độ.

> Đây là hồ sơ khởi tạo theo mã nguồn hiện có. Phân công, prompt và công việc cá nhân bên dưới là đề xuất/mẫu để thành viên xác nhận; không phải lịch sử hoạt động đã được xác minh. Không có dữ liệu hội thoại AI, thời lượng sử dụng, token, chi phí hay xác nhận tác giả cá nhân để điền như sự kiện thực tế. Ảnh tham chiếu chỉ thể hiện danh sách 5 file Markdown, không cung cấp nội dung bên trong.

## 1. Bối cảnh và căn cứ

AITA gồm frontend Next.js/React, backend Express/Prisma và PostgreSQL có pgvector theo README và cấu hình dự án. Các miền chức năng gồm tài khoản, lớp học, bài tập, bài nộp, AI, rubric, chấm bài, thông báo và báo cáo.

Các đường dẫn dưới đây tính từ thư mục gốc dự án, dùng để đối chiếu nội dung; không phải bằng chứng thành viên đã viết các file đó.

- `aita-backend/src/modules/grading/presentation/grading.router.ts`
- `aita-backend/src/modules/submissions/application/ui-grading-policy.ts`
- `aita-backend/src/modules/grading/engine/config/sandbox-policy.ts`
- `scripts/local-runtime.mjs`

Các bộ kiểm tra liên quan có trong dự án:

- `aita-backend/tests/java-sandbox.test.ts`
- `aita-backend/tests/console-runner.docker.test.ts`
- `aita-backend/tests/frontend-runtime.test.ts`
- `scripts/local-runtime.test.mjs`

## 2. Phạm vi coding đề xuất

Mỗi mục cần có commit/PR hoặc diff được thành viên xác nhận trước khi chuyển thành báo cáo đóng góp thực tế.

### CODE-01: Phân tích luồng chấm bài

- Mục tiêu: Vẽ luồng từ thao tác bắt đầu chấm trên UI đến hàng đợi, worker, sandbox và lưu điểm. Chỉ ra nơi kiểm tra quyền, trạng thái và xử lý lỗi.
- Sản phẩm cần bàn giao: Tài liệu luồng xử lý kèm đường dẫn hàm/lớp đã đối chiếu.
- Cách kiểm tra: So khớp router, use case và worker; không suy ra tính năng chỉ từ tên file.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-02: Chính sách bắt đầu chấm

- Mục tiêu: Rà soát cơ chế chỉ bắt đầu chấm từ thao tác hợp lệ của giảng viên; đề xuất cách tránh tạo hai job khi nhấn liên tiếp.
- Sản phẩm cần bàn giao: Danh sách điều kiện đầu vào, trạng thái chuyển đổi và điểm kiểm soát trùng.
- Cách kiểm tra: Đối chiếu ui-grading-policy.ts; kiểm tra thao tác đồng thời bằng dữ liệu thử.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-03: Giới hạn sandbox

- Mục tiêu: Phân tích giới hạn thời gian, bộ nhớ, quyền truy cập và dọn tài nguyên cho bài nộp chạy trong Docker.
- Sản phẩm cần bàn giao: Checklist cấu hình thực thi và tình huống timeout.
- Cách kiểm tra: Đọc sandbox-policy.ts và test tương ứng; không chạy mã không tin cậy trực tiếp trên máy.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-04: Tiến độ chấm bài

- Mục tiêu: Rà soát tiến độ theo submission/session để sự kiện của bài A không xuất hiện trên bài B.
- Sản phẩm cần bàn giao: Đề xuất sửa theo ID và kịch bản chuyển màn hình khi job đang chạy.
- Cách kiểm tra: So sánh thông điệp tiến độ với dữ liệu bài nộp và trạng thái cuối cùng.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-05: Môi trường local

- Mục tiêu: Giải thích cơ chế fingerprint, cache bản dựng và tách cổng local với dev; đề xuất kiểm tra khi đổi cấu hình.
- Sản phẩm cần bàn giao: Hướng dẫn chạy local và xử lý lỗi cổng/bản dựng.
- Cách kiểm tra: Đối chiếu README.md, package.json và kết quả local-runtime.tap.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

### CODE-06: Tổng hợp phát hành

- Mục tiêu: Lập checklist trước bàn giao cho frontend, backend, PostgreSQL, Docker và AI provider; phân biệt kiểm tra đã chạy với chưa chạy.
- Sản phẩm cần bàn giao: Biên bản tích hợp, danh sách điều kiện còn thiếu và bằng chứng.
- Cách kiểm tra: Chỉ đánh dấu đạt khi có log; không lấy unit test làm bằng chứng end-to-end.
- Trạng thái: Đề xuất; chưa xác nhận người thực hiện.
- Commit/PR, ngày thực hiện và người review: [bổ sung bằng chứng thực tế].

## 3. Nhật ký sử dụng AI — các phiên mẫu cần xác nhận

Các prompt sau là gợi ý để thực hiện công việc. Chưa có bằng chứng chúng đã được gửi cho công cụ AI; phần phản hồi không được dựng thành lịch sử hội thoại. Mỗi phiên gắn với một đầu việc ở mục 2.

### AI-01: Phân tích luồng chấm bài

- Liên kết công việc: CODE-01.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Tài liệu luồng xử lý kèm đường dẫn hàm/lớp đã đối chiếu.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Vẽ luồng từ thao tác bắt đầu chấm trên UI đến hàng đợi, worker, sandbox và lưu điểm. Chỉ ra nơi kiểm tra quyền, trạng thái và xử lý lỗi. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: So khớp router, use case và worker; không suy ra tính năng chỉ từ tên file.
- Đầu ra dự kiến: Tài liệu luồng xử lý kèm đường dẫn hàm/lớp đã đối chiếu.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-02: Chính sách bắt đầu chấm

- Liên kết công việc: CODE-02.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Danh sách điều kiện đầu vào, trạng thái chuyển đổi và điểm kiểm soát trùng.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Rà soát cơ chế chỉ bắt đầu chấm từ thao tác hợp lệ của giảng viên; đề xuất cách tránh tạo hai job khi nhấn liên tiếp. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu ui-grading-policy.ts; kiểm tra thao tác đồng thời bằng dữ liệu thử.
- Đầu ra dự kiến: Danh sách điều kiện đầu vào, trạng thái chuyển đổi và điểm kiểm soát trùng.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-03: Giới hạn sandbox

- Liên kết công việc: CODE-03.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Checklist cấu hình thực thi và tình huống timeout.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Phân tích giới hạn thời gian, bộ nhớ, quyền truy cập và dọn tài nguyên cho bài nộp chạy trong Docker. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đọc sandbox-policy.ts và test tương ứng; không chạy mã không tin cậy trực tiếp trên máy.
- Đầu ra dự kiến: Checklist cấu hình thực thi và tình huống timeout.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-04: Tiến độ chấm bài

- Liên kết công việc: CODE-04.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Đề xuất sửa theo ID và kịch bản chuyển màn hình khi job đang chạy.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Rà soát tiến độ theo submission/session để sự kiện của bài A không xuất hiện trên bài B. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: So sánh thông điệp tiến độ với dữ liệu bài nộp và trạng thái cuối cùng.
- Đầu ra dự kiến: Đề xuất sửa theo ID và kịch bản chuyển màn hình khi job đang chạy.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-05: Môi trường local

- Liên kết công việc: CODE-05.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Hướng dẫn chạy local và xử lý lỗi cổng/bản dựng.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Giải thích cơ chế fingerprint, cache bản dựng và tách cổng local với dev; đề xuất kiểm tra khi đổi cấu hình. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Đối chiếu README.md, package.json và kết quả local-runtime.tap.
- Đầu ra dự kiến: Hướng dẫn chạy local và xử lý lỗi cổng/bản dựng.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

### AI-06: Tổng hợp phát hành

- Liên kết công việc: CODE-06.
- Ngày/giờ thực tế: [chưa cung cấp].
- Công cụ và model/version: [điền từ phiên sử dụng thật].
- Mục đích: Biên bản tích hợp, danh sách điều kiện còn thiếu và bằng chứng.
- Dữ liệu đầu vào: yêu cầu đã xác nhận và đoạn mã liên quan trong phạm vi mục 1; loại bỏ khóa API, mật khẩu, token và dữ liệu cá nhân không cần thiết.

**Prompt đề xuất:**

> Trong dự án AI-Teaching-Assistant, Lập checklist trước bàn giao cho frontend, backend, PostgreSQL, Docker và AI provider; phân biệt kiểm tra đã chạy với chưa chạy. Hãy nêu giả định, dẫn đường dẫn mã nguồn cho nhận xét, phân biệt kết luận có bằng chứng với đề xuất và đưa cách kiểm chứng.

**Ghi nhận sau khi sử dụng thật:**

- Phản hồi AI: [dán tóm tắt hoặc liên kết bản xuất hội thoại].
- Đề xuất được sử dụng: [ghi quyết định cụ thể và lý do].
- Đề xuất bị bỏ/chỉnh sửa: [ghi điểm chưa đúng và cách thành viên sửa].
- Kiểm chứng bởi thành viên: Chỉ đánh dấu đạt khi có log; không lấy unit test làm bằng chứng end-to-end.
- Đầu ra dự kiến: Biên bản tích hợp, danh sách điều kiện còn thiếu và bằng chứng.
- Bằng chứng: [hội thoại đã ẩn thông tin nhạy cảm] + [commit/diff] + [log test].
- Token, thời lượng, chi phí: [chỉ điền nếu công cụ cung cấp; hiện chưa có dữ liệu].
- Trạng thái phiên: MẪU — CHƯA XÁC NHẬN ĐÃ SỬ DỤNG.

## 4. Kịch bản kiểm thử hệ thống

Các ca dưới đây là thiết kế kiểm thử thủ công/tích hợp; **chưa thực thi trong lần biên soạn này**. Kết quả mong đợi là tiêu chí cần kiểm chứng, không phải mô tả kết quả đã đạt. Dùng môi trường và tài khoản thử, không dùng dữ liệu sản xuất.

### TC-QE190167-01: Luồng chấm hợp lệ

- Tiền điều kiện/dữ liệu: Giảng viên có quyền, bài nộp hợp lệ, runtime sẵn sàng.
- Các bước: Mở bài nộp; bắt đầu chấm; theo dõi đến trạng thái cuối.
- Kết quả mong đợi: Một phiên chấm được tạo, tiến độ gắn đúng bài và có kết quả hoặc lỗi có giải thích.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190167-02: Nhấn chấm liên tiếp

- Tiền điều kiện/dữ liệu: Cùng bài nộp, cùng tài khoản.
- Các bước: Nhấn nút chấm nhanh hai lần hoặc gửi hai yêu cầu đồng thời.
- Kết quả mong đợi: Không phát sinh hai tác vụ xung đột hoặc ghi đè kết quả không kiểm soát.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190167-03: Chấm bài không thuộc quyền

- Tiền điều kiện/dữ liệu: Tài khoản không có quyền với lớp/bài.
- Các bước: Gửi yêu cầu chấm bằng tài khoản đó.
- Kết quả mong đợi: Yêu cầu bị từ chối; không tạo job và không tiết lộ dữ liệu bài.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190167-04: Bài chạy vô hạn

- Tiền điều kiện/dữ liệu: Sandbox thử nghiệm biệt lập.
- Các bước: Nộp chương trình vòng lặp vô hạn và bắt đầu chấm.
- Kết quả mong đợi: Tác vụ bị dừng theo giới hạn; tài nguyên được thu hồi; có thông báo timeout.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190167-05: Docker không sẵn sàng

- Tiền điều kiện/dữ liệu: Máy thử nghiệm không kết nối được Docker.
- Các bước: Bắt đầu chấm loại bài cần container.
- Kết quả mong đợi: Hiển thị nguyên nhân có thể xử lý; không báo chấm thành công.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190167-06: Chuyển giữa hai bài

- Tiền điều kiện/dữ liệu: Có bài A đang chấm và bài B khác.
- Các bước: Mở A rồi chuyển sang B khi A vẫn phát tiến độ.
- Kết quả mong đợi: B không hiển thị tiến độ hoặc kết quả của A.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190167-07: Đổi cổng local

- Tiền điều kiện/dữ liệu: Có tiến trình đang chiếm cổng thử nghiệm.
- Các bước: Chạy local với cổng đang dùng rồi với một cặp cổng còn trống.
- Kết quả mong đợi: Báo xung đột rõ ràng; cặp cổng hợp lệ khởi động được; không tự tắt tiến trình khác.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

### TC-QE190167-08: Cache bản dựng

- Tiền điều kiện/dữ liệu: Có bản dựng hợp lệ trên môi trường thử.
- Các bước: Chạy lại không đổi code, sau đó đổi một đầu vào ảnh hưởng bản dựng.
- Kết quả mong đợi: Tái sử dụng khi đầu vào giữ nguyên; yêu cầu dựng lại khi đầu vào thay đổi.
- Kết quả thực tế: [chưa chạy].
- Trạng thái: NOT RUN.
- Bằng chứng, môi trường, người chạy, ngày chạy: [bổ sung sau thực thi].

## 5. Kết quả kiểm tra tự động thực tế dùng chung

Các lệnh sau do Codex thực thi trong lần biên soạn ngày 29/10/2026 trên checkout tham chiếu ở đầu tài liệu. Kết quả được dùng chung cho cả nhóm; không quy cho riêng Đinh Văn Lợi và không cộng năm bản báo cáo thành năm lượt chạy độc lập.

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

- Bug ID: BUG-QE190167-[số].
- Tiêu đề: [chức năng + lỗi quan sát được].
- Liên kết test case: TC-QE190167-[số].
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
