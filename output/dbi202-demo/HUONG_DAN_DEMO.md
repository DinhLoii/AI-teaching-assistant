# Demo DBI202

1. Khởi động lại backend sau khi cập nhật; Docker Desktop phải đang chạy.
2. Tạo bài tập mới, chọn lớp DBI202 và tải đúng paper-dbi202.pdf đã cung cấp.
3. Phân tích đề: ngôn ngữ SQL, 10 tiêu chí (mỗi câu 1 điểm), 10 kiểm thử SQL Server. Duyệt rubric trước khi giao bài.
4. Sinh viên tải bộ khung: material_0 chứa DBscript.sql và Q1.sql đến Q10.sql. DBscript là dữ liệu gốc, không phải bài làm.
5. Nộp DBI202_1-2_diem.zip và DBI202_9-10_diem.zip bằng hai sinh viên khác nhau; giữ hai ZIP nguyên trạng.
6. Chấm và mở log của từng submission. Có bước SQL Server Docker, Q1-SQL1 đến Q10-SQL1 và điểm từng câu. Kết quả kiểm chứng: bản thấp 2/10, bản cao 10/10.
7. Rubric và nhận xét được gọi qua AI thật. Điểm chức năng lấy từ SQL đã chạy, không lấy theo tên ZIP.

Lưu ý: PDF và DBscript mâu thuẫn ở quantity=0 trong Q8. Bộ mẫu giữ nguyên dữ liệu gốc và kiểm tra 4 tình huống procedure có trong đề; cần thống nhất nếu thêm trường hợp quantity=0.
