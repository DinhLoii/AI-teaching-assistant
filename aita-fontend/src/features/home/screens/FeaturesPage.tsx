'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'
import { useTheme } from '@/providers/theme-provider'
import { useLanguage } from '@/providers/language-provider'
import {
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  Upload,
  Bot,
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Bell,
  ClipboardList,
  BarChart3,
  Megaphone,
  Users,
  ShieldCheck,
  FileCode,
  Layers,
  Database,
  Terminal,
  RotateCcw,
  CheckCircle2,
  Lock,
} from 'lucide-react'

export default function FeaturesPage() {
  const { theme, toggleTheme } = useTheme()
  const { language, t } = useLanguage()

  const isVi = language === 'vi'

  const studentFeatures = [
    {
      icon: Upload,
      title: isVi ? 'Nộp bài tập mã nguồn ZIP' : 'ZIP Code Submissions',
      desc: isVi
        ? 'Kéo thả file .zip tới 100MB, kiểm tra cấu trúc mã nguồn và xác nhận nộp tức thì.'
        : 'Drag & drop .zip archives up to 100MB with automated structure validation.',
    },
    {
      icon: Bot,
      title: isVi ? 'Trợ lý AI gợi ý sửa lỗi' : 'AI Hint Assistant',
      desc: isVi
        ? 'Nhận định hướng khắc phục lỗi thuật toán hoặc ngoại lệ mà không làm lộ đáp án ẩn.'
        : 'Get actionable debugging hints and structural suggestions without exposing hidden tests.',
    },
    {
      icon: LayoutDashboard,
      title: isVi ? 'Bàn học tập & Deadline Hub' : 'Study & Deadline Hub',
      desc: isVi
        ? 'Theo dõi toàn diện các nhiệm vụ học tập, hạn nộp kèm bộ đếm ngược thời gian thực.'
        : 'Comprehensive task overview with real-time countdown timers and urgent alerts.',
    },
    {
      icon: FileCode,
      title: isVi ? 'Báo cáo đánh giá đa chiều' : 'Rich Evaluation Reports',
      desc: isVi
        ? 'Xem bằng chứng thực thi HTTP Probe, SQL Sandbox Diff và chi tiết điểm từng tiêu chí.'
        : 'Inspect HTTP probe timelines, SQL table diffs, and criteria score breakdowns.',
    },
    {
      icon: RotateCcw,
      title: isVi ? 'Phúc khảo & Phản hồi điểm' : 'Score Appeals & Feedback',
      desc: isVi
        ? 'Gửi yêu cầu giải trình trực tiếp tới Giảng viên và xem phản hồi xử lý minh bạch.'
        : 'Submit appeal statements directly to instructors and monitor resolution responses.',
    },
    {
      icon: Bell,
      title: isVi ? 'Thông báo điểm theo thời gian thực' : 'Real-time Notifications',
      desc: isVi
        ? 'Nhận thông báo ngay khi giảng viên công bố điểm số hoặc cập nhật lịch học mới.'
        : 'Instant alerts when grades are officially published or schedules change.',
    },
  ]

  const lecturerFeatures = [
    {
      icon: Sparkles,
      title: isVi ? 'Sinh Barem Rubric tự động bằng AI' : 'AI Rubric Generator Wizard',
      desc: isVi
        ? 'Sinh tiêu chuẩn chấm đa tầng từ mô tả bài toán, tùy chỉnh trọng số và ràng buộc code.'
        : 'Auto-generate multi-level grading rubrics from problem statements with custom weights.',
    },
    {
      icon: Layers,
      title: isVi ? 'Chấm bài hàng loạt (Batch Grading)' : 'Batch Grading Engine',
      desc: isVi
        ? 'Chấm đồng thời hàng chục bài thi với thanh tiến trình trực quan, retry và hủy an toàn.'
        : 'Grade tens of submissions simultaneously with live progress, retry, and cancellation.',
    },
    {
      icon: Terminal,
      title: isVi ? 'Theo dõi phiên chấm Live (SSE)' : 'Live Job Terminal (SSE)',
      desc: isVi
        ? 'Kết nối stream SSE theo dõi từng bước phân tích AST, chạy probe và sandbox log.'
        : 'Stream live execution steps via SSE including AST parsing, probes, and sandbox logs.',
    },
    {
      icon: ShieldCheck,
      title: isVi ? 'Phát hiện đạo văn & Tương đồng' : 'AST Similarity & Plagiarism Check',
      desc: isVi
        ? 'So sánh chéo cấu trúc mã nguồn giữa các sinh viên và áp dụng mức trừ phạt linh hoạt.'
        : 'Cross-analyze AST token structures and enforce configurable similarity penalties.',
    },
    {
      icon: BarChart3,
      title: isVi ? 'Review & Công bố điểm có kiểm soát' : 'Controlled Grade Publishing',
      desc: isVi
        ? 'Lưu nháp, điều chỉnh điểm barem, công bố từng bài hoặc công bố hàng loạt cho cả lớp.'
        : 'Draft reviews, adjust rubric scores, publish individually or in bulk to classes.',
    },
    {
      icon: ClipboardList,
      title: isVi ? 'Gia hạn nộp bài riêng' : 'Individual Deadline Extensions',
      desc: isVi
        ? 'Cấp hạn chót mới cho sinh viên đặc biệt kèm chính sách miễn/giảm trừ điểm trễ.'
        : 'Grant customized submission deadlines with waiver or custom late penalty rules.',
    },
  ]

  const adminFeatures = [
    {
      icon: Users,
      title: isVi ? 'Quản lý tài khoản & Nhập Excel' : 'User Accounts & Excel Import',
      desc: isVi
        ? 'Quản lý phân quyền 3 vai trò, nhập danh sách sinh viên qua Excel chuẩn định dạng.'
        : 'Manage 3 system roles, batch import students via validated Excel sheets.',
    },
    {
      icon: BookOpen,
      title: isVi ? 'Chương trình, Môn học & Syllabus' : 'Programs, Subjects & Syllabus',
      desc: isVi
        ? 'Quản lý chương trình đào tạo, tài liệu session học tập và tín chỉ môn học.'
        : 'Manage educational programs, session syllabus documents, and course credits.',
    },
    {
      icon: Bot,
      title: isVi ? 'Cấu hình tham số AI Engine' : 'AI Model & Engine Configuration',
      desc: isVi
        ? 'Cấu hình model, temperature, timeout và quota cho toàn bộ hệ thống chấm tự động.'
        : 'Tune LLM models, temperature, timeouts, and execution quotas system-wide.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative overflow-hidden transition-colors">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-orange-500/15 via-blue-600/10 to-transparent blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="h-20 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/60 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 w-full transition-colors">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F26F21] to-[#FB923C] flex items-center justify-center text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">AITA</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/30">
                  FPT University
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">AI Teaching Assistant</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/" className="hover:text-orange-500 transition-colors">
              {isVi ? 'Trang chủ' : 'Home'}
            </Link>
            <Link href="/features" className="text-orange-500 font-bold">
              {isVi ? 'Tính năng' : 'Features'}
            </Link>
            <Link href="/about" className="hover:text-orange-500 transition-colors">
              {isVi ? 'Về dự án' : 'About'}
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <LanguageDropdown />
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
            </button>
            <Link href="/login">
              <Button variant="primary" size="sm" className="text-xs font-bold gap-1.5">
                <span>{isVi ? 'Đăng nhập' : 'Sign in'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 space-y-20 z-10">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <Badge variant="orange" className="px-4 py-1.5 text-xs font-semibold gap-2 border-orange-500/40">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>Product Capabilities</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {isVi ? 'Hệ thống tính năng toàn diện cho ' : 'Comprehensive Capabilities for '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Giảng dạy & Học tập
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {isVi
              ? 'Tất cả tính năng được thiết kế bám sát thực tế chương trình đào tạo ngành Công nghệ thông tin tại Đại học FPT, đảm bảo tính chuẩn xác, tốc độ và trải nghiệm mượt mà.'
              : 'Purpose-built capabilities aligned with FPT University computer science curricula, guaranteeing high performance, pedagogical integrity, and an intuitive user experience.'}
          </p>
        </section>

        {/* Section 1: Sinh viên */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isVi ? 'Dành cho Sinh Viên' : 'For Students'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi ? 'Trải nghiệm nộp bài, xem phản hồi chi tiết và nâng cao năng lực lập trình' : 'Streamlined submission workflow, evidence-based feedback, and continuous learning'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentFeatures.map((f, i) => (
              <Card
                key={i}
                className="p-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-orange-500/40 transition-all space-y-3"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 2: Giảng viên */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isVi ? 'Dành cho Giảng Viên' : 'For Lecturers'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi ? 'Tự động hóa chấm bài quy mô lớn, kiểm soát barem và theo dõi học tập' : 'Scalable batch evaluation, full rubric authority, and academic integrity management'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lecturerFeatures.map((f, i) => (
              <Card
                key={i}
                className="p-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-blue-500/40 transition-all space-y-3"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 3: Quản trị viên */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {isVi ? 'Dành cho Quản Trị Viên' : 'For Administrators'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi ? 'Vận hành đào tạo tập trung, quản lý người dùng và cấu hình thông số hệ thống' : 'Centralized academic operations, user management, and AI engine controls'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {adminFeatures.map((f, i) => (
              <Card
                key={i}
                className="p-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-purple-500/40 transition-all space-y-3"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <f.icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950 py-8 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI Teaching Assistant (AITA) — Trường Đại Học FPT.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-orange-500 transition-colors">{isVi ? 'Trang chủ' : 'Home'}</Link>
            <Link href="/features" className="hover:text-orange-500 transition-colors">{isVi ? 'Tính năng' : 'Features'}</Link>
            <Link href="/about" className="hover:text-orange-500 transition-colors">{isVi ? 'Về dự án' : 'About'}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
