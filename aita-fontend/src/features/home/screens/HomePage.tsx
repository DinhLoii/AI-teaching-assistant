'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { LiveClock } from '@/features/notes/components/LiveClock'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'
import { useTheme } from '@/providers/theme-provider'
import { useLanguage } from '@/providers/language-provider'
import {
  Sparkles,
  ArrowRight,
  Code2,
  Cpu,
  ShieldCheck,
  GraduationCap,
  School,
  Shield,
  FileCheck2,
  Sun,
  Moon,
} from 'lucide-react'

export default function HomePage() {
  const { theme, toggleTheme } = useTheme()
  const { language, t } = useLanguage()

  const isVi = language === 'vi'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative overflow-hidden transition-colors">
      {/* Top Ambient Glow (Subtle in light, atmospheric in dark) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-orange-500/15 via-blue-600/10 to-transparent blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header className="h-20 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/60 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 w-full transition-colors">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F26F21] to-[#FB923C] flex items-center justify-center text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">AITA</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/30">
                  FPT University
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">AI Teaching Assistant</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link href="/" className="text-orange-500 font-bold">
              {isVi ? 'Trang chủ' : 'Home'}
            </Link>
            <Link href="/features" className="hover:text-orange-500 transition-colors">
              {isVi ? 'Tính năng' : 'Features'}
            </Link>
            <Link href="/about" className="hover:text-orange-500 transition-colors">
              {isVi ? 'Về dự án' : 'About'}
            </Link>
          </nav>

          {/* Header Controls: LiveClock (no notes when unauthenticated), Language, Theme, Auth Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Realtime Clock & Calendar (Pending notes hidden when unauthenticated) */}
            <div className="hidden lg:block">
              <LiveClock showNotes={false} />
            </div>

            {/* Language Switcher Dropdown */}
            <LanguageDropdown />

            {/* Theme Toggle (Sun / Moon) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'light' ? t('nav.theme.dark', 'Chế độ tối') : t('nav.theme.light', 'Chế độ sáng')}
              className="h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-all shadow-xs"
            >
              {theme === 'light' ? (
                <Moon size={17} className="text-slate-600" />
              ) : (
                <Sun size={17} className="text-amber-400" />
              )}
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-bold">
                {t('nav.login', 'Đăng nhập')}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="primary" size="sm" className="text-xs font-bold shadow-md shadow-orange-500/20">
                <span>{isVi ? 'Bắt đầu ngay' : 'Get Started'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center space-y-8 z-10">
        <Badge variant="orange" className="px-4 py-1.5 text-xs font-semibold gap-2 border-orange-500/40">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          {isVi
            ? 'Nền tảng Trợ lý Giảng dạy & Tự động Chấm bài AI Đột phá'
            : 'Breakthrough AI-Powered Grading & Teaching Assistant'}
        </Badge>

        <div className="max-w-4xl space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {isVi ? 'Chấm bài Code Chuẩn Barem với ' : 'Standard Rubric Code Grading with '}
            <span className="bg-gradient-to-r from-[#F26F21] via-amber-500 to-[#FB923C] bg-clip-text text-transparent">
              {isVi ? 'Trí Tuệ Nhân Tạo' : 'Artificial Intelligence'}
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {isVi
              ? 'AITA kết hợp hàng đợi chấm ngầm liên tục, phân tích mã nguồn theo Rubric chi tiết, phát hiện đạo văn và gửi phản hồi học tập tức thì cho sinh viên FPT.'
              : 'AITA combines continuous background queue grading, source code analysis by Rubrics, plagiarism detection, and instant learning feedback for FPT students.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/login">
            <Button variant="primary" size="lg" className="shadow-orange-500/30 shadow-xl px-8">
              <span>{isVi ? 'Truy cập Cổng Đào Tạo' : 'Access Education Portal'}</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/login?role=student">
            <Button variant="outline" size="lg" className="px-8 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
              <GraduationCap className="w-5 h-5 text-orange-500" />
              <span>{isVi ? 'Dành cho Sinh Viên' : 'For Students'}</span>
            </Button>
          </Link>
        </div>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full pt-10">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 text-left shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isVi ? 'Môn Học CNTT' : 'IT Subjects'}
              </span>
              <Code2 className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">10+</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PRJ301, PRN212, CSD201, PRM392...</p>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 text-left shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isVi ? 'Cơ Chế Chấm' : 'Grading Engine'}
              </span>
              <Cpu className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Hybrid AI</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isVi ? 'Chấm ngầm liên tục & Theo đợt (Batch)' : 'Background Queue & Batch Grading'}
            </p>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 text-left shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isVi ? 'Tiêu Chuẩn Barem' : 'Rubric Standards'}
              </span>
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Multi-Part</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Part A, Part B, Part C 100%</p>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 text-left shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isVi ? 'Độ Tin Cậy' : 'Reliability'}
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">99.8%</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isVi ? 'Kiểm tra tương đồng & Đạo văn code' : 'Code similarity & Plagiarism check'}
            </p>
          </Card>
        </div>

        {/* 3 Role Portals Cards */}
        <div className="w-full pt-12 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {isVi ? 'Chọn Phân Hệ Đăng Nhập' : 'Choose Your Portal'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isVi ? 'Trải nghiệm không gian làm việc chuyên biệt theo từng vai trò' : 'Dedicated workspace designed for each role'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Sinh viên */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-orange-500/50 hover:shadow-orange-500/10 transition-all p-6 space-y-4 group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Cổng Sinh Viên' : 'Student Portal'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isVi
                    ? 'Xem đề bài, kéo thả nộp file .zip, theo dõi hàng đợi chấm ngầm, xem chi tiết điểm theo tiêu chí và nhận gợi ý sửa lỗi từ AI.'
                    : 'View assignments, drag & drop .zip submissions, monitor grading queue, check score breakdown and receive AI hints.'}
                </p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 pt-2">
                <span>{isVi ? 'Vào bàn học tập' : 'Open Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Card>

            {/* Giảng viên */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-blue-500/50 hover:shadow-blue-500/10 transition-all p-6 space-y-4 group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <School className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Cổng Giảng Viên' : 'Lecturer Portal'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isVi
                    ? 'Quản lý lớp học, sinh đề bài và barem Rubric tự động, kích hoạt chấm hàng loạt (Batch Grading), duyệt điểm và công bố điểm thi.'
                    : 'Manage classes, auto-generate Rubrics & prompts, trigger Batch Grading, publish results and oversee submissions.'}
                </p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-600 pt-2">
                <span>{isVi ? 'Vào cổng giảng dạy' : 'Open Lecturer Hub'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Card>

            {/* Quản trị viên */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-purple-500/50 hover:shadow-purple-500/10 transition-all p-6 space-y-4 group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isVi ? 'Cổng Quản Trị Hệ Thống' : 'Admin Portal'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isVi
                    ? 'Quản lý tài khoản, nhập sinh viên qua Excel, phân công môn học, kích hoạt kỳ học (Semesters) và cấu hình AI Engine.'
                    : 'User management, Excel student import, course allocation, semester setup, and AI model parameter configuration.'}
                </p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-500 hover:text-purple-600 pt-2">
                <span>{isVi ? 'Vào quản trị hệ thống' : 'Open Admin Panel'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950 py-8 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 AI Teaching Assistant (AITA) — Trường Đại Học FPT. Thiết kế và phát triển phục vụ công tác giảng dạy & học tập.</p>
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
