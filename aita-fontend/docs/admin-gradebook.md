# Quản lý điểm của admin

Truy cập `/admin/gradebook` hoặc **Quản lý điểm** trong menu Đào tạo.
Trang chi tiết lớp có nút **Bảng điểm học phần** mở đúng học phần tương ứng.

## Phạm vi dữ liệu

- Chọn học kỳ bằng `Semester.Id` (không chỉ tên mùa), sau đó mã lớp trong kỳ,
  cuối cùng học phần `Class.Id`. Cùng mã lớp có thể có nhiều môn trong cùng kỳ.
- Mỗi học phần hiện có một môn và một học kỳ. Không thay đổi mô hình lớp cũ.
- Chỉ lấy bài đánh giá được giao qua `ExamClass`, còn tồn tại và khớp môn học;
  sinh viên từ danh sách ghi danh của lớp.
- Một ô điểm là lần nộp hiện hành của đúng sinh viên/bài/lớp. Ưu tiên
  `IsLatest=true`, hỗ trợ dữ liệu cũ chưa đặt cờ bằng thứ tự lần nộp và ngày nộp.
- `—` là chưa có điểm, không quy đổi thành 0. Điểm 0 là điểm hợp lệ.

## Quy tắc nghiệp vụ

- Admin sửa điểm cuối cùng và nhận xét của bài đã chấm xong, theo thang điểm
  `Exam.TotalPoints`, tối đa 2 chữ số thập phân. Giữ điểm gốc, điểm trừ và báo cáo AI.
- Lý do điều chỉnh/công bố/thu hồi bắt buộc từ 5 đến 2.000 ký tự.
- Công bố/thu hồi hàng loạt áp dụng sinh viên đã chọn và bài theo bộ lọc,
  tối đa 200 bài/lần. Chỉ thay đổi trạng thái các bài đủ điều kiện.
- Điểm tổng hợp thang 10 = tổng `(điểm bài / thang điểm × trọng số / 100) × 10`.
  Chỉ tính khi tổng trọng số 100% và đủ điểm hợp lệ cho các bài có trọng số > 0.
  Cột tổng hợp bao gồm điểm nháp; tổng hợp đã công bố chỉ dùng điểm đã công bố.
  Không suy diễn điều kiện đậu/rớt hoặc điểm tổng kết chính thức của trường.
- Trọng số riêng của học phần được lưu tại `SystemConfig`, khóa
  `gradebook_weights:<Class.Id>`, giá trị JSON `{ "<Exam.Id>": percentage }`.
  Khi chưa có cấu hình riêng, dùng `Exam.WeightPercentage`. Nếu thêm bài mới,
  phải cấu hình lại trọng số; không tự chia đều. Không cần migration.
- Xuất Excel phản ánh các sinh viên và cột bài đang hiển thị, kèm ngữ cảnh kỳ,
  lớp, môn, thang điểm, trọng số và trạng thái công bố.

## API và bảo toàn dữ liệu

- `GET /api/classes/gradebook/catalog`: các kỳ và học phần.
- `GET /api/classes/:id/gradebook`: bảng điểm học phần, phiên bản điểm/trọng số.
- `GET /api/classes/:id/gradebook/:submissionId/history`: 100 điều chỉnh quản trị gần nhất.
- `PATCH /api/classes/:id/gradebook`: `{ reason, changes: [{ submissionId, revision, finalScore?, feedback?, published? }] }`.
- `PUT /api/classes/:id/gradebook/weights`: `{ reason, revision, weights: [{ examId, weight }] }`.

Tất cả endpoint yêu cầu admin ở middleware và service. Mutation khóa bản ghi,
kiểm tra phiên bản và ghi điểm, audit, thông báo trong một transaction. Xung đột
trả 409 và hủy toàn bộ thay đổi trong lô. Thông báo thời gian thực gửi sau commit.
Audit lưu người thực hiện, thời gian, IP, lý do và trước/sau; trọng số có audit riêng.
Các cache điểm/sinh viên/thống kê được vô hiệu hóa sau lưu.

Điểm nháp/thu hồi được ẩn tại các thẻ bài tập và tổng hợp trang sinh viên;
API sửa điểm cũ cũng kiểm tra quyền và phạm vi giảng viên.

## Kiểm chứng

- Backend: `npm test` (bao gồm `tests/admin-gradebook.test.ts`).
- Frontend: `npm test`, `npm run typecheck`, `npm run check:structure`.
- Browser: `node tests/admin-gradebook.browser.cjs` khi frontend phục vụ cổng 5174;
  có thể đặt `TEST_BASE_URL`. Dùng dữ liệu API giả lập, không sửa điểm thật.
  Kiểm tra liên kết trực tiếp, bộ lọc phụ thuộc, điểm 0, sửa điểm/lịch sử,
  xung đột, công bố hàng loạt, trọng số, nội dung Excel, màn hình nhỏ và lỗi JS.
  Ảnh kiểm chứng nằm trong `output/gradebook-qa/` ở thư mục repository.
