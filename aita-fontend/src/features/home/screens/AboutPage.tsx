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
  Clock,
  Code2,
  Users,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Target,
  GraduationCap,
  Layers,
  Bot,
} from 'lucide-react'

export default function AboutPage() {
  const { theme, toggleTheme } = useTheme()
  const { language, t } = useLanguage()

  const isVi = language === 'vi'

  const challenges = [
    {
      icon: Clock,
      title: isVi ? 'Thời gian chấm bài thủ công quá lớn' : 'Excessive Manual Grading Time',
      desc: isVi
        ? 'Giảng viên mất hàng tuần để tải, giải nén và chấm hàng trăm file code bài tập lớn hoặc đề thi thực hành mỗi học kỳ.'
        : 'Lecturers spend weeks extracting and evaluating hundreds of project submissions and practical exam code files each semester.',
      color: 'orange',
    },
    {
      icon: Code2,
      title: isVi ? 'Chấm thiếu nhất quán & thiếu khách quan' : 'Inconsistent & Subjective Scoring',
      desc: isVi
        ? 'Chấm code thủ công dễ dẫn đến sai lệch tiêu chí giữa các sinh viên hoặc giữa các giảng viên khác nhau trong cùng bộ môn.'
        : 'Manual grading often suffers from inconsistency across students or different instructors teaching the same subject.',
      color: 'blue',
    },
    {
      icon: AlertTriangle,
      title: isVi ? 'Phản hồi chậm, sinh viên không biết lỗi' : 'Delayed & Vague Student Feedback',
      desc: isVi
        ? 'Sinh viên thường chỉ nhận điểm số cuối cùng mà không hiểu rõ code của mình vi phạm tiêu chuẩn nào hoặc sai ở test case nào.'
        : 'Students often receive only a single numerical score without knowing which test cases failed or how to improve.',
      color: 'amber',
    },
    {
      icon: Users,
      title: isVi ? 'Khó phát hiện sao chép & gian lận' : 'Plagiarism & Code Integrity Risks',
      desc: isVi
        ? 'Khó khăn trong việc đối soát chéo cấu trúc mã nguồn giữa các sinh viên cùng lớp hoặc giữa các kỳ học khác nhau.'
        : 'Difficult to cross-examine AST code structure similarity across classes and previous semesters.',
      color: 'purple',
    },
  ]

  const pillars = [
    {
      icon: Bot,
      title: isVi ? 'Trợ giảng AI Thông minh' : 'Intelligent AI Teaching Assistant',
      desc: isVi
        ? 'Phân tích mã nguồn theo AST và Barem Rubric nhiều cấp, thực thi kiểm thử độc lập trong môi trường Sandbox an toàn.'
        : 'Analyzes source code via AST and multi-level Rubrics, executing isolated tests in secure Sandboxes.',
    },
    {
      icon: Target,
      title: isVi ? 'Đánh giá đa chiều & Minh bạch' : 'Multi-dimensional & Transparent Grading',
      desc: isVi
        ? 'Chi tiết từng tiêu chí: cú pháp, cấu trúc dữ liệu, xử lý ngoại lệ, logic nghiệp vụ kèm log HTTP Probe và SQL Sandbox Diff.'
        : 'Granular criteria: syntax, data structures, exception handling, business logic with HTTP Probe & SQL diffs.',
    },
    {
      icon: ShieldCheck,
      title: isVi ? 'Quyền quyết định tối cao của Giảng viên' : 'Lecturer Oversight & Authority',
      desc: isVi
        ? 'AI đóng vai trò trợ lý đề xuất điểm. Giảng viên toàn quyền review, điều chỉnh barem, giải quyết phúc khảo và công bố điểm.'
        : 'AI assists with recommendations. Lecturers retain full control to review, edit rubrics, resolve appeals and publish.',
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
            <Link href="/features" className="hover:text-orange-500 transition-colors">
              {isVi ? 'Tính năng' : 'Features'}
            </Link>
            <Link href="/about" className="text-orange-500 font-bold">
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
            <GraduationCap className="w-4 h-4 text-orange-500" />
            <span>FPT University • Capstone Project SWD392</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            {isVi ? 'Đột phá chất lượng đào tạo với ' : 'Transforming Programming Education with '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              AI Teaching Assistant
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {isVi
              ? 'AITA là nền tảng trợ giảng trí tuệ nhân tạo chuyên biệt cho các môn học lập trình, kết hợp giữa mô hình phân tích ngôn ngữ lớn (LLM), công nghệ sandbox thực thi cô lập và barem đánh giá Rubric chuẩn hóa tại Trường Đại học FPT.'
              : 'AITA is an AI-powered teaching assistant platform purpose-built for programming curricula, combining Large Language Models, isolated sandbox execution, and standardized rubric criteria at FPT University.'}
          </p>
        </section>

        {/* Challenges We Solve */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isVi ? 'Những bài toán cấp thiết được giải quyết' : 'The Core Challenges We Address'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isVi
                ? 'Thấu hiểu thực tế khối lượng công việc của giảng viên và nhu cầu nhận phản hồi tức thời của sinh viên.'
                : 'Addressing lecturer workload bottlenecks while satisfying student demand for fast and actionable feedback.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenges.map((c, i) => (
              <Card
                key={i}
                className="p-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-orange-500/40 transition-all space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                    <c.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {c.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {c.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isVi ? 'Trụ cột kiến trúc & Triết lý thiết kế' : 'Core Architecture & Philosophy'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isVi
                ? 'Đảm bảo sự cân bằng giữa tự động hóa thông minh và độ tin cậy chuẩn mực trong sư phạm.'
                : 'Balancing intelligent automation with academic integrity and pedagogical rigor.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <Card
                key={i}
                className="p-6 bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 space-y-3 hover:border-blue-500/40 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {p.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {p.desc}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Call to action */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-blue-500/10 border border-orange-500/20 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isVi ? 'Sẵn sàng trải nghiệm phương pháp học tập mới?' : 'Ready to experience modern AI-powered grading?'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            {isVi
              ? 'Đăng nhập với tài khoản cán bộ giảng viên hoặc sinh viên Đại học FPT để bắt đầu ngay hôm nay.'
              : 'Sign in with your FPT University faculty or student account to explore the workspace today.'}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <Button variant="primary" size="md" className="gap-2 shadow-lg shadow-orange-500/20 font-bold">
                <span>{isVi ? 'Đăng nhập hệ thống' : 'Enter Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
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
