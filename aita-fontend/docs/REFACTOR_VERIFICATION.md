# Kiểm chứng sau tổ chức lại source

Ngày: 27/09/2026. Phạm vi: cấu trúc frontend; không triển khai backlog nghiệp vụ G0–G7.

| Kiểm tra | Kết quả |
|---|---|
| Source preservation | Đối chiếu AST trước/sau: thân logic/JSX của 28 screen không đổi sau khi chuẩn hóa tên import API. |
| API preservation | 106 phương thức API chính giữ nguyên body; grading/AI giữ nguyên ngoại trừ sửa SQL key URL từ Vite env sang API base chung. |
| Bản dịch | Giữ nguyên dữ liệu hiệu lực của 38 key VI và 550 key EN; fallback hiện tại không đổi. Đây không phải xác nhận dịch đầy đủ mọi màn hình. |
| Structure checker | 105 file source, 28 route; không unresolved local import, vi phạm tầng hoặc runtime import cycle. |
| TypeScript | Qua; đã tạo lại Next route types sau khi chuyển sang `src/app`. |
| Production build | Qua; danh sách 28 page route giữ nguyên. |
| API regression | 6/6 qua: query/payload/auth header, normalize/facade, multipart, SQL URL, ApiError, concurrent refresh queue. Fetch được giả lập, không ghi dữ liệu backend. |
| HTTP route smoke | 28/28 URL trả 200 trên production server cục bộ; tham số động dùng ID kiểm thử. HTTP 200 chưa xác nhận dữ liệu nghiệp vụ. |
| Browser smoke | Edge headless: `/`, `/login`, `/admin`, `/admin/users`, `/lecturer`, `/lecturer/grading/assignments`, `/student`, `/student/courses` render được, không có `pageerror`. Mock API/auth; không phải E2E với backend thật. |
| Lint phần tooling/route mới | Qua với 0 warning cho scripts/check-structure, tests, src/app, dictionaries, AppProviders và ESLint config. |
| Lint toàn dự án | Còn 261 errors, 175 warnings từ source đã có; chưa đạt. Không tắt rule ứng dụng để che lỗi. |

Lint trước tái cấu trúc: 265 errors / 175 warnings. Chênh lệch gồm 3 lỗi require
của script lịch sử chuyển vào archive không chạy và 1 `any` của Vite env đã bỏ.
Lỗi ứng dụng còn lại gồm 241 `no-explicit-any`, 19 `set-state-in-effect`,
1 `immutability`; cảnh báo gồm 173 unused vars, 1 exhaustive-deps,
1 location assignment. Các lỗi này tiếp tục nằm trong backlog chất lượng.

Không có thay đổi database/backend hoặc cài dependency mới trong đợt này.
Không coi source organization là xác nhận hệ thống đã đủ chức năng hoặc sẵn sàng
deploy production; tiếp tục nghiệm thu theo implementation plan.
