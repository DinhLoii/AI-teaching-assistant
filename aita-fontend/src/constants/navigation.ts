import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan hệ thống', path: '/admin', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'lecturers', label: 'Quản lý Giảng viên', path: '/admin/users?role=lecturer', icon: 'Briefcase', category: 'Đào tạo' },
  { id: 'students', label: 'Quản lý Sinh viên', path: '/admin/users?role=student', icon: 'GraduationCap', category: 'Đào tạo' },
  { id: 'classes', label: 'Lớp học & Phân công', path: '/admin/classes', icon: 'BookOpen', category: 'Đào tạo' },
  { id: 'subjects', label: 'Môn học & Barem', path: '/admin/subjects', icon: 'Library', category: 'Đào tạo' },
  { id: 'seasons', label: 'Chương trình & Học kỳ', path: '/admin/seasons', icon: 'Layers', category: 'Đào tạo' },
  { id: 'exams', label: 'Ngân hàng Đề & Bài tập', path: '/admin/exams', icon: 'FileSignature', category: 'Đào tạo' },
  { id: 'reports', label: 'Báo cáo & Thống kê', path: '/admin/reports', icon: 'BarChart3', category: 'Thống kê' },
  { id: 'audit-logs', label: 'Nhật ký kiểm toán', path: '/admin/audit-logs', icon: 'FileText', category: 'Thống kê' },
  { id: 'ai-config', label: 'Cấu hình AI & API Keys', path: '/admin/ai-config', icon: 'Bot', category: 'Hệ thống' },
  { id: 'settings', label: 'Cài đặt hệ thống', path: '/admin/settings', icon: 'Settings', category: 'Hệ thống' },
  { id: 'notifications', label: 'Thông báo', path: '/admin/notifications', icon: 'Bell', category: 'Cá nhân' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Bàn làm việc', path: '/lecturer', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'classes', label: 'Lớp học & Sinh viên', path: '/lecturer/classes', icon: 'BookOpen', category: 'Giảng dạy' },
  { id: 'subjects', label: 'Môn & Đề cương', path: '/lecturer/subjects', icon: 'Library', category: 'Giảng dạy' },
  { id: 'grading-assignments', label: 'Bài tập & Đề tài', path: '/lecturer/grading/assignments', icon: 'FileCheck', category: 'Giảng dạy' },
  { id: 'grading-hub', label: 'Trung tâm Chấm & Queue', path: '/lecturer/grading/hub', icon: 'Cpu', category: 'Chấm điểm & AI' },
  { id: 'rubric-generator', label: 'Barem chấm (Rubric AI)', path: '/lecturer/rubric-generator', icon: 'Sparkles', category: 'Chấm điểm & AI' },
  { id: 'prompts', label: 'Cấu hình Prompt AI', path: '/lecturer/prompts', icon: 'Bot', category: 'Chấm điểm & AI' },
  { id: 'notifications', label: 'Thông báo & Phúc khảo', path: '/lecturer/notifications', icon: 'Bell', category: 'Cá nhân' },
  { id: 'profile', label: 'Hồ sơ cá nhân', path: '/profile', icon: 'UserCircle', category: 'Cá nhân' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Bàn học tập', path: '/student', icon: 'LayoutDashboard', category: 'Học tập' },
  { id: 'assignments', label: 'Bài tập & Nhiệm vụ', path: '/student/assignments', icon: 'FileCheck', category: 'Học tập' },
  { id: 'results', label: 'Kết quả & Đánh giá AI', path: '/student/results', icon: 'GraduationCap', category: 'Học tập' },
  { id: 'classes', label: 'Lớp học & Môn học', path: '/student/classes', icon: 'BookOpen', category: 'Học tập' },
  { id: 'notifications', label: 'Thông báo', path: '/student/notifications', icon: 'Bell', category: 'Cá nhân' },
  { id: 'profile', label: 'Hồ sơ cá nhân', path: '/profile', icon: 'UserCircle', category: 'Cá nhân' },
]
