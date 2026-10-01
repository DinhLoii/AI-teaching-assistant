import type { NavItem } from '@/types'

export const ADMIN_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/admin', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'users', label: 'Người dùng', path: '/admin/users', icon: 'Users', category: 'Đào tạo' },
  { id: 'seasons', label: 'Chương trình & Học kỳ', path: '/admin/seasons', icon: 'Layers', category: 'Đào tạo' },
  { id: 'classes', label: 'Lớp học', path: '/admin/classes', icon: 'BookOpen', category: 'Đào tạo' },
  { id: 'subjects', label: 'Môn học', path: '/admin/subjects', icon: 'Library', category: 'Đào tạo' },
  { id: 'exams', label: 'Đề thi & Bài tập', path: '/admin/exams', icon: 'FileSignature', category: 'Đào tạo' },
  { id: 'reports', label: 'Báo cáo & Thống kê', path: '/admin/reports', icon: 'BarChart3', category: 'Thống kê' },
  { id: 'audit-logs', label: 'Nhật ký kiểm toán', path: '/admin/audit-logs', icon: 'FileText', category: 'Thống kê' },
  { id: 'ai-config', label: 'Cấu hình AI', path: '/admin/ai-config', icon: 'Bot', category: 'Hệ thống' },
  { id: 'settings', label: 'Cài đặt hệ thống', path: '/admin/settings', icon: 'Settings', category: 'Hệ thống' },
]

export const LECTURER_NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan', path: '/lecturer', icon: 'LayoutDashboard', category: 'Chung' },
  { id: 'classes', label: 'Lớp phụ trách', path: '/lecturer/classes', icon: 'BookOpen', category: 'Giảng dạy' },
  { id: 'subjects', label: 'Môn giảng dạy', path: '/lecturer/subjects', icon: 'Library', category: 'Giảng dạy' },
  { id: 'grading-assignments', label: 'Quản lý Bài tập & Chấm', path: '/lecturer/grading/assignments', icon: 'FileCheck', category: 'Chấm bài & AI' },
  { id: 'prompts', label: 'Prompt AI Môn học', path: '/lecturer/prompts', icon: 'Bot', category: 'Chấm bài & AI' },
  { id: 'notifications', label: 'Thông báo', path: '/lecturer/notifications', icon: 'Bell', category: 'Cá nhân' },
  { id: 'profile', label: 'Hồ sơ cá nhân', path: '/profile', icon: 'UserCircle', category: 'Cá nhân' },
]

export const STUDENT_NAV: NavItem[] = [
  { id: 'overview', label: 'Bàn học tập', path: '/student', icon: 'LayoutDashboard', category: 'Học tập' },
  { id: 'assignments', label: 'Bài tập & Nhiệm vụ', path: '/student/assignments', icon: 'FileCheck', category: 'Học tập' },
  { id: 'courses', label: 'Môn học của tôi', path: '/student/courses', icon: 'BookOpen', category: 'Học tập' },
  { id: 'classes', label: 'Lớp học tham gia', path: '/student/classes', icon: 'Users', category: 'Học tập' },
  { id: 'results', label: 'Kết quả & Bài nộp', path: '/student/subjects', icon: 'GraduationCap', category: 'Học tập' },
  { id: 'notifications', label: 'Thông báo', path: '/student/notifications', icon: 'Bell', category: 'Cá nhân' },
  { id: 'profile', label: 'Hồ sơ cá nhân', path: '/profile', icon: 'UserCircle', category: 'Cá nhân' },
]
