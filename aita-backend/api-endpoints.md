# Danh sách API Backend

Dưới đây là danh sách đầy đủ các API backend được định nghĩa trong dự án, tất cả đều có chung tiền tố (prefix) là `/api`.

## 1. Health Check
- `GET /api/health` - Kiểm tra trạng thái máy chủ.

## 2. Modules (Clean Architecture)

### 2.1 Auth (Xác thực) - `/api/auth`
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/auth/me` - Lấy thông tin user hiện tại (Yêu cầu đăng nhập)
- `POST /api/auth/logout` - Đăng xuất (Yêu cầu đăng nhập)

### 2.2 Users (Người dùng) - `/api/users`
- `GET /api/users/` - Lấy danh sách người dùng (Admin)
- `POST /api/users/` - Tạo người dùng mới (Admin)
- `PATCH /api/users/:id` - Cập nhật thông tin người dùng (Admin)
- `DELETE /api/users/:id` - Xóa người dùng (Admin)
- `PATCH /api/users/:id/lock` - Khóa/Mở khóa tài khoản người dùng (Admin)

### 2.3 Classes (Lớp học) - `/api/classes`
- `GET /api/classes/` - Lấy danh sách lớp học
- `POST /api/classes/` - Tạo lớp học mới (Admin, Lecturer)
- `GET /api/classes/:id/students` - Lấy danh sách học sinh trong lớp (Admin, Lecturer)
- `POST /api/classes/:id/enroll` - Thêm học sinh vào lớp (Admin, Lecturer)

### 2.4 Subjects (Môn học) - `/api/subjects`
- `GET /api/subjects/` - Lấy danh sách môn học
- `POST /api/subjects/` - Tạo môn học mới
- `PUT /api/subjects/:id` - Cập nhật môn học
- `DELETE /api/subjects/:id` - Xóa môn học

### 2.5 Assignments (Bài tập) - `/api/assignments`
- `GET /api/assignments/` - Lấy danh sách bài tập
- `GET /api/assignments/:id` - Xem chi tiết bài tập
- `POST /api/assignments/` - Tạo bài tập mới (Admin, Lecturer)
- `PUT /api/assignments/:id` - Cập nhật bài tập (Admin, Lecturer)

### 2.6 Submissions (Bài nộp) - `/api/submissions`
- `GET /api/submissions/` - Lấy danh sách bài nộp
- `GET /api/submissions/recent` - Lấy danh sách bài nộp gần đây
- `GET /api/submissions/:id` - Xem chi tiết bài nộp
- `POST /api/submissions/` - Nộp bài
- `PATCH /api/submissions/:id/grade` - Chấm điểm bài nộp

### 2.7 AI (Trí tuệ nhân tạo) - `/api/ai`
- `POST /api/ai/generate-exercise` - Tạo bài tập tự động bằng AI
- `POST /api/ai/save-assignment` - Lưu bài tập được sinh bởi AI
- `POST /api/ai/assess/:submissionId` - AI chấm điểm bài nộp
- `GET /api/ai/feedback/:studentId` - AI cung cấp phản hồi học tập cho sinh viên
- `GET /api/ai/config` - Xem cấu hình AI (Admin)
- `PUT /api/ai/config` - Cập nhật cấu hình AI (Admin)

### 2.8 Config (Cấu hình hệ thống chung) - `/api/config`
- `GET /api/config/project-types` - Danh sách các loại dự án
- `GET /api/config/project-types/:code` - Lấy chi tiết loại dự án
- `PUT /api/config/project-types/:code` - Cập nhật loại dự án (Admin)

### 2.9 Exams (Kỳ thi) - `/api/exams`
- `GET /api/exams/` - Lấy danh sách kỳ thi
- `POST /api/exams/` - Tạo kỳ thi mới
- `GET /api/exams/:id` - Xem chi tiết kỳ thi
- `PUT /api/exams/:id` - Cập nhật thông tin kỳ thi

### 2.10 Grading (Chấm điểm chi tiết) - `/api/grading`
- `GET /api/grading/sessions/:sessionId` - Kiểm tra trạng thái phiên chấm điểm
- `POST /api/grading/start` - Bắt đầu quá trình chấm điểm (Admin, Teacher)

### 2.11 Notifications (Thông báo) - `/api/notifications`
- `GET /api/notifications/` - Lấy danh sách thông báo cá nhân
- `PUT /api/notifications/:id/read` - Đánh dấu thông báo đã đọc

### 2.12 Reports (Báo cáo) - `/api/reports`
- `GET /api/reports/` - Báo cáo tổng quan hệ thống (Admin)
- `GET /api/reports/health` - Báo cáo sức khỏe/tình trạng hệ thống (Admin)

### 2.13 Rubric (Tiêu chí chấm điểm) - `/api/rubric`
- `GET /api/rubric/rules` - Lấy danh sách rule chấm điểm
- `GET /api/rubric/rules/:id` - Xem chi tiết rule kèm các tiêu chí

### 2.14 Audit (Nhật ký hệ thống) - `/api/audit`
- `GET /api/audit/logs` - Xem nhật ký thao tác người dùng (Admin)
- `GET /api/audit/ai-usage` - Xem nhật ký sử dụng AI (Admin)

### 2.15 Settings (Cài đặt) - `/api/settings`
- `GET /api/settings/config` - Lấy cấu hình hệ thống (Admin)
- `PUT /api/settings/config` - Cập nhật cấu hình hệ thống (Admin)
- `GET /api/settings/options/classes` - Lấy options cho dropdown danh sách lớp
- `GET /api/settings/options/lecturers` - Lấy options cho dropdown danh sách giảng viên

### 2.16 Stats (Thống kê) - `/api/stats`
- `GET /api/stats/overview` - Xem tổng quan thống kê
- `GET /api/stats/activity` - Lấy lịch sử hoạt động (Admin)
- `GET /api/stats/lecturer-report` - Xem báo cáo dành cho giảng viên (Lecturer)
- `GET /api/stats/student-progress` - Xem tiến độ học tập của sinh viên (Student)
- `GET /api/stats/student-history` - Xem lịch sử học tập của sinh viên (Student)

## 3. Legacy APIs (Tùy chọn)
Một số API cũ nằm trong `route-manager.ts` mà chưa quy hoạch vào các `.router.ts` (ví dụ route thống kê hoặc option). Đa số các API chính đã được liệt kê chi tiết bên trên.
