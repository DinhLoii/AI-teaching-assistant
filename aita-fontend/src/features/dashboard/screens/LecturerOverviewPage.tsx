'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { classesApi } from '@/lib/api/modules/classes'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { notificationsApi } from '@/lib/api/modules/notifications'
import { aiApi } from '@/lib/api/modules/ai'
import { formatDate, cn } from '@/lib/utils'
import { errorMessage } from '@/lib/api/errors'
import {
  Users,
  FileText,
  FileCheck,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Bot,
  BarChart3,
  Plus,
  Search,
  Award,
  BookOpen,
  Zap,
  Bell,
  TrendingUp,
} from 'lucide-react'

// Relative time formatter matching StudentOverviewPage
function formatRelativeTime(dateStr?: string, isVi: boolean = true) {
  if (!dateStr) return isVi ? 'Vừa xong' : 'Just now'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return isVi ? 'Vừa xong' : 'Just now'
  if (diffSec < 3600) return isVi ? `${Math.floor(diffSec / 60)} phút trước` : `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return isVi ? `${Math.floor(diffSec / 3600)} giờ trước` : `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return isVi ? `${Math.floor(diffSec / 86400)} ngày trước` : `${Math.floor(diffSec / 86400)}d ago`
  return date.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Sample fallback notifications for teacher
const DEFAULT_TEACHER_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'SUBMISSION',
    title: 'Bài nộp mới từ sinh viên',
    message: 'Sinh viên Nguyễn Văn Anh (SE180123) vừa nộp bài Assignment 1: WPF Application.',
    isRead: false,
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'GRADE',
    title: 'AI Engine hoàn tất chấm bài',
    message: 'Hàng đợi chấm điểm tự động đã chấm xong 18 bài tập Lab 3 môn PRM392.',
    isRead: false,
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'APPEAL',
    title: 'Đơn phúc khảo cần xử lý',
    message: 'Sinh viên Trần Thị Mai gửi khiếu nại điểm bài Assignment 1 môn PRJ301.',
    isRead: true,
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'notif-4',
    type: 'SYSTEM',
    title: 'Nhắc nhở hạn nộp đề thi',
    message: 'Thời hạn ban hành Rubric AI cho kỳ thi Final Exam Spring 2026 là ngày 15/10/2026.',
    isRead: true,
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
  },
]

// Clean data for teaching classes (monochrome neutral badges)
const TEACHING_CLASSES = [
  { code: 'PRN212', name: '.NET & C#', students: 42, progress: 78 },
  { code: 'PRJ301', name: 'Java Web', students: 38, progress: 65 },
  { code: 'PRM392', name: 'Android', students: 36, progress: 88 },
  { code: 'CSD201', name: 'Cấu trúc dữ liệu & GT', students: 40, progress: 82 },
]

// Clean data for upcoming assignments (subtle alert for urgent only)
const UPCOMING_DEADLINES = [
  {
    code: 'PRN212',
    title: 'Assignment 1: WPF Application',
    due: '03/10/2026 23:59',
    badge: 'Còn 2 ngày',
    urgent: true,
  },
  {
    code: 'PRJ301',
    title: 'Assignment 1: Java Servlet & MVC',
    due: '09/10/2026 23:59',
    badge: 'Còn 7 ngày',
    urgent: false,
  },
  {
    code: 'PRM392',
    title: 'Assignment 1: Android',
    due: '13/10/2026 23:59',
    badge: 'Còn 11 ngày',
    urgent: false,
  },
  {
    code: 'CSD201',
    title: 'Lab 3: BST & AVL Balancing',
    due: '16/10/2026 23:59',
    badge: 'Còn 14 ngày',
    urgent: false,
  },
]

// Bar chart data
const BAR_CHART_DATA = [
  { code: 'PRN212', submitted: 20, missing: 26, grading: 10 },
  { code: 'PRJ301', submitted: 26, missing: 30, grading: 16 },
  { code: 'PRM392', submitted: 18, missing: 25, grading: 20 },
  { code: 'CSD201', submitted: 15, missing: 24, grading: 16 },
]

export default function LecturerOverviewPage() {
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const [classes, setClasses] = React.useState<any[]>([])
  const [exams, setExams] = React.useState<any[]>([])
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [notifications, setNotifications] = React.useState<any[]>(DEFAULT_TEACHER_NOTIFICATIONS)
  const [loading, setLoading] = React.useState(true)

  // Chart time filter & hover tooltip state
  const [timeFilter, setTimeFilter] = React.useState<'7days' | '30days' | 'semester'>('7days')
  const [hoveredBar, setHoveredBar] = React.useState<string | null>(null)

  // AI Tutor Search / Chat
  const [tutorQuery, setTutorQuery] = React.useState('')
  const [aiModalOpen, setAiModalOpen] = React.useState(false)
  const [aiResponse, setAiResponse] = React.useState<string | null>(null)
  const [aiThinking, setAiThinking] = React.useState(false)

  // Appeal Review Modal state
  const [reviewAppealModal, setReviewAppealModal] = React.useState<any | null>(null)
  const [appealNewScore, setAppealNewScore] = React.useState<number | string>('')
  const [appealFeedback, setAppealFeedback] = React.useState('')
  const [submittingReview, setSubmittingReview] = React.useState(false)
  const [reviewSuccess, setReviewSuccess] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    setLoading((prev) => (classes.length === 0 && exams.length === 0 ? true : prev))
    try {
      const [cls, exms, subs, notifs] = await Promise.allSettled([
        classesApi.getClasses(1, 1000).catch(() => []),
        assignmentsApi.getAssignments().catch(() => []),
        submissionsApi.getSubmissions().catch(() => []),
        notificationsApi.getMyNotifications({ limit: 10 }).catch(() => notificationsApi.getNotifications(1, 10)),
      ])

      if (cls.status === 'fulfilled') {
        const val = cls.value
        setClasses(Array.isArray(val) ? val : (val as any)?.data || [])
      }
      if (exms.status === 'fulfilled') {
        setExams(Array.isArray(exms.value) ? exms.value : [])
      }
      if (subs.status === 'fulfilled') {
        setSubmissions(Array.isArray(subs.value) ? subs.value : [])
      }
      if (notifs.status === 'fulfilled') {
        const val = notifs.value
        const items = Array.isArray(val) ? val : val?.items || val?.data || []
        if (items.length > 0) {
          setNotifications(items)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  // Unread notification count
  const unreadCount = React.useMemo(() => {
    return notifications.filter((n) => !n.isRead && !n.read).length
  }, [notifications])

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllNotificationsAsRead()
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })))
  }

  // Handle Ask AI Tutor
  const handleAskAi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!tutorQuery.trim()) return

    setAiModalOpen(true)
    setAiThinking(true)
    setAiResponse(null)

    try {
      const res = await aiApi.ragChat({
        query: tutorQuery,
      })

      if (res?.answer) {
        setAiResponse(res.answer)
      } else {
        throw new Error('No answer')
      }
    } catch {
      // Pedagogical Fallback
      const q = tutorQuery.toLowerCase()
      if (q.includes('barem') || q.includes('rubric') || q.includes('chấm')) {
        setAiResponse(
          isVi
            ? '🤖 **Khuyến nghị Barem Rubric từ AI Assistant:**\n\n1. **Phân bổ tỷ trọng điểm**:\n   - Clean Code & Chuẩn PSR/PEP8/C#: 20%\n   - Correctness (Unit Testcases cơ bản): 40%\n   - Exception & Edge Cases (Xử lý mảng rỗng, null pointer): 25%\n   - Optimization & Thời gian chạy $O(n)$: 15%\n\n2. Bạn có thể sử dụng chức năng **"Barem AI (Rubric Generator)"** ở thanh menu để AI sinh barem JSON tự động cho môn học này.'
            : '🤖 **AI Rubric Recommendation:** Allocate 40% to correctness, 25% to exception handling, 20% to code conventions, and 15% to computational complexity.'
        )
      } else if (q.includes('wpf') || q.includes('c#') || q.includes('prn212')) {
        setAiResponse(
          isVi
            ? '🤖 **Gợi ý kiểm thử bài tập PRN212 (.NET & WPF):**\n\n- Kiểm tra cơ chế Data Binding (INotifyPropertyChanged, ObservableCollection).\n- Xác thực MVVM pattern: ViewModel không được tham chiếu trực tiếp đến namespace System.Windows.Controls.\n- Đảm bảo connection string cơ sở dữ liệu được cấu hình qua `appsettings.json` thay vì hardcode.'
            : '🤖 **PRN212 Testing Guidance:** Check MVVM separation, INotifyPropertyChanged bindings, and decouple configuration from code.'
        )
      } else {
        setAiResponse(
          isVi
            ? `🤖 **Phân tích của Trợ lý AI cho câu hỏi:** "${tutorQuery}"\n\n- **Hướng dẫn sư phạm**: Đặt câu hỏi gợi mở cho sinh viên tự debug thay vì cung cấp mã nguồn đáp án hoàn chỉnh.\n- **Kiểm tra tự động**: Tận dụng cơ chế Sandbox Docker trong hệ thống AITA để biên dịch độc lập, tránh rủi ro bảo mật hệ thống.\n- Bạn có thể vào **Trung tâm Chấm & Queue** để xem chi tiết log phân tích từng testcase.`
            : `🤖 **AI Assistant Analysis:** For "${tutorQuery}", recommend scaffolding questions for students and review sandbox execution logs in the Grading Hub.`
        )
      }
    } finally {
      setAiThinking(false)
    }
  }

  // Appeal Review Modal handlers
  const handleOpenAppealModal = (sub: any) => {
    setReviewAppealModal(sub)
    setAppealNewScore(sub.score ?? sub.finalScore ?? 10)
    setAppealFeedback(sub.instructorFeedback || '')
    setReviewSuccess(null)
  }

  const handleSaveAppealReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewAppealModal?.id) return

    setSubmittingReview(true)
    setReviewSuccess(null)
    try {
      const newScoreNum = Number(appealNewScore)
      await submissionsApi.gradeSubmission(reviewAppealModal.id, {
        finalScore: newScoreNum,
        score: newScoreNum,
        feedback: appealFeedback,
        isPublished: true,
      })

      setReviewSuccess('Đã cập nhật điểm và phản hồi phúc khảo cho sinh viên thành công!')
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === reviewAppealModal.id
            ? { ...s, finalScore: newScoreNum, score: newScoreNum, instructorFeedback: appealFeedback }
            : s
        )
      )

      setTimeout(() => {
        setReviewAppealModal(null)
        setReviewSuccess(null)
      }, 1500)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setSubmittingReview(false)
    }
  }

  // Calculations for metric cards
  const totalClassesCount = classes.length > 0 ? classes.length : 4
  const totalAssignmentsCount = exams.length > 0 ? exams.length : 12
  const totalSubmissionsCount = submissions.length > 0 ? submissions.length : 87
  const aiGradedCount = submissions.filter(
    (s) => s.status === 'graded' || s.gradingStatus === 'Graded' || s.reviewStatus === 'PUBLISHED'
  ).length || 64

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.dashboard.title', 'Không gian Làm việc Giảng viên')}
      headerSubtitle={t('lecturer.dashboard.subtitle', 'Quản lý lớp học, bài tập, giám sát chấm bài AI và thông báo')}
    >
      <div className="w-full space-y-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-5 items-start">
          <div className="lg:col-span-8 space-y-4">
            
            {/* ── 1. TOP 4 METRIC CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: Tổng số lớp học */}
              <Link href="/lecturer/classes" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tổng số lớp học
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {totalClassesCount}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>2 lớp đang hoạt động</span>
                  </div>
                </div>
              </Link>

              {/* Card 2: Tổng bài tập đã giao */}
              <Link href="/lecturer/grading/assignments" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tổng bài tập đã giao
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {totalAssignmentsCount}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>3 sắp hết hạn</span>
                  </div>
                </div>
              </Link>

              {/* Card 3: Tổng bài nộp */}
              <Link href="/lecturer/grading/hub" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tổng bài nộp
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <FileCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {totalSubmissionsCount}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>+12% tuần này</span>
                  </div>
                </div>
              </Link>

              {/* Card 4: Bài đã AI chấm */}
              <Link href="/lecturer/grading/hub" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Bài đã AI chấm
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {aiGradedCount}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>73% tổng số bài</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* ── 2. CHARTS ROW (TÌNH HÌNH LỚP HỌC & TÌNH TRẠNG CHẤM BÀI TỔNG) ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Left Chart: Tình hình lớp học (Grouped Bar Chart) - 7 cols */}
              <Card className="md:col-span-7 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Tình hình lớp học
                      </h4>
                      {hoveredBar && (
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50 truncate max-w-[220px]">
                          {hoveredBar}
                        </span>
                      )}
                    </div>

                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      aria-label="Lọc thời gian tình hình lớp học"
                      className="text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="7days">7 ngày gần đây</option>
                      <option value="30days">30 ngày gần đây</option>
                      <option value="semester">Học kỳ này</option>
                    </select>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]" />
                      <span>Đã nộp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500" />
                      <span>Chưa nộp</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#FBBF24]" />
                      <span>Đang chấm</span>
                    </div>
                  </div>
                </div>

                {/* SVG Bar Chart with balanced height */}
                <div className="w-full h-52 relative flex items-end">
                  {/* Y-axis markers */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-slate-400 font-mono select-none w-5 text-right pr-1">
                    <span>40</span>
                    <span>30</span>
                    <span>20</span>
                    <span>10</span>
                    <span>0</span>
                  </div>

                  {/* Horizontal Guide Lines */}
                  <div className="absolute left-7 right-0 top-1 bottom-6 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-dashed border-slate-200/50 dark:border-slate-800/60 w-full" />
                    <div className="border-b border-dashed border-slate-200/50 dark:border-slate-800/60 w-full" />
                    <div className="border-b border-dashed border-slate-200/50 dark:border-slate-800/60 w-full" />
                    <div className="border-b border-dashed border-slate-200/50 dark:border-slate-800/60 w-full" />
                    <div className="border-b border-slate-200 dark:border-slate-800 w-full" />
                  </div>

                  {/* Bars Container */}
                  <div className="ml-8 w-full h-full flex items-end justify-around pb-6 z-10">
                    {BAR_CHART_DATA.map((item) => {
                      const h1 = (item.submitted / 40) * 100
                      const h2 = (item.missing / 40) * 100
                      const h3 = (item.grading / 40) * 100
                      const isHovered = hoveredBar?.startsWith(item.code)

                      return (
                        <div
                          key={item.code}
                          onMouseEnter={() => setHoveredBar(`${item.code}: ${item.submitted} nộp / ${item.missing} thiếu / ${item.grading} chấm`)}
                          onMouseLeave={() => setHoveredBar(null)}
                          className="flex flex-col items-center gap-2 group cursor-pointer relative"
                        >
                          <div className="flex items-end gap-1.5 sm:gap-2 h-36">
                            {/* Bar 1: Đã nộp */}
                            <div
                              style={{ height: `${h1}%` }}
                              className={cn(
                                'w-3.5 sm:w-4.5 bg-gradient-to-t from-[#2563EB] to-[#60A5FA] rounded-t-sm transition-all duration-300 origin-bottom group-hover:scale-y-105',
                                isHovered && 'ring-2 ring-blue-400/50'
                              )}
                            />
                            {/* Bar 2: Chưa nộp */}
                            <div
                              style={{ height: `${h2}%` }}
                              className={cn(
                                'w-3.5 sm:w-4.5 bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-t-sm transition-all duration-300 origin-bottom group-hover:scale-y-105',
                                isHovered && 'ring-2 ring-slate-400/50'
                              )}
                            />
                            {/* Bar 3: Đang chấm */}
                            <div
                              style={{ height: `${h3}%` }}
                              className={cn(
                                'w-3.5 sm:w-4.5 bg-gradient-to-t from-[#EA580C] to-[#FBBF24] rounded-t-sm transition-all duration-300 origin-bottom group-hover:scale-y-105',
                                isHovered && 'ring-2 ring-orange-400/50'
                              )}
                            />
                          </div>

                          <span className={cn(
                            'text-xs font-mono font-bold px-2 py-0.5 rounded transition-all',
                            isHovered
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          )}>
                            {item.code}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>

              {/* Right Chart: Tình trạng chấm bài (tổng) (Donut Chart) - 5 cols */}
              <Card className="md:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Tình trạng chấm bài (tổng)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Phân bố tiến độ hàng đợi AI & GV
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 my-auto py-2">
                  {/* SVG Donut Graphic */}
                  <div className="relative w-34 h-34 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="gradGraded" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#059669" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <linearGradient id="gradGrading" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#EA580C" />
                          <stop offset="100%" stopColor="#FBBF24" />
                        </linearGradient>
                        <linearGradient id="gradPending" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#94A3B8" />
                          <stop offset="100%" stopColor="#CBD5E1" />
                        </linearGradient>
                      </defs>

                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        className="stroke-slate-100 dark:stroke-slate-800/80"
                        strokeWidth="13"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        stroke="url(#gradGraded)"
                        strokeWidth="13"
                        strokeDasharray="210 289"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        stroke="url(#gradGrading)"
                        strokeWidth="13"
                        strokeDasharray="40 289"
                        strokeDashoffset="-214"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        stroke="url(#gradPending)"
                        strokeWidth="13"
                        strokeDasharray="32 289"
                        strokeDashoffset="-258"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-black text-slate-900 dark:text-white font-mono leading-none">
                        87
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        bài nộp
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2 text-xs w-full max-w-[190px]">
                    <div className="p-2 px-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Đã chấm</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">64</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                          73%
                        </span>
                      </div>
                    </div>

                    <div className="p-2 px-2.5 rounded-lg bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Đang chấm</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">12</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300">
                          14%
                        </span>
                      </div>
                    </div>

                    <div className="p-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Chưa chấm</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">11</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          13%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* ── 3. LOWER TWO CARDS: CÁC LỚP HỌC ĐANG GIẢNG DẠY & BÀI TẬP SẮP HẾT HẠN ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Card 1: Các lớp học đang giảng dạy */}
              <Card className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    Các lớp học đang giảng dạy
                  </h4>
                  <Link
                    href="/lecturer/classes"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-0.5 transition-colors"
                  >
                    <span>Xem tất cả</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-2">
                  {TEACHING_CLASSES.map((cls) => (
                    <div key={cls.code} className="space-y-1 group cursor-pointer">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                            {cls.code}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                            {cls.name}
                          </span>
                          <span className="text-slate-400 text-[10px] font-normal">
                            {cls.students} SV
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                          {cls.progress}%
                        </span>
                      </div>

                      <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${cls.progress}%` }}
                          className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Card 2: Bài tập sắp hết hạn */}
              <Card className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    Bài tập sắp hết hạn
                  </h4>
                  <Link
                    href="/lecturer/grading/assignments"
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-0.5 transition-colors"
                  >
                    <span>Xem tất cả</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-1.5">
                  {UPCOMING_DEADLINES.map((item) => (
                    <div
                      key={item.title}
                      className="p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2 transition-colors group cursor-pointer"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                            {item.code}
                          </span>
                          <h5 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </h5>
                        </div>
                        <p className="text-[10px] text-slate-400 pl-0.5">
                          Hạn: {item.due}
                        </p>
                      </div>

                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0',
                        item.urgent
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/50 font-bold'
                          : 'text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60'
                      )}>
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Appeals indicator (if any) */}
            {submissions.filter((s) => Boolean(s.studentFeedback && s.studentFeedback.trim() !== '')).length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">
                    Có {submissions.filter((s) => Boolean(s.studentFeedback && s.studentFeedback.trim() !== '')).length} đơn phúc khảo điểm đang chờ bạn xử lý
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOpenAppealModal(submissions.find((s) => Boolean(s.studentFeedback && s.studentFeedback.trim() !== '')))}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 px-3 rounded-lg font-bold"
                >
                  Xem ngay
                </Button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT COLUMN (4 COLS)
              ★ ĐẶC BIỆT: KHUNG THÔNG BÁO CHO LÊN ĐẦU GÓC (GIỐNG TRANG BÀN HỌC TẬP)
              ★ THAO TÁC NHANH (QUICK ACTIONS 2x2)
              ★ HOẠT ĐỘNG GẦN ĐÂY (RECENT ACTIVITY FEED)
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* ── ★ 1. BẢNG THÔNG BÁO (NẰM Ở TRÊN ĐẦU GÓC THEO YÊU CẦU ĐẶC BIỆT - KHÔNG KHUNG NGOÀI) ── */}
            <div className="space-y-3.5">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {isVi ? 'Thông báo' : 'Notifications'}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold leading-tight">
                      {unreadCount}
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-colors"
                  >
                    {isVi ? 'Đã đọc tất cả' : 'Mark all read'}
                  </button>
                )}
              </div>

              {/* Feed: Extended Scrollable Area without outer card container */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-500">
                      {isVi ? 'Không có thông báo mới' : 'No new notifications'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notif: any) => {
                    const isUnread = !notif.read && !notif.isRead
                    const type = (notif.type || 'SYSTEM').toUpperCase()

                    let typeLabel = isVi ? 'Thông báo' : 'Notice'
                    if (type === 'SUBMISSION' || type === 'ASSIGNMENT') {
                      typeLabel = isVi ? 'Bài nộp' : 'Submission'
                    } else if (type === 'GRADE') {
                      typeLabel = isVi ? 'Điểm AI' : 'Grade'
                    } else if (type === 'APPEAL') {
                      typeLabel = isVi ? 'Phúc khảo' : 'Appeal'
                    } else if (type === 'SYSTEM') {
                      typeLabel = isVi ? 'Hệ thống' : 'System'
                    }

                    return (
                      <div
                        key={notif.id}
                        className={`group relative rounded-xl p-3 transition-all duration-150 cursor-pointer bg-white dark:bg-slate-900 border ${
                          isUnread
                            ? 'border-slate-200/90 dark:border-slate-800 border-l-3 !border-l-orange-500 shadow-2xs'
                            : 'border-slate-200/70 dark:border-slate-800/80 border-l-3 border-l-transparent hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                              {typeLabel}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 font-medium">
                                {formatRelativeTime(notif.createdAt, isVi)}
                              </span>
                              {isUnread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              )}
                            </div>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors leading-snug line-clamp-1">
                            {notif.title}
                          </h4>

                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {notif.message || notif.content}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Link */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                <Link
                  href="/lecturer/notifications"
                  className="font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  {isVi ? 'Xem tất cả thông báo →' : 'View all →'}
                </Link>
                <span className="text-slate-400">
                  {notifications.length} {isVi ? 'mục' : 'items'}
                </span>
              </div>
            </div>

            {/* ── 2. THAO TÁC NHANH (QUICK ACTIONS 2x2) ── */}
            <div className="space-y-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Thao tác nhanh
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Tạo bài tập mới */}
                <Link href="/lecturer/grading/assignments">
                  <Card className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-xs transition-all flex items-center gap-2.5 group cursor-pointer h-15">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/15 text-[#FA7014] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Plus className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 transition-colors truncate">
                      Tạo bài tập mới
                    </span>
                  </Card>
                </Link>

                {/* 2. Xem danh sách lớp */}
                <Link href="/lecturer/classes">
                  <Card className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-xs transition-all flex items-center gap-2.5 group cursor-pointer h-15">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 transition-colors truncate">
                      Danh sách lớp
                    </span>
                  </Card>
                </Link>

                {/* 3. Xem báo cáo */}
                <Link href="/lecturer/grading/hub">
                  <Card className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-xs transition-all flex items-center gap-2.5 group cursor-pointer h-15">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <BarChart3 className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 transition-colors truncate">
                      Xem báo cáo
                    </span>
                  </Card>
                </Link>

                {/* 4. Trò chuyện với AI */}
                <button
                  type="button"
                  onClick={() => {
                    setAiModalOpen(true)
                    setTutorQuery('Hướng dẫn tạo rubric AI chuẩn cho môn học')
                    handleAskAi()
                  }}
                  className="w-full text-left"
                >
                  <Card className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-xs transition-all flex items-center gap-2.5 group cursor-pointer h-15">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-600 transition-colors truncate">
                      Chat với AI
                    </span>
                  </Card>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* ── AI TUTOR RESPONSE MODAL ── */}
        <Modal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          title="Trợ lý AI Giảng dạy (AITA Tutor)"
          description="Hỗ trợ giải đáp chuyên môn, thiết kế bài tập và hướng dẫn sư phạm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/50">
              <span className="font-bold text-orange-800 dark:text-orange-300 block mb-1">
                Câu hỏi của Giảng viên:
              </span>
              <p className="text-slate-800 dark:text-slate-200 italic">
                &ldquo;{tutorQuery || 'Hướng dẫn tạo rubric AI chuẩn cho môn học'}&rdquo;
              </p>
            </div>

            {aiThinking ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                <p className="text-xs font-medium text-slate-500">
                  AI đang phân tích câu hỏi và tổng hợp câu trả lời...
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200">
                {aiResponse}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAiModalOpen(false)}
                className="text-xs font-bold px-4"
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── REVIEW APPEAL MODAL (PRESERVED) ── */}
        <Modal
          isOpen={Boolean(reviewAppealModal)}
          onClose={() => setReviewAppealModal(null)}
          title="Xử lý Đơn Phúc khảo Điểm"
          description={`Sinh viên: ${reviewAppealModal?.studentName || reviewAppealModal?.studentId || ''} • Bài tập: ${reviewAppealModal?.assignmentTitle || 'Assignment'}`}
        >
          {reviewAppealModal && (
            <form onSubmit={handleSaveAppealReview} className="space-y-4 text-xs">
              {reviewSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl font-medium border border-emerald-200">
                  {reviewSuccess}
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  Lý do phúc khảo của sinh viên:
                </span>
                <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  &ldquo;{reviewAppealModal.studentFeedback}&rdquo;
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Điểm số sau khi phúc khảo (Thang điểm 10)</span>
                  <span className="text-slate-400 font-normal">
                    Điểm gốc: <strong className="text-orange-600">{reviewAppealModal.score ?? reviewAppealModal.finalScore ?? 0}</strong>
                  </span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  required
                  value={appealNewScore}
                  onChange={(e) => setAppealNewScore(e.target.value)}
                  className="font-mono text-sm font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Phản hồi giải trình từ Giảng viên (Hiển thị tới sinh viên)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ghi rõ lý do điều chỉnh hoặc giữ nguyên điểm..."
                  value={appealFeedback}
                  onChange={(e) => setAppealFeedback(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FA7014]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setReviewAppealModal(null)}
                  className="text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={submittingReview}
                  className="text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Xác nhận & Cập nhật điểm</span>
                </Button>
              </div>
            </form>
          )}
        </Modal>

      </div>
    </DashboardLayout>
  )
}
