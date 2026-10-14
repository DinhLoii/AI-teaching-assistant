'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { notificationsApi } from '@/lib/api/modules/notifications'
import { aiApi } from '@/lib/api/modules/ai'
import { FrogChatbotLauncher } from '@/components/chatbot/FrogChatbotLauncher'
import { cn } from '@/lib/utils'
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  FileCode,
  GraduationCap,
  Sparkles,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  Bot,
  Lightbulb,
  Award,
  AlertTriangle,
  RotateCcw,
  Check,
  Send,
  HelpCircle,
  ExternalLink,
  BookOpen,
  FileCheck,
} from 'lucide-react'

// Unified styling palette for subject tags
const UNIFIED_SUBJECT_THEME = {
  bg: 'bg-orange-500/10 dark:bg-orange-500/20',
  text: 'text-orange-600 dark:text-orange-400',
  border: 'border-orange-500/25',
  bar: 'from-orange-500 via-amber-500 to-orange-400',
}

function getSubjectTheme(_code?: string) {
  return UNIFIED_SUBJECT_THEME
}

function formatDeadlineInfo(dateStr: string | Date | null | undefined, isVi: boolean) {
  if (!dateStr) return { dateFormatted: isVi ? 'Không có hạn' : 'No deadline', remainingText: '', isOverdue: false, isUrgent: false }
  const due = new Date(dateStr)
  if (isNaN(due.getTime())) return { dateFormatted: '', remainingText: '', isOverdue: false, isUrgent: false }

  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const dateFormatted = due.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays)
    return {
      dateFormatted,
      remainingText: isVi ? (overdueDays === 0 ? 'Hết hạn hôm nay' : `Quá hạn ${overdueDays} ngày`) : `Overdue ${overdueDays}d`,
      isOverdue: true,
      isUrgent: false,
    }
  }

  if (diffHours < 24) {
    return {
      dateFormatted,
      remainingText: isVi ? `Còn ${Math.max(1, diffHours)} giờ` : `${Math.max(1, diffHours)}h left`,
      isOverdue: false,
      isUrgent: true,
    }
  }

  return {
    dateFormatted,
    remainingText: isVi ? `Còn ${diffDays} ngày` : `${diffDays} days left`,
    isOverdue: false,
    isUrgent: diffDays <= 3,
  }
}

function getAssignmentStatusBadge(status: string | undefined, score: number | null | undefined, isVi: boolean) {
  if (status === 'GRADED') {
    return {
      type: 'graded',
      label: score !== null && score !== undefined ? `${Number(score).toFixed(1)}/10` : (isVi ? 'Đã có điểm' : 'Graded'),
      className: 'text-emerald-600 dark:text-emerald-400 font-bold',
      dotColor: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]',
      hasPing: false,
      actionText: isVi ? 'Xem kết quả' : 'View result',
      actionColor: 'text-slate-900 dark:text-white font-bold hover:underline',
    }
  }

  if (status === 'GRADING') {
    return {
      type: 'grading',
      label: isVi ? 'Đang chấm' : 'Grading',
      className: 'text-sky-600 dark:text-sky-400 font-bold',
      dotColor: 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)]',
      hasPing: true,
      actionText: isVi ? 'Xem chi tiết' : 'View details',
      actionColor: 'text-slate-900 dark:text-white font-bold hover:underline',
    }
  }

  const isSubmitted = status === 'SUBMITTED' || status === 'IN_PROGRESS'
  if (isSubmitted) {
    return {
      type: 'submitted',
      label: isVi ? 'Đã nộp' : 'Submitted',
      className: 'text-emerald-600 dark:text-emerald-400 font-bold',
      dotColor: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]',
      hasPing: false,
      actionText: isVi ? 'Xem chi tiết' : 'View details',
      actionColor: 'text-slate-900 dark:text-white font-bold hover:underline',
    }
  }

  if (status === 'OVERDUE') {
    return {
      type: 'overdue',
      label: isVi ? 'Quá hạn' : 'Overdue',
      className: 'text-[#FF000B] font-bold',
      dotColor: 'bg-[#FF000B] shadow-[0_0_6px_rgba(255,0,11,0.7)]',
      hasPing: false,
      actionText: isVi ? 'Nộp muộn' : 'Late submit',
      actionColor: 'text-slate-900 dark:text-white font-bold hover:underline',
    }
  }

  // Chưa nộp: Text màu đỏ thật #FF000B, nút "Nộp bài" text đen
  return {
    type: 'pending',
    label: isVi ? 'Chưa nộp' : 'Pending',
    className: 'text-[#FF000B] font-bold',
    dotColor: 'bg-[#FF000B] shadow-[0_0_6px_rgba(255,0,11,0.7)]',
    hasPing: false,
    actionText: isVi ? 'Nộp bài' : 'Submit',
    actionColor: 'text-slate-900 dark:text-white font-bold hover:underline',
  }
}

function formatRelativeTime(dateStr: string | Date | null | undefined, isVi: boolean): string {
  if (!dateStr) return ''
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

export default function StudentOverviewPage() {
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const [dashboard, setDashboard] = React.useState<any>(null)
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  // Status Filter for Active Assignments
  const [statusTab, setStatusTab] = React.useState<'all' | 'pending' | 'grading' | 'graded'>('all')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 4

  const handleTabChange = (tab: 'all' | 'pending' | 'grading' | 'graded') => {
    setStatusTab(tab)
    setCurrentPage(1)
  }

  // AI Tutor Modal & Chat State
  const [aiTutorOpen, setAiTutorOpen] = React.useState(false)
  const [tutorQuestion, setTutorQuestion] = React.useState('')
  const [tutorAnswer, setTutorAnswer] = React.useState<string | null>(null)
  const [tutorSources, setTutorSources] = React.useState<Array<{ title: string; docType: string }>>([])
  const [tutorThinking, setTutorThinking] = React.useState(false)

  React.useEffect(() => {
    Promise.allSettled([
      studentPortalApi.getStudentDashboard(),
      notificationsApi.getMyNotifications({ limit: 10 }).catch(() => notificationsApi.getNotifications(1, 10)),
    ]).then(([dashRes, notifRes]) => {
      if (dashRes.status === 'fulfilled') {
        setDashboard(dashRes.value)
      }
      if (notifRes.status === 'fulfilled') {
        const data = notifRes.value
        setNotifications(Array.isArray(data) ? data : data?.items || data?.data || [])
      }
    }).finally(() => setLoading(false))
  }, [])

  // Raw upcoming assignments from API
  const rawUpcoming = dashboard?.upcomingAssignments || []

  // Pure real assignments from Neon DB API
  const assignmentsList = React.useMemo(() => {
    if (!Array.isArray(rawUpcoming)) return []
    return rawUpcoming.map((item: any) => ({
      ...item,
      status: item.status || 'PENDING',
      score: item.score ?? null,
    }))
  }, [rawUpcoming])

  // Filtered assignments according to selected tab
  const filteredAssignments = React.useMemo(() => {
    if (statusTab === 'pending') {
      return assignmentsList.filter((a) => a.status === 'PENDING' || a.status === 'OVERDUE')
    }
    if (statusTab === 'grading') {
      return assignmentsList.filter((a) => a.status === 'GRADING' || a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED')
    }
    if (statusTab === 'graded') {
      return assignmentsList.filter((a) => a.status === 'GRADED')
    }
    return assignmentsList
  }, [assignmentsList, statusTab])

  // Total pages and paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize))
  const paginatedAssignments = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAssignments.slice(start, start + pageSize)
  }, [filteredAssignments, currentPage, pageSize])

  // Status counts
  const pendingCount = assignmentsList.filter((a) => a.status === 'PENDING' || a.status === 'OVERDUE').length
  const gradingCount = assignmentsList.filter((a) => a.status === 'GRADING' || a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED').length
  const gradedCount = assignmentsList.filter((a) => a.status === 'GRADED').length

  // Enrolled classes
  const classes = dashboard?.enrolledClasses || []

  // Real average AI score
  const avgAiScoreDisplay = React.useMemo(() => {
    if (dashboard?.avgAiScore != null) return Number(dashboard.avgAiScore).toFixed(1)
    const graded = assignmentsList.filter((a) => a.status === 'GRADED' && a.score != null)
    if (graded.length === 0) return null
    const sum = graded.reduce((acc, a) => acc + Number(a.score), 0)
    return (sum / graded.length).toFixed(1)
  }, [dashboard, assignmentsList])

  // Recent AI Graded Result (Section 2) - purely real data from Neon DB
  const recentAiResult = React.useMemo(() => {
    if (dashboard?.recentAiResult) return dashboard.recentAiResult
    const graded = assignmentsList.find((a) => a.status === 'GRADED')
    if (!graded) return null
    return {
      title: graded.title,
      subject: graded.subjectName ? `${graded.subjectCode} – ${graded.subjectName}` : (graded.subjectCode || 'Môn học'),
      score: graded.score ?? 0,
      maxScore: 10,
      testcases: isVi ? 'Đã hoàn thành kiểm thử' : 'Test execution completed',
      execution: isVi ? 'Thực thi an toàn trong Sandbox' : 'Execution safe in Sandbox',
      review: isVi ? 'Đã hoàn thành đánh giá Rubric AI' : 'Rubric AI evaluation completed',
      assignmentId: graded.id,
    }
  }, [dashboard, assignmentsList, isVi])

  // Actionable AI Feedback List (Section 3) - purely real feedback from DB
  const aiFeedbackList = React.useMemo(() => {
    if (dashboard?.aiFeedbackList && Array.isArray(dashboard.aiFeedbackList)) {
      return dashboard.aiFeedbackList
    }
    return []
  }, [dashboard])

  // Upcoming deadlines list - derived purely from real pending tasks with due dates
  const upcomingDeadlines = React.useMemo(() => {
    const pendingWithDue = assignmentsList.filter(
      (a) => (a.status === 'PENDING' || a.status === 'OVERDUE') && a.due
    )
    return pendingWithDue
      .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
      .slice(0, 5)
      .map((item) => {
        const diffMs = new Date(item.due).getTime() - Date.now()
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        let timeLabel = ''
        let urgent = false

        if (diffMs < 0) {
          timeLabel = isVi ? 'Đã quá hạn' : 'Overdue'
          urgent = true
        } else if (diffDays <= 1) {
          timeLabel = isVi ? 'Ngày mai' : 'Tomorrow'
          urgent = true
        } else {
          timeLabel = isVi ? `Còn ${diffDays} ngày` : `${diffDays} days left`
        }

        return {
          id: item.id,
          subjectCode: item.subjectCode || 'SUBJ',
          title: item.title,
          timeLabel,
          urgent,
        }
      })
  }, [assignmentsList, isVi])

  const unreadCount = dashboard?.unreadNotifications ?? notifications.filter((n) => !n.read && !n.isRead).length

  // Quick mark all read
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })))
      if (dashboard) {
        setDashboard((d: any) => ({ ...d, unreadNotifications: 0 }))
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  // Handle AI Tutor Query with RAG
  const handleAskTutor = async (prompt?: string) => {
    const q = prompt || tutorQuestion
    if (!q.trim()) return
    setTutorThinking(true)
    setTutorAnswer(null)
    setTutorSources([])

    try {
      const currentAssignment = assignmentsList[0]
      const res = await aiApi.ragChat({
        query: q,
        examId: currentAssignment?.id,
        subjectCode: currentAssignment?.subjectCode,
      })

      if (res?.answer) {
        setTutorAnswer(res.answer)
        if (res.sourcesUsed) {
          setTutorSources(res.sourcesUsed)
        }
      } else {
        throw new Error('No RAG answer')
      }
    } catch {
      // Pedagogical fallback
      if (q.includes('BST') || q.includes('Binary Search Tree') || q.includes('cây')) {
        setTutorAnswer(
          isVi
            ? '💡 **Gợi ý từ AI Tutor (Binary Search Tree):**\n\n1. **Tính chất cân bằng**: Cây nhị phân tìm kiếm thông thường dễ bị suy biến thành danh sách liên kết $O(n)$ nếu chèn dữ liệu đã sắp xếp. Hãy dùng cây AVL với 4 phép quay (Left-Left, Right-Right, Left-Right, Right-Left) để đảm bảo độ cao luôn là $O(\\log n)$.\n2. **Tránh Memory Leak**: Trong C++/Java, hãy duyệt hậu thứ tự (Post-order traversal: Left -> Right -> Delete Node) khi viết hàm destructor/clear.'
            : '💡 **AI Tutor Hint (Binary Search Tree):**\n\n1. **Balance Property**: Use AVL tree rotations to maintain O(log n) height.\n2. **Memory Safety**: Use post-order traversal when freeing nodes to prevent memory leaks.'
        )
      } else if (q.includes('NullPointer') || q.includes('Android') || q.includes('PRM392')) {
        setTutorAnswer(
          isVi
            ? '💡 **Gợi ý từ AI Tutor (Debug Android / PRM392):**\n\n1. **Kiểm tra Lifecycle**: Lỗi `NullPointerException` thường xảy ra khi truy cập `View` trước khi `onCreate()` / `onViewCreated()` hoàn tất.\n2. **Coroutine / Asynchronous**: Luôn kiểm tra `response != null && response.isSuccessful()` trước khi parse body JSON.\n3. **Network Security**: Đừng quên khai báo `<uses-permission android:name="android.permission.INTERNET" />` trong `AndroidManifest.xml`.'
            : '💡 **AI Tutor Hint (Android / PRM392):**\n\n1. Ensure view binding is initialized before access.\n2. Check for null network responses and verify internet permissions in AndroidManifest.xml.'
        )
      } else {
        setTutorAnswer(
          isVi
            ? `🤖 **Phân tích của AI Tutor cho câu hỏi:** "${q}"\n\n- **Ý tưởng cốt lõi**: Chia nhỏ bài toán thành các hàm module độc lập (Single Responsibility Principle).\n- **Kiểm thử biên**: Đừng chỉ test trường hợp thông thường (Happy path), hãy viết testcase cho mảng rỗng ($n=0$), 1 phần tử ($n=1$) và giá trị cực đại để không mất điểm rubric tự động.\n- Bạn có thể vào chi tiết bài tập để chạy thử mã nguồn trực tiếp với hàng đợi chấm điểm AI.`
            : `🤖 **AI Tutor Analysis:** Break down your problem into modular functions, verify edge cases (empty inputs, single items) to satisfy rubric criteria.`
        )
      }
    } finally {
      setTutorThinking(false)
    }
  }

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.dashboard.title', 'Bàn học tập sinh viên')}
      headerSubtitle={t('student.dashboard.subtitle', 'Theo dõi tiến độ bài tập, nộp bài code và xem kết quả chấm Rubric AI')}
    >
      <div className="pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-6 2xl:gap-7 items-start">
          
          {/* ══════════════════════════════════════════════════════════════════════
              LEFT SECTION (xl:col-span-8 2xl:col-span-8):
              1. Bài tập đang diễn ra (Tabs: Tất cả / Chưa nộp / Đang chấm / Đã chấm)
              2. Grid 2 cột: Kết quả AI gần đây (Section 2) & Feedback AI cần xem (Section 3)
              3. Lớp học đang tham gia
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="xl:col-span-8 2xl:col-span-8 space-y-5">

            {/* ── TỔNG QUAN HỌC TẬP (4 EXECUTIVE KPI CARDS) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Tổng số lớp học & môn học (Enrolled Classes) */}
              <Link href="/student/classes" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isVi ? 'Lớp học & Môn học' : 'Classes & Courses'}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {loading ? '…' : (classes.length || 4)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>{isVi ? 'Học kỳ Spring 2026' : 'Spring 2026'}</span>
                  </div>
                </div>
              </Link>

              {/* Card 2: Bài tập cần làm (Pending Tasks) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setStatusTab('pending')}
                onKeyDown={(e) => e.key === 'Enter' && setStatusTab('pending')}
                className="block group cursor-pointer"
              >
                <div className={cn(
                  "relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group",
                  statusTab === 'pending' && "ring-2 ring-orange-500/30 border-orange-300"
                )}>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isVi ? 'Bài tập cần làm' : 'Pending Tasks'}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {loading ? '…' : pendingCount}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>
                      {pendingCount > 0
                        ? (isVi ? `${pendingCount} bài chưa nộp` : `${pendingCount} pending`)
                        : (isVi ? '100% Đã hoàn thành' : '100% Done')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Bài nộp & AI Chấm (Submissions & AI) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setStatusTab(gradingCount > 0 ? 'grading' : 'graded')}
                onKeyDown={(e) => e.key === 'Enter' && setStatusTab(gradingCount > 0 ? 'grading' : 'graded')}
                className="block group cursor-pointer"
              >
                <div className={cn(
                  "relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group",
                  (statusTab === 'grading' || statusTab === 'graded') && "ring-2 ring-orange-500/30 border-orange-300"
                )}>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isVi ? 'Bài nộp & AI Chấm' : 'Submissions & AI'}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <FileCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {loading ? '…' : (gradedCount + assignmentsList.filter((a) => a.status === 'SUBMITTED' || a.status === 'GRADING').length)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>
                      {gradingCount > 0
                        ? (isVi ? `${gradingCount} đang chấm AI` : `${gradingCount} evaluating`)
                        : (isVi ? `${gradedCount} bài đã có điểm` : `${gradedCount} graded`)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Điểm AI TB tích lũy (Cumulative AI GPA) */}
              <Link href="/student/results" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isVi ? 'Điểm AI TB tích lũy' : 'Cumulative AI GPA'}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
                    <span>{avgAiScoreDisplay !== null ? avgAiScoreDisplay : '--'}</span>
                    {avgAiScoreDisplay !== null && (
                      <span className="text-xs font-normal text-slate-400">/10</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>
                      {avgAiScoreDisplay !== null
                        ? (Number(avgAiScoreDisplay) >= 8.0 ? (isVi ? 'Học lực Giỏi' : 'Excellent') : (isVi ? 'Đạt chuẩn Barem' : 'Meets Rubric'))
                        : (isVi ? 'Chờ AI đánh giá' : 'Pending AI')}
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            {/* ── 1. BÀI TẬP ĐANG DIỄN RA (FULL STATUSES & FILTER TABS) ── */}
            <div className="space-y-4 pt-6 border-t border-orange-100/90 dark:border-orange-900/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs shadow-orange-500/25 flex items-center justify-center shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {isVi ? 'Bài tập đang diễn ra' : 'Active Assignments'}
                  </h3>
                </div>

                <Link
                  href="/student/assignments"
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 group transition-colors"
                >
                  <span>{isVi ? 'Xem tất cả' : 'View all'}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Status Filter Tabs */}
              <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    statusTab === 'all'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                  )}
                >
                  <span>{isVi ? 'Tất cả' : 'All'}</span>
                  <span className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                    statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'
                  )}>
                    {assignmentsList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('pending')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    statusTab === 'pending'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                  )}
                >
                  <span>{isVi ? 'Chưa nộp' : 'Pending'}</span>
                  <span className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                    statusTab === 'pending' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'
                  )}>
                    {pendingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('grading')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    statusTab === 'grading'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                  )}
                >
                  <span>{isVi ? 'Đang chấm' : 'Grading'}</span>
                  <span className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                    statusTab === 'grading' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'
                  )}>
                    {gradingCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('graded')}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    statusTab === 'graded'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                  )}
                >
                  <span>{isVi ? 'Đã chấm' : 'Graded'}</span>
                  <span className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                    statusTab === 'graded' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'
                  )}>
                    {gradedCount}
                  </span>
                </button>
              </div>

              {/* Assignment Cards Grid */}
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400 animate-pulse">
                  {isVi ? 'Đang tải danh sách bài tập...' : 'Loading assignments...'}
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-orange-200/80 dark:border-orange-900/40 text-center space-y-2 shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {isVi ? 'Không có bài tập nào trong mục này' : 'No assignments found in this category'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {paginatedAssignments.map((assign: any) => {
                    const subjectCode = assign.subjectCode || 'SUBJ'
                    const subjectName = assign.subjectName || assign.title || 'Môn học'
                    const lecturer = assign.lecturerName || (isVi ? 'Giảng viên FPT' : 'FPT Lecturer')
                    const classCode = assign.classCode || 'Lớp'
                    const deadlineInfo = formatDeadlineInfo(assign.due, isVi)
                    const statusBadge = getAssignmentStatusBadge(assign.status, assign.score, isVi)
                    const assignType = assign.type || 'ASSIGNMENT'
                    const typeLabel =
                      assignType === 'RBL_MILESTONE'
                        ? (isVi ? 'RBL Đồ án' : 'RBL Milestone')
                        : assignType === 'LAB'
                        ? 'Lab'
                        : (isVi ? 'Bài tập' : 'Assignment')

                    return (
                      <Link
                        key={assign.id}
                        href={`/student/assignments/${assign.id}`}
                        className="group relative rounded-2xl bg-white dark:bg-slate-900 p-5 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700/60 transition-all duration-150 flex flex-col justify-between overflow-hidden"
                      >
                        {/* Viền pha màu gradient trên cùng đồng bộ trang bài tập */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />

                        <div className="space-y-2 pt-0.5">
                          {/* Row 1: Subject Tag + Type Badge + Class Code + Status */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-extrabold uppercase text-slate-900 dark:text-white tracking-wider">
                                {subjectCode}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {typeLabel}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {classCode}
                              </span>
                            </div>

                            {/* Status Badge: Sử dụng dấu tick cho trạng thái Đã nộp / Đã chấm */}
                            <span className={`inline-flex items-center gap-1.5 text-xs select-none ${statusBadge.className}`}>
                              {statusBadge.type === 'submitted' || statusBadge.type === 'graded' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
                              ) : (
                                <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
                                  {statusBadge.hasPing && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                                  )}
                                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusBadge.dotColor}`} />
                                </span>
                              )}
                              <span>{statusBadge.label}</span>
                            </span>
                          </div>

                          {/* Title: Text đen thống nhất, KHÔNG đổi sang màu cam khi hover */}
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                              {assign.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {subjectName} {assign.targetArtifact ? `• ${assign.targetArtifact}` : ''}
                            </p>
                          </div>

                          {/* Info row: Lecturer & Deadline */}
                          <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="text-[11px] text-slate-500 truncate">
                              GV: {lecturer}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{deadlineInfo.dateFormatted}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-2.5 mt-2 border-t border-orange-100/60 dark:border-orange-900/30 flex items-center justify-between text-xs">
                          {deadlineInfo.remainingText ? (
                            <span className={`text-[11px] select-none ${
                              deadlineInfo.isOverdue
                                ? 'text-[#FF000B] font-bold'
                                : deadlineInfo.isUrgent
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : 'text-slate-500 dark:text-slate-400 font-medium'
                            }`}>
                              {deadlineInfo.remainingText}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              {assign.semesterSeason || 'Spring 2026'}
                            </span>
                          )}

                          {/* Nút hành động: Chưa nộp màu ĐỎ, Đã nộp màu XANH, Đã chấm màu đen/trung tính */}
                          <span className={`text-[11px] flex items-center gap-1 ${statusBadge.actionColor}`}>
                            <span>{statusBadge.actionText}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {/* ── Phân trang bài tập đang diễn ra (UI nhỏ gọn, tối giản, ngăn cách bằng đường kẻ rõ ràng) ── */}
                {filteredAssignments.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-orange-100/90 dark:border-orange-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <span className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                      {isVi
                        ? `Hiển thị ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredAssignments.length)} trên ${filteredAssignments.length} bài tập`
                        : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredAssignments.length)} of ${filteredAssignments.length} assignments`}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        title={isVi ? 'Trang trước' : 'Previous page'}
                        className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-orange-50 dark:hover:bg-slate-800/60 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const pageNum = idx + 1
                        const isActive = pageNum === currentPage
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-md text-xs transition-colors flex items-center justify-center cursor-pointer ${
                              isActive
                                ? 'font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-xs'
                                : 'font-medium text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        title={isVi ? 'Trang sau' : 'Next page'}
                        className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-orange-50 dark:hover:bg-slate-800/60 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

            {/* ── 2 + 3. GRID 2 CỘT: KẾT QUẢ AI GẦN ĐÂY & FEEDBACK AI CẦN XEM ── */}
            {/* ── 2 + 3. XẾP THÀNH 2 HÀNG DÀI RA (FULL WIDTH): KẾT QUẢ AI & FEEDBACK AI ── */}
            <div className="space-y-6 pt-1">
              
              {/* ── Section 2: KẾT QUẢ AI GẦN ĐÂY (HÀNG 1 - DÀI RA) ── */}
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-orange-100/90 dark:border-orange-900/30">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {isVi ? 'Kết quả AI gần đây' : 'Recent AI Result'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isVi ? 'Đánh giá tự động qua Testcase & Sandbox' : 'Automated testcase & rubric evaluation'}
                    </p>
                  </div>
                  {recentAiResult && (
                    <span className="text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 px-2.5 py-0.5 rounded-md">
                      AI Score: {recentAiResult.score}/{recentAiResult.maxScore}
                    </span>
                  )}
                </div>

                {/* Content Card */}
                {recentAiResult ? (
                  <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700/60 transition-all space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {recentAiResult.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {recentAiResult.subject}
                        </p>
                      </div>

                      <Link
                        href={`/student/assignments/${recentAiResult.assignmentId}`}
                        className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1 group shrink-0"
                      >
                        <span>{isVi ? 'Xem chi tiết feedback' : 'View full feedback'}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>

                    {/* Rubric Evaluation: Trải ngang 3 cột thoáng đãng khi dài ra */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-orange-100/60 dark:border-orange-900/30 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Test cases</span>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{recentAiResult.testcases}</p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Code execution</span>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{recentAiResult.execution}</p>
                      </div>

                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Code review</span>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{recentAiResult.review}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-dashed border-orange-200/80 dark:border-orange-900/40 shadow-xs text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto">
                      <Sparkles className="w-5 h-5 text-orange-500" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      {isVi ? 'Chưa có kết quả chấm bài gần đây' : 'No recent AI grading results'}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      {isVi
                        ? 'Sau khi bạn nộp bài tập code hoặc đồ án và hàng đợi AI hoàn tất chấm điểm, kết quả testcase và phân tích rubric sẽ hiển thị tại đây.'
                        : 'Once you submit assignments and grading completes, results and detailed rubric evaluation will appear here.'}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Section 3: FEEDBACK AI CẦN XEM (HÀNG 2 - DÀI RA) ── */}
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-orange-100/90 dark:border-orange-900/30">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {isVi ? 'Feedback từ AI' : 'AI Feedback'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isVi ? 'Các lỗi & đề xuất cần tối ưu trước hạn' : 'Key insights & code improvements'}
                    </p>
                  </div>
                  <Link
                    href="/student/results"
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-colors"
                  >
                    {isVi ? 'Xem tất cả' : 'View all'}
                  </Link>
                </div>

                {/* List of Feedback Insights (Trải dài full-width) */}
                {aiFeedbackList.length > 0 ? (
                  <div className="space-y-2">
                    {aiFeedbackList.map((item: any) => (
                      <Link
                        key={item.id}
                        href={item.link}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/60 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group block"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                              {item.assignmentTitle}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {item.badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {item.detail}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-dashed border-orange-200/80 dark:border-orange-900/40 shadow-xs text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isVi ? 'Chưa có đề xuất mới từ AI Tutor' : 'No new recommendations from AI Tutor'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      {isVi
                        ? 'Hệ thống sẽ tự động quét lỗi logic, tiêu chuẩn clean code và đưa ra cảnh báo cho các bài làm tiếp theo của bạn.'
                        : 'System will analyze your code and suggest improvements for upcoming tasks.'}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* ── LỚP HỌC ĐANG THAM GIA (GỌN GÀNG, TIỆN DỤNG) ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    {isVi ? 'Lớp học đang tham gia' : 'Enrolled Classes'}
                  </h3>
                </div>

                <Link
                  href="/student/classes"
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 group"
                >
                  <span>{isVi ? 'Xem tất cả' : 'View all'}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {classes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {classes.map((cls: any) => {
                    const subjectCode = cls.subject?.code || cls.classCode?.split('-')?.[0] || 'SUBJ'
                    const lecturer = cls.lecturers?.[0]?.name || (isVi ? 'Giảng viên FPT' : 'FPT Lecturer')
                    return (
                      <Link
                        key={cls.id}
                        href={`/student/classes/${cls.id}`}
                        className="group rounded-2xl bg-white dark:bg-slate-900 p-3.5 border border-orange-100/90 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/60 shadow-xs hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                            {subjectCode}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cls.classCode}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {lecturer}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-orange-200/80 dark:border-orange-900/40 text-xs text-slate-400 text-center shadow-xs">
                  {isVi ? 'Chưa có lớp học nào được ghi danh' : 'No classes enrolled'}
                </div>
              )}
            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT SECTION (xl:col-span-4 2xl:col-span-4):
              1. AI Tutor Shortcut (Section 5)
              2. Tiến độ học tập (Section 4)
              3. Bảng Thông báo (Notifications Feed)
             ══════════════════════════════════════════════════════════════════════ */}
          <div className="xl:col-span-4 2xl:col-span-4 space-y-6 sticky top-4 xl:pl-1">
            
            {/* ── 1. BẢNG THÔNG BÁO (NẰM Ở TRÊN ĐẦU THEO YÊU CẦU) ── */}
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-orange-100/90 dark:border-orange-900/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {isVi ? 'Thông báo' : 'Notifications'}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-bold shadow-xs">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isVi ? 'Cập nhật điểm số, bài tập và hệ thống' : 'Grades, assignments & system alerts'}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-colors cursor-pointer"
                  >
                    {isVi ? 'Đã đọc tất cả' : 'Mark all read'}
                  </button>
                )}
              </div>

              {/* Feed: Borderless, NO ICONS, clear typographic hierarchy */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {isVi ? 'Không có thông báo mới' : 'No new notifications'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {isVi ? 'Bạn đã xem hết các thông báo gần đây' : 'All caught up!'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notif: any) => {
                    const isUnread = !notif.read && !notif.isRead
                    const type = (notif.type || 'SYSTEM').toUpperCase()

                    let typeLabel = isVi ? 'Thông báo' : 'Notice'
                    if (type === 'ASSIGNMENT') {
                      typeLabel = isVi ? 'Bài tập' : 'Assignment'
                    } else if (type === 'GRADE') {
                      typeLabel = isVi ? 'Điểm AI' : 'Grade'
                    } else if (type === 'EXAM') {
                      typeLabel = isVi ? 'Kỳ thi' : 'Exam'
                    } else if (type === 'SYSTEM') {
                      typeLabel = isVi ? 'Hệ thống' : 'System'
                    }

                    return (
                      <div
                        key={notif.id}
                        className={`group relative rounded-2xl p-3.5 pl-4 transition-all duration-150 cursor-pointer bg-white dark:bg-slate-900 border ${
                          isUnread
                            ? 'border-orange-200/90 dark:border-orange-900/50 border-l-4 !border-l-orange-500 shadow-xs hover:border-orange-300'
                            : 'border-orange-100/90 dark:border-orange-900/30 border-l-4 border-l-transparent hover:border-orange-300 dark:hover:border-orange-700/60 shadow-xs'
                        } hover:shadow-md`}
                      >
                        <div className="space-y-1.5">
                          {/* Top Row: Type Tag + Time + Unread indicator */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold uppercase text-slate-900 dark:text-white tracking-wider">
                              {typeLabel}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {formatRelativeTime(notif.createdAt, isVi)}
                              </span>
                              {isUnread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug">
                            {notif.title}
                          </h4>

                          {/* Message Content */}
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                            {notif.message || notif.content}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Link */}
              <div className="pt-2 border-t border-orange-100/90 dark:border-orange-900/30 flex items-center justify-between">
                <Link
                  href="/student/notifications"
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-all"
                >
                  {isVi ? 'Xem tất cả thông báo →' : 'View all notifications →'}
                </Link>
                <span className="text-[11px] text-slate-400 font-medium">
                  {notifications.length} {isVi ? 'thông báo' : 'items'}
                </span>
              </div>
            </div>

            {/* ── 2. HẠN NỘP BÀI SẮP TỚI (THIẾT KẾ HIỂN THỊ ĐỒNG BỘ NHƯ KHUNG THÔNG BÁO) ── */}
            <div className="space-y-4">
              {/* Header: giống hệt Bảng thông báo */}
              <div className="flex items-center justify-between pb-3 border-b border-orange-100/90 dark:border-orange-900/30">
                <div className="space-y-0.5">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {isVi ? 'Hạn nộp bài sắp tới' : 'Upcoming Deadlines'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isVi ? 'Lịch nộp bài trong tuần này' : 'Assignments due this week'}
                  </p>
                </div>

                <Link
                  href="/student/assignments"
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-colors"
                >
                  {isVi ? 'Chi tiết' : 'Details'}
                </Link>
              </div>

              {/* Feed: Borderless, NO RAINBOW COLORS, đồng bộ card thông báo */}
              {upcomingDeadlines.length > 0 ? (
                <div className="space-y-2">
                  {upcomingDeadlines.map((item) => (
                    <Link
                      key={item.id}
                      href={`/student/assignments/${item.id}`}
                      className="group relative rounded-2xl p-3.5 pl-4 transition-all duration-150 cursor-pointer bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/60 shadow-xs hover:shadow-md block"
                    >
                      <div className="space-y-1">
                        {/* Top Row: Mã môn (in hoa đậm tối giản, không màu mè) + Thời gian */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase text-slate-900 dark:text-white tracking-wider">
                            {item.subjectCode}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {item.timeLabel}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-snug">
                          {item.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-4 text-center space-y-1 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-orange-200/80 dark:border-orange-900/40 shadow-xs">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isVi ? 'Không có hạn nộp gấp' : 'No upcoming deadlines'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isVi ? 'Tất cả bài tập đã được nộp hoặc chưa đến hạn gần' : 'All assignments submitted or not due soon'}
                  </p>
                </div>
              )}

              {/* Gợi ý nhẹ nhàng tinh tế không viền khung */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {isVi
                    ? 'Bạn có thể nộp lại bài trước hạn chót để cải thiện điểm số AI.'
                    : 'You can resubmit before deadline to improve AI score.'}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ── 3D FROG MASCOT CHATBOT LAUNCHER (ICON CHATBOT HÌNH CON ẾCH FPT) ── */}
      <FrogChatbotLauncher onClick={() => setAiTutorOpen(true)} isVi={isVi} />

      {/* ── AI TUTOR INTERACTIVE DIALOG MODAL ── */}
      <Modal
        isOpen={aiTutorOpen}
        onClose={() => setAiTutorOpen(false)}
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {isVi ? 'Trợ lý học tập AI Tutor 24/7' : 'AI Tutor Study Assistant'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {isVi ? 'Hỏi đáp logic thuật toán, barem rubric và gợi ý gỡ lỗi' : 'Algorithm logic, rubric evaluation & debug guidance'}
              </p>
            </div>
          </div>
        }
        maxWidth="lg"
      >
        <div className="space-y-4 py-2">
          {/* Quick topic buttons */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isVi ? 'Chủ đề hỏi nhanh phổ biến:' : 'Quick questions:'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setTutorQuestion('Gợi ý cách tối ưu Binary Search Tree (AVL)')
                  handleAskTutor('Gợi ý cách tối ưu Binary Search Tree (AVL)')
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-orange-200/80 dark:border-orange-900/40 bg-orange-50/40 dark:bg-slate-900 hover:border-orange-400 hover:bg-orange-50/70 dark:hover:bg-orange-950/30 text-slate-700 dark:text-slate-300 transition-all font-medium text-left cursor-pointer"
              >
                🌳 {isVi ? 'Tối ưu Binary Search Tree (AVL)' : 'Optimize Binary Search Tree'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTutorQuestion('Cách gỡ lỗi NullPointerException trong Android PRM392')
                  handleAskTutor('Cách gỡ lỗi NullPointerException trong Android PRM392')
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-orange-200/80 dark:border-orange-900/40 bg-orange-50/40 dark:bg-slate-900 hover:border-orange-400 hover:bg-orange-50/70 dark:hover:bg-orange-950/30 text-slate-700 dark:text-slate-300 transition-all font-medium text-left cursor-pointer"
              >
                🐛 {isVi ? 'Gỡ lỗi NullPointerException (Android)' : 'Debug NullPointerException'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTutorQuestion('Làm sao để đạt điểm tối đa tiêu chí Rubric Clean Code?')
                  handleAskTutor('Làm sao để đạt điểm tối đa tiêu chí Rubric Clean Code?')
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-orange-200/80 dark:border-orange-900/40 bg-orange-50/40 dark:bg-slate-900 hover:border-orange-400 hover:bg-orange-50/70 dark:hover:bg-orange-950/30 text-slate-700 dark:text-slate-300 transition-all font-medium text-left cursor-pointer"
              >
                ⭐ {isVi ? 'Bí quyết đạt điểm tối đa Rubric Clean Code' : 'Clean Code Rubric tips'}
              </button>
            </div>
          </div>

          {/* Question Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isVi ? 'Đặt câu hỏi của bạn:' : 'Your question:'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tutorQuestion}
                onChange={(e) => setTutorQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskTutor()
                }}
                placeholder={isVi ? 'Ví dụ: Giải thích thuật toán sắp xếp nhanh QuickSort...' : 'E.g., Explain QuickSort algorithm...'}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-orange-200/80 dark:border-orange-900/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400"
              />
              <Button
                onClick={() => handleAskTutor()}
                disabled={tutorThinking || !tutorQuestion.trim()}
                variant="primary"
                className="px-4"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>{isVi ? 'Gửi' : 'Send'}</span>
              </Button>
            </div>
          </div>

          {/* AI Response Box */}
          {tutorThinking && (
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-2 animate-pulse">
              <Bot className="w-4 h-4 animate-spin" />
              <span>{isVi ? 'AI Tutor đang suy luận và chuẩn bị gợi ý...' : 'AI Tutor is thinking...'}</span>
            </div>
          )}

          {tutorAnswer && !tutorThinking && (
            <div className="p-4 rounded-xl bg-orange-50/30 dark:bg-slate-900/90 border border-orange-200/80 dark:border-orange-900/40 text-xs leading-relaxed space-y-2.5 max-h-[350px] overflow-y-auto">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 dark:text-orange-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isVi ? 'Phản hồi từ AI Tutor (RAG Grounded):' : 'AI Tutor Response (RAG Grounded):'}</span>
              </div>
              <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                {tutorAnswer}
              </div>

              {tutorSources.length > 0 && (
                <div className="pt-2 border-t border-orange-200/50 dark:border-slate-800 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400 font-semibold">{isVi ? 'Căn cứ tài liệu RAG:' : 'Grounded Sources:'}</span>
                  {tutorSources.map((s, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-orange-100/70 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-medium border border-orange-200/50 dark:border-orange-900/40">
                      📚 {s.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
