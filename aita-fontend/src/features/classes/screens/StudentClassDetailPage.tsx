'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { useAuth } from '@/providers/auth-provider'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { studentPortalApi } from '@/lib/api/modules/student-portal'
import {
  ArrowLeft,
  BookOpen,
  Clock,
  FileText,
  CheckCircle2,
  Users,
  Search,
  Mail,
  Phone,
  GraduationCap,
  Copy,
  Check,
  Megaphone,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Award,
  Send,
  Calendar
} from 'lucide-react'

export default function StudentClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const classId = (params?.id as string) || ''
  const [classData, setClassData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'assignments' | 'students'>('assignments')
  const [studentSearch, setStudentSearch] = React.useState('')
  const [assignmentSearch, setAssignmentSearch] = React.useState('')
  const [assignmentFilter, setAssignmentFilter] = React.useState<'all' | 'pending' | 'submitted' | 'graded'>('all')
  const [copiedEmail, setCopiedEmail] = React.useState<string | null>(null)
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  React.useEffect(() => {
    if (classId) {
      setLoading(true)
      studentPortalApi.getStudentClassDetail(classId)
        .then((data) => setClassData(data))
        .catch((err) => {
          console.error('Failed to load class detail:', err)
          setClassData(null)
        })
        .finally(() => setLoading(false))
    }
  }, [classId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEmail(text)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  if (loading) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="flex flex-col justify-center items-center h-80 space-y-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">{isVi ? 'Đang tải thông tin lớp học...' : 'Loading class details...'}</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!classData) {
    return (
      <DashboardLayout
        navItems={STUDENT_NAV}
        title="AITA Student"
        roleLabel={t('profile.role_student', 'Sinh viên')}
        requiredRole="student"
      >
        <div className="flex flex-col justify-center items-center h-80 text-slate-500 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-400" />
          <p className="text-sm font-medium">{isVi ? 'Không tìm thấy thông tin lớp học.' : 'Class not found.'}</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/student/classes')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {isVi ? 'Quay lại danh sách' : 'Back to classes'}
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const lecturers = classData.lecturers || []
  const students = classData.students || []
  const assignments = classData.assignments || []
  const announcements = classData.announcements || []

  const filteredStudents = students.filter((s: any) => {
    if (!studentSearch.trim()) return true
    const q = studentSearch.toLowerCase().trim()
    const name = (s.fullName || '').toLowerCase()
    const code = (s.studentCode || '').toLowerCase()
    const email = (s.email || '').toLowerCase()
    return name.includes(q) || code.includes(q) || email.includes(q)
  })

  const filteredAssignments = assignments.filter((a: any) => {
    if (assignmentFilter === 'submitted' && !a.isSubmitted) return false
    if (assignmentFilter === 'graded' && (a.score === null || a.score === undefined)) return false
    if (assignmentFilter === 'pending' && a.isSubmitted) return false

    if (!assignmentSearch.trim()) return true
    const q = assignmentSearch.toLowerCase().trim()
    const title = (a.title || '').toLowerCase()
    const desc = (a.description || '').toLowerCase()
    const type = (a.type || '').toLowerCase()
    return title.includes(q) || desc.includes(q) || type.includes(q)
  })

  const submittedCount = assignments.filter((a: any) => a.isSubmitted).length
  const gradedCount = assignments.filter((a: any) => a.score !== null && a.score !== undefined).length
  const pendingCount = assignments.length - submittedCount
  const primaryLecturer = lecturers[0]

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={`${classData.subject?.code || ''} - ${classData.classCode || 'Lớp học'}`}
      headerSubtitle={classData.subject?.name || (isVi ? 'Chi tiết lớp học phần' : 'Class Details')}
    >
      {/* Almost full-width container */}
      <div className="space-y-5 w-full max-w-[99%] 2xl:max-w-[1850px] mx-auto pb-14 px-1 sm:px-2">
        {/* Navigation & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/student/classes')}
            className="h-8 px-2.5 -ml-2 text-xs gap-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isVi ? 'Quay lại danh sách Lớp & Môn học' : 'Back to Classes & Courses'}</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {classData.semester?.season || 'Spring 2026'} {classData.semester?.code ? `(${classData.semester.code})` : ''}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {isVi ? 'Đang diễn ra' : 'Active'}
            </span>
          </div>
        </div>

        {/* Header: Lớp, Môn và Giảng viên phụ trách (không khung) */}
        <div className="py-1">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-orange-500 text-white font-mono tracking-wide">
                  {classData.subject?.code || 'MÔN HỌC'}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {isVi ? 'Lớp:' : 'Class:'} {classData.classCode}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {classData.subject?.name || classData.classCode}
              </h1>

              {classData.subject?.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl line-clamp-2">
                  {classData.subject.description}
                </p>
              )}
            </div>

            {/* Giảng viên phụ trách lớp */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                {primaryLecturer?.avatar ? (
                  <img src={primaryLecturer.avatar} alt={primaryLecturer.name} className="w-full h-full object-cover" />
                ) : (
                  (primaryLecturer?.name || 'G').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 font-medium block">
                  {isVi ? 'Giảng viên' : 'Instructor'}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                  {primaryLecturer?.name || (isVi ? 'Giảng viên Bộ môn' : 'Instructor')}
                </span>
                {primaryLecturer?.email && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate block">
                    {primaryLecturer.email}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng bài tập
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {assignments.length}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Toàn bộ bài tập của lớp</span>
            </div>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chưa nộp bài
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {pendingCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Cần hoàn thành đúng hạn</span>
            </div>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã nộp bài
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {submittedCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Đã tải lên hệ thống</span>
            </div>
          </div>

          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã có điểm
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {gradedCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Đã công bố điểm & rubric</span>
            </div>
          </div>
        </div>

        {/* Tab Controls Bar */}
        <div className="inline-flex p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isVi ? 'Danh sách Bài tập' : 'Assignments'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'assignments' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'
            }`}>
              {assignments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isVi ? 'Danh sách Sinh viên' : 'Student Roster'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === 'students' ? 'bg-white/20 text-white' : 'bg-orange-100/80 text-orange-700'
            }`}>
              {students.length}
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: ASSIGNMENTS (MODERN DATA TABLE)                      */}
        {/* ============================================================ */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setAssignmentFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    assignmentFilter === 'all'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-400 hover:bg-orange-50/60'
                  }`}
                >
                  {isVi ? 'Tất cả' : 'All'} ({assignments.length})
                </button>
                <button
                  onClick={() => setAssignmentFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    assignmentFilter === 'pending'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-400 hover:bg-orange-50/60'
                  }`}
                >
                  {isVi ? 'Cần làm' : 'Pending'} ({pendingCount})
                </button>
                <button
                  onClick={() => setAssignmentFilter('submitted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    assignmentFilter === 'submitted'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-400 hover:bg-orange-50/60'
                  }`}
                >
                  {isVi ? 'Đã nộp bài' : 'Submitted'} ({submittedCount})
                </button>
                <button
                  onClick={() => setAssignmentFilter('graded')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    assignmentFilter === 'graded'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-400 hover:bg-orange-50/60'
                  }`}
                >
                  {isVi ? 'Đã có điểm AI' : 'Graded'} ({gradedCount})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder={isVi ? 'Tìm bài tập theo tên, loại bài...' : 'Search assignment...'}
                  className="pl-8 h-9 text-xs bg-white dark:bg-slate-900 border-orange-200/80 rounded-xl focus:border-orange-400"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Assignments Table */}
            <div className="rounded-2xl border border-orange-100/90 dark:border-orange-900/30 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-orange-100/90 dark:border-slate-800 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/50 dark:bg-slate-950/60 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-4 py-3.5 min-w-[240px]">{isVi ? 'Tên bài tập & Mô tả' : 'Assignment & Description'}</th>
                      <th className="px-4 py-3.5 w-28 text-center">{isVi ? 'Phân loại' : 'Type'}</th>
                      <th className="px-4 py-3.5 min-w-[170px]">{isVi ? 'Hạn nộp' : 'Deadline'}</th>
                      <th className="px-4 py-3.5 w-24 text-center">{isVi ? 'Thang điểm' : 'Max Points'}</th>
                      <th className="px-4 py-3.5 w-36 text-center">{isVi ? 'Trạng thái' : 'Status'}</th>
                      <th className="px-4 py-3.5 w-28 text-center">{isVi ? 'Điểm số' : 'Score'}</th>
                      <th className="px-4 py-3.5 w-36 text-right pr-5">{isVi ? 'Thao tác' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-xs">{isVi ? 'Không tìm thấy bài tập nào.' : 'No assignments found.'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((a: any, idx: number) => {
                        const dueDate = a.dueDate ? new Date(a.dueDate) : null
                        const isOverdue = dueDate && dueDate < new Date() && !a.isSubmitted
                        const isGraded = a.score !== null && a.score !== undefined

                        return (
                          <tr
                            key={a.id || idx}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* STT */}
                            <td className="px-4 py-3.5 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>

                            {/* Title & Description */}
                            <td className="px-4 py-3.5">
                              <Link
                                href={`/student/assignments/${a.id}`}
                                className="font-bold text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-xs line-clamp-1"
                              >
                                {a.title}
                              </Link>
                              {a.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {a.description}
                                </p>
                              )}
                            </td>

                            {/* Type */}
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {a.type || 'TASK'}
                              </span>
                            </td>

                            {/* Due date */}
                            <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                              {dueDate ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{dueDate.toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}</span>
                                    <span className="text-slate-400 font-mono text-[11px]">
                                      {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {isOverdue && (
                                    <span className="text-[10px] text-rose-500 font-semibold block">
                                      {isVi ? 'Đã hết hạn nộp' : 'Overdue'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">{isVi ? 'Không có hạn' : 'No deadline'}</span>
                              )}
                            </td>

                            {/* Max Points */}
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {a.totalPoints || 10} {isVi ? 'đ' : 'pts'}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5 text-center">
                              {isGraded ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                  <span>{isVi ? 'Đã có điểm' : 'Graded'}</span>
                                </span>
                              ) : a.isSubmitted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                  <span>{isVi ? 'Đã nộp bài' : 'Submitted'}</span>
                                </span>
                              ) : isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>{isVi ? 'Quá hạn' : 'Overdue'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  <Clock className="w-3 h-3" />
                                  <span>{isVi ? 'Cần làm' : 'Pending'}</span>
                                </span>
                              )}
                            </td>

                            {/* Score */}
                            <td className="px-4 py-3.5 text-center">
                              {isGraded ? (
                                <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  {a.score}/{a.totalPoints || 10}
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 font-mono">—</span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="px-4 py-3.5 text-right pr-5">
                              <div className="flex items-center justify-end gap-1.5">
                                {isGraded && (
                                  <Link href="/student/results">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                                      title={isVi ? 'Xem đánh giá AI chi tiết' : 'View AI review'}
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      <span className="hidden md:inline">{isVi ? 'Xem AI' : 'AI'}</span>
                                    </Button>
                                  </Link>
                                )}

                                <Link href={`/student/assignments/${a.id}`}>
                                  <Button
                                    variant={a.isSubmitted ? 'outline' : 'primary'}
                                    size="sm"
                                    className="h-7 px-3 text-xs font-bold"
                                  >
                                    {a.isSubmitted
                                      ? (isVi ? 'Xem bài nộp' : 'View')
                                      : (isVi ? 'Nộp bài' : 'Submit')}
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: STUDENTS (MODERN DATA TABLE)                         */}
        {/* ============================================================ */}
        {activeTab === 'students' && (
          <div className="space-y-3">
            {/* Header / Search bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder={isVi ? 'Tìm kiếm sinh viên theo tên, MSSV, email...' : 'Search student...'}
                  className="pl-8 h-9 text-xs bg-white dark:bg-slate-900 border-orange-200/80 rounded-xl focus:border-orange-400"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Users className="w-4 h-4 text-orange-500" />
                <span>
                  {isVi ? 'Sĩ số hiển thị:' : 'Showing:'}{' '}
                  <strong className="text-slate-900 dark:text-white font-mono font-bold">{filteredStudents.length}</strong> / {students.length} {isVi ? 'sinh viên' : 'students'}
                </span>
              </div>
            </div>

            {/* Students Table */}
            <div className="rounded-2xl border border-orange-100/90 dark:border-orange-900/30 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-orange-100/90 dark:border-slate-800 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/50 dark:bg-slate-950/60 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-4 py-3.5 min-w-[220px]">{isVi ? 'Họ và tên Sinh viên' : 'Student Name'}</th>
                      <th className="px-4 py-3.5 w-32 font-mono text-center">{isVi ? 'Mã số SV' : 'Student Code'}</th>
                      <th className="px-4 py-3.5 min-w-[220px]">{isVi ? 'Email FPT' : 'FPT Email'}</th>
                      <th className="px-4 py-3.5 w-28 text-center">{isVi ? 'Lớp học phần' : 'Class Code'}</th>
                      <th className="px-4 py-3.5 w-32 text-center">{isVi ? 'Trạng thái' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                          <p className="text-xs">{isVi ? 'Không tìm thấy sinh viên nào.' : 'No students found.'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st: any, idx: number) => {
                        const isCurrentUser =
                          (user?.id && st.id === user.id) ||
                          (user?.email && st.email === user.email) ||
                          (user?.studentCode && st.studentCode === user.studentCode)

                        const isCopied = copiedEmail === st.email

                        return (
                          <tr
                            key={st.id || idx}
                            className={`transition-colors ${
                              isCurrentUser
                                ? 'bg-orange-50/30 dark:bg-orange-950/20 font-semibold'
                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {/* STT */}
                            <td className="px-4 py-3 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>

                            {/* Student Avatar & Name */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                                  {st.avatar ? (
                                    <img src={st.avatar} alt={st.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    (st.fullName || 'S').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-slate-900 dark:text-white font-bold truncate">
                                    {st.fullName}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-500 text-white shrink-0">
                                      {isVi ? 'Bạn' : 'You'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* MSSV */}
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                {st.studentCode || `SV${String(idx + 1).padStart(3, '0')}`}
                              </span>
                            </td>

                            {/* Email */}
                            <td className="px-4 py-3">
                              {st.email ? (
                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                  <span className="truncate">{st.email}</span>
                                  <button
                                    onClick={() => copyToClipboard(st.email)}
                                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded shrink-0"
                                    title={isVi ? 'Sao chép email' : 'Copy email'}
                                  >
                                    {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Class Code */}
                            <td className="px-4 py-3 text-center font-mono text-slate-500 text-[11px]">
                              {classData.classCode}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{isVi ? 'Đang học' : 'Enrolled'}</span>
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
