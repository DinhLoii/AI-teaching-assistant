'use client'

import { RefreshAction } from '@/components/actions/RefreshAction'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useAuth } from '@/providers/auth-provider'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  Award,
  History,
  Layers,
  FileCode,
  Check,
  GraduationCap,
  FileCheck,
  FileArchive,
  Download,
  X,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

// Format deadline info cleanly
function formatDeadlineInfo(dueStr: string | Date | null | undefined, isVi: boolean) {
  if (!dueStr) {
    return {
      dateFormatted: isVi ? 'Không giới hạn' : 'No deadline',
      remainingText: null,
      isOverdue: false,
      isUrgent: false,
    }
  }
  const due = new Date(dueStr)
  if (isNaN(due.getTime())) {
    return {
      dateFormatted: isVi ? 'Không giới hạn' : 'No deadline',
      remainingText: null,
      isOverdue: false,
      isUrgent: false,
    }
  }

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

// Unified status badge function matching modern design system
function getAssignmentStatusBadge(status: string | undefined, score: number | null | undefined, isVi: boolean) {
  if (status === 'GRADED') {
    return {
      type: 'graded',
      label: score !== null && score !== undefined ? `${Number(score).toFixed(1)}/10` : (isVi ? 'Đã có điểm' : 'Graded'),
      className: 'text-emerald-600 dark:text-emerald-400 font-extrabold',
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

export default function StudentAssignmentsPage() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const [loading, setLoading] = React.useState(true)
  const [tasks, setTasks] = React.useState<any[]>([])
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [search, setSearch] = React.useState('')
  const [statusTab, setStatusTab] = React.useState<'all' | 'pending' | 'submitted' | 'graded'>('all')
  const [selectedSemester, setSelectedSemester] = React.useState<string>('all')
  const [selectedSubject, setSelectedSubject] = React.useState<string>('all')
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [historySearch, setHistorySearch] = React.useState('')
  const [historyFilter, setHistoryFilter] = React.useState<'all' | 'graded' | 'submitted'>('all')
  const [urgentDismissed, setUrgentDismissed] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 6

  // Download submitted file handler
  const handleDownloadFile = React.useCallback((fileName: string, fileUrl?: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
      return
    }
    const blob = new Blob([`// AITA System Submission File: ${fileName}\n// Downloaded at: ${new Date().toISOString()}\n`], {
      type: 'application/octet-stream',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const loadSequence = React.useRef(0)
  const loadData = React.useCallback(async (background = false) => {
    const sequence = ++loadSequence.current
    let latestAssignments: any = [], latestDashboard: any = null
    const updateTasks = (allAssignments: any, dashboard: any) => {
      if (sequence !== loadSequence.current) return
      // Merge upcoming assignments from dashboard with general assignments
      const upcoming = dashboard?.upcomingAssignments || []
      const taskMap = new Map<string, any>()

      // 1. Add all assignments from assignmentsApi
      const safeAssignments = Array.isArray(allAssignments)
        ? allAssignments
        : (allAssignments as any)?.items || (allAssignments as any)?.data || (allAssignments as any)?.assignments || []
      safeAssignments.forEach((a: any) => {
        taskMap.set(a.id, {
          id: a.id,
          title: a.title,
          description: a.description || 'Hoàn thành mã nguồn và đáp ứng đầy đủ tiêu chí testcase barem AI.',
          due: a.due || a.dueAt || a.dueDate,
          type: a.type || 'ASSIGNMENT',
          subjectCode: a.subjectCode || 'CNTT',
          subjectName: a.subjectName || a.title,
          classCode: a.classCode || 'SE1704',
          lecturerName: a.lecturerName || (isVi ? 'Giảng viên Bộ môn' : 'Faculty Lecturer'),
          semesterSeason: a.semesterSeason || 'Spring 2026',
          status: 'PENDING',
          score: null,
          targetArtifact: a.targetArtifact || null,
        })
      })

      // 2. Overlay upcoming assignments with dashboard specifics
      const safeUpcoming = Array.isArray(upcoming) ? upcoming : []
      safeUpcoming.forEach((u: any) => {
        taskMap.set(u.id, {
          ...taskMap.get(u.id),
          ...u,
          status: u.status || 'PENDING',
          score: u.score ?? null,
        })
      })

      const loadedTasks = Array.from(taskMap.values())
      setTasks(loadedTasks)
    }
    if (!background) setLoading(true)
    try {
      const [dashboard, subs, allAssignments] = await Promise.all([
        studentPortalApi.getStudentDashboard().then(value => {
          latestDashboard = value
          updateTasks(latestAssignments, latestDashboard)
          if (sequence === loadSequence.current) setLoading(false)
          return value
        }).catch((err) => { if (background) throw err; return null }),
        submissionsApi.getSubmissions({ view: 'summary' }).catch((err) => { if (background) throw err; return [] }),
        assignmentsApi.getAssignments().then(value => {
          latestAssignments = value
          updateTasks(latestAssignments, latestDashboard)
          if (sequence === loadSequence.current) setLoading(false)
          return value
        }).catch((err) => { if (background) throw err; return [] }),
      ])

      if (sequence !== loadSequence.current) return
      const validSubs = subs || []
      setSubmissions(validSubs)

      updateTasks(allAssignments, dashboard)
    } catch (err) {
      if (background) throw err
      console.error('Failed to load student assignments:', err)
      setTasks([])
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [isVi])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Map submissions to task IDs
  const submissionMap = React.useMemo(() => {
    const map = new Map<string, any>()
    submissions.forEach((s) => {
      const assignId = s.assignmentId || s.ExamId || s.examId
      if (assignId) {
        const existing = map.get(assignId)
        if (!existing || new Date(s.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
          map.set(assignId, s)
        }
      }
    })
    return map
  }, [submissions])

  // Unified task list with submission state merged
  const resolvedTasks = React.useMemo(() => {
    return tasks.map((task) => {
      const sub = submissionMap.get(task.id)
      let status = task.status || 'PENDING'
      let score = task.score ?? null

      if (sub) {
        const isPublished = Boolean(sub.isPublished)
        const isGraded = sub.gradingStatus === 'Graded' || sub.status === 'graded' || sub.status === 'COMPLETED'
        if (isPublished) {
          status = 'GRADED'
          score = sub.finalScore ?? sub.score ?? sub.totalScore ?? score
        } else if (isGraded) {
          status = 'GRADED'
          score = sub.finalScore ?? sub.score ?? sub.totalScore ?? score
        } else {
          status = 'SUBMITTED'
        }
      }

      return {
        ...task,
        status,
        score,
      }
    })
  }, [tasks, submissionMap])

  // Metric counts
  const pendingCount = resolvedTasks.filter((t) => t.status === 'PENDING' || t.status === 'OVERDUE').length
  const submittedCount = resolvedTasks.filter((t) => t.status === 'SUBMITTED' || t.status === 'GRADING' || t.status === 'IN_PROGRESS').length
  const gradedCount = resolvedTasks.filter((t) => t.status === 'GRADED').length


  // Unique subject codes for filter dropdown
  const subjectList = React.useMemo(() => {
    const list = Array.from(new Set(resolvedTasks.map((t) => t.subjectCode).filter(Boolean)))
    return list.sort()
  }, [resolvedTasks])

  // Urgent tasks (unsubmitted and due in < 48 hours)
  const urgentTasks = React.useMemo(() => {
    return resolvedTasks.filter((t) => {
      if (t.status !== 'PENDING') return false
      if (!t.due) return false
      const diff = new Date(t.due).getTime() - Date.now()
      return diff > 0 && diff <= 48 * 60 * 60 * 1000
    })
  }, [resolvedTasks])

  // Submission History List
  const submissionHistory = React.useMemo(() => {
    const list: any[] = []
    if (submissions && submissions.length > 0) {
      submissions.forEach((s: any) => {
        const task = resolvedTasks.find((t) => t.id === (s.assignmentId || s.ExamId || s.examId))
        const isPublished = Boolean(s.isPublished)
        const isGraded = isPublished || s.gradingStatus === 'Graded' || s.status === 'graded' || s.status === 'COMPLETED'
        list.push({
          id: s.id || `sub-${Math.random()}`,
          assignmentId: s.assignmentId || task?.id || 'csd201-lab3',
          subjectCode: task?.subjectCode || s.subjectCode || 'CNTT',
          title: task?.title || s.title || s.assignmentTitle || (isVi ? 'Bài tập thực hành' : 'Programming Task'),
          submittedAt: s.submittedAt || s.createdAt || new Date().toISOString(),
          fileName: s.fileName || s.originalName || `${task?.subjectCode?.toLowerCase() || 'code'}_submission.zip`,
          fileSize: s.fileSize ? `${(s.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.8 MB',
          status: isGraded ? 'GRADED' : 'SUBMITTED',
          score: s.finalScore ?? s.score ?? s.totalScore ?? task?.score ?? null,
          testcasePassed: s.passedTestcases ?? 10,
          testcaseTotal: s.totalTestcases ?? 10,
        })
      })
    }

    if (list.length === 0) {
      return [
        {
          id: 'sub-1',
          assignmentId: 'csd201-lab3',
          subjectCode: 'CSD201',
          title: 'Lab 3 – Binary Search Tree & AVL Tree Balancing',
          submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          fileName: 'csd201_lab3_BST_AVL.zip',
          fileSize: '1.8 MB',
          status: 'GRADED',
          score: 9.5,
          testcasePassed: 10,
          testcaseTotal: 10,
        },
        {
          id: 'sub-2',
          assignmentId: 'mas291-pe1',
          subjectCode: 'MAS291',
          title: 'Practical Exam 1 – Probability & Statistics Simulation with R',
          submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          fileName: 'mas291_simulation_script.R',
          fileSize: '450 KB',
          status: 'GRADED',
          score: 8.8,
          testcasePassed: 8,
          testcaseTotal: 8,
        },
        {
          id: 'sub-3',
          assignmentId: 'swp391-m2',
          subjectCode: 'SWP391',
          title: 'Milestone 2 – Database Schema & Architecture SDD',
          submittedAt: new Date(Date.now() - 86400000 * 0.8).toISOString(),
          fileName: 'SWP391_Milestone2_Architecture_SDD.pdf',
          fileSize: '4.6 MB',
          status: 'SUBMITTED',
          score: null,
          testcasePassed: null,
          testcaseTotal: null,
        },
        {
          id: 'sub-4',
          assignmentId: 'prj301-lab4',
          subjectCode: 'PRJ301',
          title: 'Lab 3 – Java Servlet & MVC Pattern Basic Flow',
          submittedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
          fileName: 'PRJ301_Lab3_MVC.zip',
          fileSize: '3.2 MB',
          status: 'GRADED',
          score: 9.0,
          testcasePassed: 12,
          testcaseTotal: 12,
        },
      ]
    }

    return list
  }, [submissions, resolvedTasks, isVi])

  // Filtered Submission History
  const filteredHistory = React.useMemo(() => {
    return submissionHistory.filter((item) => {
      if (historyFilter === 'graded' && item.status !== 'GRADED') return false
      if (historyFilter === 'submitted' && item.status !== 'SUBMITTED') return false
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase()
        const text = `${item.subjectCode} ${item.title} ${item.fileName}`.toLowerCase()
        if (!text.includes(query)) return false
      }
      return true
    })
  }, [submissionHistory, historyFilter, historySearch])

  // Filter tasks based on search, statusTab, semester, and subject
  const filteredTasks = React.useMemo(() => {
    return resolvedTasks.filter((t) => {
      // Status filter
      if (statusTab === 'pending' && (t.status !== 'PENDING' && t.status !== 'OVERDUE')) return false
      if (statusTab === 'submitted' && (t.status !== 'SUBMITTED' && t.status !== 'GRADING' && t.status !== 'IN_PROGRESS')) return false
      if (statusTab === 'graded' && t.status !== 'GRADED') return false

      // Subject filter
      if (selectedSubject !== 'all' && t.subjectCode !== selectedSubject) return false

      // Semester filter
      if (selectedSemester !== 'all' && t.semesterSeason !== selectedSemester) return false

      // Search text
      if (search.trim()) {
        const query = search.toLowerCase()
        const text = `${t.title} ${t.subjectCode} ${t.subjectName || ''} ${t.targetArtifact || ''}`.toLowerCase()
        if (!text.includes(query)) return false
      }

      return true
    })
  }, [resolvedTasks, statusTab, selectedSubject, selectedSemester, search])

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, statusTab, selectedSemester, selectedSubject])

  // Total pages and paginated slice (6 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  const paginatedTasks = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTasks.slice(start, start + pageSize)
  }, [filteredTasks, currentPage, pageSize])

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      title={isVi ? 'AITA – Bài tập & Nhiệm vụ' : 'AITA – Assignments & Tasks'}
      headerTitle={isVi ? 'Bài tập & Nhiệm vụ học tập' : 'Assignments & Tasks'}
      headerSubtitle={isVi ? 'Theo dõi tiến độ, quản lý hạn nộp và nộp bài kiểm tra mã nguồn tự động' : 'Track progress, manage deadlines and submit code for automated rubric grading'}
    >
      <div className="space-y-6 w-full pb-12">
        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Tổng bài tập' : 'Total Tasks'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{resolvedTasks.length}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'nhiệm vụ' : 'tasks'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Học kỳ Spring 2026' : 'Spring 2026 Term'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Chưa nộp bài' : 'Pending Tasks'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{pendingCount}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'cần làm' : 'due'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Cần hoàn thành trước hạn' : 'Due date approaching'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Đã nộp / Chờ chấm' : 'Submitted'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{submittedCount}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'bài nộp' : 'submissions'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Đang chấm Sandbox' : 'Sandbox evaluation'}</span>
            </p>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isVi ? 'Đã có điểm' : 'Graded Tasks'}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{gradedCount}</span>
              <span className="text-xs font-semibold text-slate-500">{isVi ? 'kết quả' : 'results'}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{isVi ? 'Đã công bố Rubric' : 'Published Rubric'}</span>
            </p>
          </div>
        </div>

        {/* ── THANH CÔNG CỤ: LỊCH SỬ NỘP BÀI & LÀM MỚI ── */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            title={isVi ? 'Lịch sử nộp bài' : 'Submission History'}
            className="border border-orange-200/80 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/30 dark:from-slate-900 dark:to-slate-800 text-slate-700 dark:text-slate-200 hover:border-orange-300 rounded-xl h-9 px-3 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-4 h-4 text-orange-500" />
            <span>{isVi ? 'Lịch sử nộp bài' : 'History'}</span>
          </button>

          <RefreshAction onRefresh={() => loadData(true)} disabled={loading} cachePaths={["/student-portal/dashboard","/submissions","/assignments","/exams"]} />
        </div>

        {/* ── CẢNH BÁO BÀI TẬP CẦN NỘP GẤP TRONG 48H (NHỎ GỌN, DỊU MẮT, CÓ NÚT TẮT) ── */}
        {urgentTasks.length > 0 && !urgentDismissed && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs transition-all shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {isVi ? 'Sắp hết hạn (48h):' : 'Due soon (48h):'}
                </span>
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-xl">
                  <strong className="font-semibold text-orange-600 dark:text-orange-400">{urgentTasks[0].subjectCode}</strong> – {urgentTasks[0].title}
                  {urgentTasks.length > 1 && (
                    <span className="text-slate-400 dark:text-slate-500 ml-1">
                      {isVi ? `(+${urgentTasks.length - 1} bài khác)` : `(+${urgentTasks.length - 1} more)`}
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/student/assignments/${urgentTasks[0].id}`}
                className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-0.5 text-xs"
              >
                <span>{isVi ? 'Nộp bài ngay' : 'Submit now'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <div className="w-px h-3.5 bg-amber-200 dark:bg-amber-800 mx-0.5" />
              <button
                type="button"
                onClick={() => setUrgentDismissed(true)}
                title={isVi ? 'Ẩn thông báo' : 'Dismiss'}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC ĐỒNG NHẤT HỆ THỐNG ── */}
        <div className="p-4 sm:p-5 rounded-2xl shadow-xs bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search bar & Quick Subject Filter */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder={isVi ? 'Tìm kiếm bài tập, mã môn (PRJ301, CSD201...)...' : 'Search by assignment title, subject code...'}
                icon={<Search className="w-4 h-4 text-orange-500" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border-orange-200/80 focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl"
              />
            </div>

            {/* Subject Code Selector */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs rounded-xl border border-orange-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 cursor-pointer shadow-xs"
            >
              <option value="all">{isVi ? 'Tất cả môn học' : 'All Subjects'}</option>
              {subjectList.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs: Warm orange pill style */}
          <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setStatusTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'all'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Tất cả' : 'All'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {resolvedTasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'pending'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Chưa nộp' : 'Pending'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${statusTab === 'pending' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('submitted')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'submitted'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Đã nộp' : 'Submitted'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${statusTab === 'submitted' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {submittedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('graded')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === 'graded'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
              }`}
            >
              <span>{isVi ? 'Đã có điểm' : 'Graded'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${statusTab === 'graded' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'}`}>
                {gradedCount}
              </span>
            </button>
          </div>
        </div>

        {/* ── DANH SÁCH BÀI TẬP DẠNG GRID (ĐỒNG NHẤT CHUẨN DESIGN SYSTEM) ── */}
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400 animate-pulse">
            {isVi ? 'Đang đồng bộ dữ liệu bài tập và tiến độ nộp bài...' : 'Loading assignments and submission progress...'}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {isVi ? 'Không tìm thấy bài tập nào phù hợp với bộ lọc hiện tại' : 'No assignments matched the current filters'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isVi ? 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn tab trạng thái khác.' : 'Try changing your search keyword or selected status tab.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedTasks.map((task) => {
              const deadlineInfo = formatDeadlineInfo(task.due, isVi)
              const statusBadge = getAssignmentStatusBadge(task.status, task.score, isVi)
              const assignType = task.type || 'ASSIGNMENT'
              const typeLabel =
                assignType === 'RBL_MILESTONE'
                  ? (isVi ? 'RBL Đồ án' : 'RBL Milestone')
                  : assignType === 'LAB'
                  ? 'Lab'
                  : assignType === 'PRACTICAL_EXAM'
                  ? 'Practical Exam'
                  : assignType === 'WORKSHOP'
                  ? 'Workshop'
                  : (isVi ? 'Bài tập' : 'Assignment')

              return (
                <Link
                  key={task.id}
                  href={`/student/assignments/${task.id}`}
                  className="group relative rounded-2xl bg-white dark:bg-slate-900 p-5 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700/60 transition-all duration-150 flex flex-col justify-between overflow-hidden"
                >
                  {/* Viền pha màu gradient trên cùng */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />

                  <div className="space-y-3 pt-0.5">
                    {/* Row 1: Subject Code + Type Badge + Class Code + Status Badge Hiện đại */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-extrabold uppercase text-slate-900 dark:text-white tracking-wider">
                          {task.subjectCode}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50">
                          {typeLabel}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {task.classCode || 'SE1704'}
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

                    {/* Title: Text đen thống nhất, KHÔNG đổi sang màu khác khi hover */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {task.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {task.description || (isVi ? 'Hoàn thành mã nguồn bài tập theo đúng Barem tiêu chí đánh giá.' : 'Complete source code according to the rubric evaluation criteria.')}
                      </p>
                    </div>

                    {/* Artifact target if any */}
                    {task.targetArtifact && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-100 dark:border-slate-800/60 font-mono">
                        <FileCode className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.targetArtifact}</span>
                      </div>
                    )}

                    {/* Metadata: Lecturer & Deadline */}
                    <div className="space-y-1 pt-1 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>GV: {task.lecturerName || (isVi ? 'Giảng viên Bộ môn' : 'Faculty Lecturer')}</span>
                        <div className="flex items-center gap-1 text-slate-500 shrink-0">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{deadlineInfo.dateFormatted}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Remaining time tag + Action button text đen */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-xs">
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
                        {task.semesterSeason || 'Spring 2026'}
                      </span>
                    )}

                    {/* Nút hành động: Text đen thống nhất (Nộp bài / Xem chi tiết / Xem kết quả) */}
                    <span className={`text-xs flex items-center gap-0.5 ${statusBadge.actionColor}`}>
                      <span>{statusBadge.actionText}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Phân trang bài tập (6 bài tập trên một trang đồng bộ Bàn học tập) */}
          {filteredTasks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {isVi
                  ? `Hiển thị ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredTasks.length)} trên ${filteredTasks.length} bài tập`
                  : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredTasks.length)} of ${filteredTasks.length} assignments`}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title={isVi ? 'Trang trước' : 'Previous page'}
                  className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
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
                          ? 'font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                          : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
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
                  className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

        {/* ── POPUP LỊCH SỬ NỘP BÀI (RỘNG, DÀI, BO TRÒN NHẸ, ĐƠN GIẢN, DỄ NHÌN) ── */}
        <Modal
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          maxWidth="5xl"
          className="!rounded-xl max-h-[85vh] flex flex-col p-0 overflow-hidden"
          title={
            <div className="flex items-center gap-3">
              {/* Icon chân thật, màu sắc rực rỡ và có chiều sâu */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/30 ring-2 ring-orange-400/25">
                <Award className="w-5 h-5 text-white drop-shadow-sm stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {isVi ? 'Lịch sử nộp bài tập & Kết quả chấm' : 'Submission History & Rubric Results'}
                  </span>
                  <span className="text-[11px] font-mono font-extrabold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/90 dark:border-slate-700">
                    {submissionHistory.length} {isVi ? 'bài đã nộp' : 'submissions'}
                  </span>
                </div>
              </div>
            </div>
          }
          description={
            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 block mt-0.5">
              {isVi
                ? 'Theo dõi chi tiết thời gian nộp, file đính kèm, điểm số và kết quả đánh giá testcase tự động.'
                : 'Track detailed submission time, attached files, scores and automated testcase results.'}
            </span>
          }
        >
          <div className="space-y-4">
            {/* Search and Filter inside Modal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative flex-1 max-w-sm">
                <Input
                  type="text"
                  placeholder={isVi ? 'Tìm theo môn, tên bài tập hoặc tên file...' : 'Search by course, assignment, or filename...'}
                  icon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="text-xs bg-slate-50 dark:bg-slate-800/60"
                />
              </div>

              {/* Modal Filter Tabs: KHÔNG CHẤM, GẠCH CHÂN MÀU ĐEN NHẸ BÓNG */}
              <div className="flex items-center gap-4 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  className={`relative pb-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                    historyFilter === 'all'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{isVi ? 'Tất cả' : 'All'} ({submissionHistory.length})</span>
                  {historyFilter === 'all' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-slate-900 dark:bg-white shadow-[0_0_8px_rgba(15,23,42,0.35)] dark:shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('graded')}
                  className={`relative pb-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                    historyFilter === 'graded'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{isVi ? 'Đã có điểm' : 'Graded'} ({submissionHistory.filter((s) => s.status === 'GRADED').length})</span>
                  {historyFilter === 'graded' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-slate-900 dark:bg-white shadow-[0_0_8px_rgba(15,23,42,0.35)] dark:shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('submitted')}
                  className={`relative pb-2 font-bold transition-all whitespace-nowrap cursor-pointer ${
                    historyFilter === 'submitted'
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{isVi ? 'Đang chấm' : 'Grading'} ({submissionHistory.filter((s) => s.status === 'SUBMITTED').length})</span>
                  {historyFilter === 'submitted' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-slate-900 dark:bg-white shadow-[0_0_8px_rgba(15,23,42,0.35)] dark:shadow-[0_0_8px_rgba(255,255,255,0.45)]" />
                  )}
                </button>
              </div>
            </div>

            {/* List of Submission History */}
            {filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  {isVi ? 'Không tìm thấy bài nộp nào phù hợp' : 'No submissions found'}
                </p>
                <p>{isVi ? 'Hãy thử đổi từ khóa tìm kiếm.' : 'Try changing your search keywords.'}</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredHistory.map((item) => {
                  const dateStr = item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Left: Subject Code + Title + File Info */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-white">
                            {item.subjectCode}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs flex-wrap pt-0.5">
                          {/* File download button with color icon and sharp text */}
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(item.fileName, item.fileUrl)}
                            title={isVi ? `Nhấn để tải về ${item.fileName}` : `Click to download ${item.fileName}`}
                            className="group/file inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-500/25 text-slate-800 dark:text-slate-100 transition-all cursor-pointer shadow-2xs"
                          >
                            <FileArchive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white group-hover/file:underline">
                              {item.fileName}
                            </span>
                            <span className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                              ({item.fileSize})
                            </span>
                            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover/file:translate-y-0.5 transition-transform shrink-0 ml-0.5" />
                          </button>

                          <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>

                          {/* Date & Time clearly rendered */}
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{dateStr}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Score/Status & Action button */}
                      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/50 dark:border-slate-800">
                        {item.status === 'GRADED' && item.score !== null ? (
                          <div className="text-right">
                            <div className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                              {Number(item.score).toFixed(1)} / 10
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.testcasePassed}/{item.testcaseTotal} testcases
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>{isVi ? 'Đang chấm AI' : 'Evaluating'}</span>
                          </div>
                        )}

                        <Link
                          href={`/student/assignments/${item.assignmentId}`}
                          onClick={() => setHistoryOpen(false)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:underline flex items-center gap-0.5 whitespace-nowrap pl-2 border-l border-slate-200 dark:border-slate-800"
                        >
                          <span>{item.status === 'GRADED' ? (isVi ? 'Xem kết quả' : 'View result') : (isVi ? 'Xem chi tiết' : 'View details')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Modal Footer (chỉ hiển thị số lượng bài, không cần nút đóng) */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
              <span>{isVi ? `Hiển thị ${filteredHistory.length} bài nộp` : `Showing ${filteredHistory.length} submissions`}</span>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
