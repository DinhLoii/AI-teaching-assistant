# AITA Phần bổ sung demo web

Tám slide riêng, ghép theo từng flow của bộ gốc. Mỗi flow gồm hai chặng. Dữ liệu và thời gian chờ là gợi ý chuẩn bị, chưa phải biên bản chạy demo.


## 01 FLOW 1 · TẠO LỚP TRÊN WEB

Đường dẫn: /login → /admin/users → /admin/classes

Chuẩn bị: Admin, Lecturer và Student thử nghiệm đã tồn tại; môn/học kỳ đã có. AITA-DEMO chỉ là tên gợi ý.

### Thao tác
1. **Đăng nhập Admin** — Mở /login bằng phiên Admin; kiểm tra đúng vai trò trên giao diện.
2. **Kiểm tra tài khoản demo** — Vào /admin/users; tìm giảng viên và sinh viên sẽ dùng xuyên suốt.
3. **Mở form tạo lớp** — Vào /admin/classes → “Mở lớp mới”; nhập mã lớp chưa trùng.
4. **Chọn dữ liệu và lưu** — Chọn học kỳ, môn, giảng viên → “Lưu lớp học”; tìm lớp vừa tạo.

### Lời dẫn
Em đăng nhập bằng tài khoản quản trị viên trong một hồ sơ trình duyệt riêng. Trước khi tạo lớp, em tìm hai tài khoản demo để xác định đúng giảng viên và sinh viên. Tiếp theo, em mở mục lớp học và bấm Mở lớp mới. Em dùng mã lớp AITA-DEMO nếu mã này chưa tồn tại, rồi chọn học kỳ, môn học và giảng viên từ dữ liệu đang có. Sau khi lưu, em tìm lại lớp trong danh sách để chứng minh bản ghi đã được tạo. Nếu lớp demo đã có sẵn, em mở Chỉnh sửa thay vì tạo thêm lớp trùng.

### Kiểm tra
Mã lớp, môn, học kỳ và giảng viên phải khớp dữ liệu đã chọn. Tải lại danh sách trước khi tiếp tục.

## 02 FLOW 1 · THÀNH VIÊN VÀ PHÂN QUYỀN

Đường dẫn: /admin/classes/:id → /lecturer/classes → /student/classes

Chuẩn bị: Giữ ba phiên riêng, không đăng nhập đổi vai trò trong cùng một tab. :id là ID thật lấy khi mở lớp.

### Thao tác
1. **Mở chi tiết lớp** — Chọn lớp vừa lưu; chỉ vào thông tin môn và giảng viên phụ trách.
2. **Thêm sinh viên** — Bấm “Thêm sinh viên vào lớp”; chọn tài khoản demo và xác nhận.
3. **Đối chiếu phiên Lecturer** — Đổi sang phiên giảng viên → /lecturer/classes; mở đúng lớp.
4. **Đối chiếu phiên Student** — Đổi sang phiên sinh viên → /student/classes; kiểm tra cùng lớp.

### Lời dẫn
Ở chi tiết lớp, em chỉ cho thầy cô thấy môn học, giảng viên phụ trách và danh sách sinh viên. Em bấm Thêm sinh viên vào lớp, chọn đúng sinh viên thử nghiệm rồi xác nhận. Sau đó em tải lại trang để kiểm tra tên sinh viên vẫn còn trong danh sách. Em chuyển sang hồ sơ trình duyệt của giảng viên để mở danh sách lớp và tìm lớp vừa được phân công. Cuối cùng, em chuyển sang hồ sơ sinh viên và mở cùng lớp. Ba màn hình này thể hiện dữ liệu đã liên kết giữa quản trị, giảng viên và sinh viên. Em giữ nguyên lớp này cho các flow tiếp theo.

### Kiểm tra
Sinh viên xuất hiện trong danh sách thành viên; Lecturer và Student thấy cùng mã lớp sau khi tải lại.

## 03 FLOW 2 · SOẠN BÀI VÀ LƯU NHÁP

Đường dẫn: /lecturer/grading/assignments → Tạo bài tập mới

Chuẩn bị: Chuẩn bị mô tả ngắn và ZIP tương ứng. Điền các trường bắt buộc của wizard trước khi lưu.

### Thao tác
1. **Mở danh sách bài tập** — Trong phiên Lecturer, mở /lecturer/grading/assignments.
2. **Tạo bài tập mới** — Bấm “Tạo bài tập mới”; nhập tên bài, chọn lớp demo.
3. **Nhập yêu cầu và hạn nộp** — Nhập mô tả, ngôn ngữ và hạn còn hiệu lực; dùng dữ liệu đã chuẩn bị.
4. **Lưu bản nháp** — Đi tiếp cấu hình chấm; bấm “Lưu bản nháp”, mở workspace của bài.

### Lời dẫn
Em bắt đầu từ danh sách bài tập của giảng viên, bấm Tạo bài tập mới và chọn đúng lớp vừa chuẩn bị ở flow 1. Em đặt tên bài dễ nhận biết, chẳng hạn Demo quản lý danh sách sinh viên, rồi nhập mô tả và hạn nộp còn hiệu lực. Ngôn ngữ và cấu hình chạy phải phù hợp với ZIP sẽ dùng ở flow 3. Em tiếp tục sang phần cấu hình chấm và lưu bản nháp. Ở bước này em chưa giao bài ngay, vì cần rà soát rubric trước. Sau khi lưu, em mở workspace để kiểm tra bài vẫn ở trạng thái Bản nháp và thông tin đã nhập còn đầy đủ.

### Kiểm tra
Mở lại workspace: đúng tên bài, lớp, hạn nộp và trạng thái Bản nháp. Ghi lại ID/đường dẫn bài để mở ở phiên khác.

## 04 FLOW 2 · RUBRIC VÀ GIAO BÀI

Đường dẫn: /lecturer/grading/assignments/:id → tab AI Rubric

Chuẩn bị: Cấu hình AI hợp lệ; chuẩn bị rubric đã lưu nếu dịch vụ phản hồi chậm. Nếu dùng dữ liệu chuẩn bị trước, nói rõ khi trình bày.

### Thao tác
1. **Mở AI Rubric** — Trong workspace → “AI Rubric”; nhập chủ đề, độ khó, tổng điểm 10.
2. **Sinh và sửa tiêu chí** — Bấm “Generate rubric with AI”; đọc tiêu chí, điều chỉnh điểm nếu cần.
3. **Lưu và giao bài** — Bấm “Save Rubric” → kiểm tra tổng điểm → “Giao bài cho sinh viên”.
4. **Đối chiếu phía Student** — Mở /student/assignments, tìm bài vừa giao và kiểm tra chi tiết đề.

### Lời dẫn
Trong workspace, em mở tab AI Rubric để tạo bộ tiêu chí cho đề bài. Em nhập chủ đề, độ khó và tổng điểm 10 rồi yêu cầu AI sinh rubric. Khi kết quả trả về, em đọc từng tiêu chí, kiểm tra điểm tối đa và sửa những nội dung chưa phù hợp. AI chỉ hỗ trợ đề xuất; giảng viên vẫn kiểm soát rubric sử dụng. Sau khi lưu rubric và kiểm tra tổng điểm, em bấm Giao bài cho sinh viên. Em kiểm tra trạng thái Đã giao rồi chuyển sang phiên sinh viên, tải lại danh sách bài tập và mở bài vừa công bố. Đây là điểm kết nối giữa thao tác tạo bài và hành trình nộp bài.

### Kiểm tra
Rubric vẫn có sau tải lại; tổng điểm đúng; Student mở được bài đã giao. Không đánh đồng rubric đã sinh với bài đã được chấm.

## 05 FLOW 3 · CHỌN BÀI VÀ TẢI ZIP

Đường dẫn: /student/assignments → /student/assignments/:id

Chuẩn bị: ZIP hợp lệ, cấu trúc thư mục phù hợp ngôn ngữ bài. Sinh viên chưa có bài nộp để xuất hiện nhánh Nộp bài ban đầu.

### Thao tác
1. **Chọn đúng bài được giao** — Trong phiên Student, mở danh sách và chọn bài của lớp demo.
2. **Đọc thông tin chi tiết** — Chỉ vào tên bài, yêu cầu, rubric và hạn nộp trước khi tải tệp.
3. **Mở form nộp bài** — Bấm “Nộp bài”; chọn hoặc kéo thả ZIP thử nghiệm đã chuẩn bị.
4. **Kiểm tra tệp trước khi gửi** — Đọc lại tên ZIP trên màn hình; bấm “Xác nhận nộp tệp này”.

### Lời dẫn
Em chuyển sang phiên sinh viên và tìm bài tập vừa được giao ở flow 2. Trước khi nộp, em mở chi tiết để đọc yêu cầu, hạn nộp và tiêu chí chấm. Em chỉ cho thầy cô thấy sinh viên có thể đối chiếu yêu cầu với bài làm trước khi gửi. Tiếp theo, em bấm Nộp bài và chọn tệp ZIP thử nghiệm. Em đọc lại tên tệp trên giao diện để tránh chọn nhầm bài hoặc nhầm môn, rồi bấm Xác nhận nộp tệp này. Sau thao tác này em chờ phản hồi hoàn tất; việc tệp đã được chọn trong máy chưa đủ để kết luận bài đã được nộp thành công.

### Kiểm tra
Tên ZIP đúng, bài thuộc đúng lớp và hạn nộp chưa hết. Chờ xác nhận của hệ thống sau khi gửi.

## 06 FLOW 3 · KIỂM TRA BÀI ĐÃ NỘP

Đường dẫn: Chi tiết bài Student → workspace Lecturer

Chuẩn bị: Giữ nguyên bài nộp này cho flow 4. Nếu trình diễn nộp lại, cần còn hạn và nói rõ đây là lần nộp mới.

### Thao tác
1. **Đọc biên nhận** — Sau khi tải xong, kiểm tra tên tệp, thời điểm và trạng thái bài nộp.
2. **Tải lại trang sinh viên** — Mở lại chi tiết; xem “Thư mục dự án đã nộp” và thông tin tệp.
3. **Mở phía giảng viên** — Workspace bài → “Bài nộp & Chấm điểm”; tìm đúng sinh viên.
4. **Đối chiếu hai phía** — So cùng bài tập, sinh viên, tệp và lần nộp trước khi chuyển sang chấm.

### Lời dẫn
Sau khi nhận được phản hồi, em kiểm tra thông tin bài nộp và thời điểm hệ thống ghi nhận. Em tải lại trang để chứng minh dữ liệu không chỉ tồn tại tạm trên màn hình. Nếu giao diện có phần Thư mục dự án đã nộp, em mở để cho thấy tệp đã gắn với bài tập. Sau đó em chuyển sang phiên giảng viên, vào workspace và tab Bài nộp & Chấm điểm. Em tìm đúng sinh viên, đối chiếu bài tập và lần nộp vừa thực hiện. Đây là minh chứng rằng bài đã đi từ phía sinh viên sang danh sách xử lý của giảng viên. Upload thành công chưa có nghĩa bài đã chấm xong hoặc điểm đã được công bố.

### Kiểm tra
Bài nộp còn tồn tại sau tải lại, xuất hiện đúng sinh viên ở phía Lecturer; không dùng kết quả của lần nộp khác.

## 07 FLOW 4 · KHỞI CHẠY VÀ XEM KẾT QUẢ

Đường dẫn: Workspace → Bài nộp & Chấm điểm → chi tiết kết quả

Chuẩn bị: Dùng localhost đã kiểm tra worker, AI và runtime phù hợp. Báo cáo hosting 31/10 ghi nhận worker tắt; cần kiểm tra lại cấu hình hiện tại trước buổi demo.

### Thao tác
1. **Chọn đúng bài nộp** — Trong phiên Lecturer, tìm sinh viên và lần nộp vừa kiểm tra.
2. **Bắt đầu và theo dõi** — Dùng “Logs Sandbox & AI” để bắt đầu/theo dõi lượt chấm phù hợp.
3. **Đọc trạng thái tác vụ** — Chờ xử lý, xem nhật ký; phân biệt đang chấm, hoàn tất hoặc lỗi.
4. **Mở kết quả đúng bài** — Mở chi tiết kết quả; đọc tổng điểm, tiêu chí và nhận xét.

### Lời dẫn
Em quay lại phiên giảng viên và chọn đúng bài nộp của flow 3. Với bài lập trình thông thường, em dùng thao tác Logs Sandbox & AI trên hàng bài nộp để bắt đầu hoặc theo dõi lượt chấm. Nếu demo bài UI, giao diện có nhánh Bắt đầu chấm UI & Logs; cần chuẩn bị riêng môi trường chạy cho loại bài đó. Trong lúc xử lý, em chỉ vào trạng thái và nhật ký để giải thích tác vụ đang ở bước nào. Chỉ khi có kết quả hoàn tất em mới mở báo cáo chi tiết. Em đối chiếu đúng bài và lần nộp, sau đó xem tổng điểm, tiêu chí và phản hồi; không sử dụng điểm của một báo cáo không khớp bài đang demo.

### Kiểm tra
Tác vụ hoàn tất và báo cáo khớp bài nộp. Nếu lỗi runtime hoặc không có môi trường thực thi, đọc đúng cảnh báo đang hiển thị.

## 08 FLOW 4 · DUYỆT VÀ CÔNG BỐ TRÊN WEB

Đường dẫn: /lecturer/grading/result/:id → /student/results

Chuẩn bị: Chuẩn bị kết quả đã chấm để chuyển sang nếu chờ quá 30–45 giây. Nói rõ khi sử dụng kết quả chuẩn bị trước; không sửa điểm thật chỉ để minh họa.

### Thao tác
1. **Giảng viên xem xét điểm** — Đọc báo cáo; bấm “Sửa điểm” nếu cần sửa điểm hoặc nhận xét.
2. **Lưu quyết định duyệt** — Trong “Điều chỉnh điểm & Nhận xét” → “Lưu điểm”; kiểm tra lại.
3. **Công bố kết quả** — Bấm “Công bố điểm”; kiểm tra trạng thái đã công bố.
4. **Sinh viên nhận kết quả** — Đổi sang Student → /student/results → mở bài, đối chiếu điểm/nhận xét.

### Lời dẫn
Ở trang kết quả, em giải thích rằng giảng viên có quyền xem xét và điều chỉnh trước khi sinh viên nhận điểm. Nếu cần, em bấm Sửa điểm để mở cửa sổ Điều chỉnh điểm và Nhận xét. Em nhập nhận xét cụ thể, chỉ sửa điểm khi có căn cứ rồi bấm Lưu điểm. Để minh họa rõ hai bước, em giữ tùy chọn công bố ngay ở trạng thái tắt, sau đó dùng nút Công bố điểm trên trang kết quả. Cuối cùng, em chuyển sang phiên sinh viên, tải lại danh sách kết quả và mở bài tương ứng. Em so sánh điểm, nhận xét và bài tập giữa hai phiên để kết thúc toàn bộ hành trình demo.

### Kiểm tra
Điểm/nhận xét sau duyệt được lưu; Student thấy đúng kết quả khi đã công bố. Nếu dữ liệu đã công bố từ trước, chọn bài thử nghiệm chưa công bố.