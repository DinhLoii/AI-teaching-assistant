'use client'

import { useAdminAnalytics } from '@/features/reports/hooks/useAdminAnalytics'
import { RoleDistribution } from '@/features/reports/components/RoleDistribution'
import { RefreshAction } from '@/components/actions/RefreshAction'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { ErrorNotice } from '@/components/ui/feedback'
import { reportsApi, type SystemHealth } from '@/lib/api/modules/reports'
import { auditApi, type AuditEntry } from '@/lib/api/modules/audit'
import { usersApi } from '@/lib/api/modules/users'
import { classesApi } from '@/lib/api/modules/classes'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useNotifications } from '@/providers/notification-provider'
import { notificationTime } from '@/lib/notifications/presentation'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'
import {
  Users,
  BookOpen,
  Library,
  FileSignature,
  FileCheck,
  Activity,
  Server,
  Database,
  Bot,
  ShieldCheck,
  ArrowRight,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  BarChart3,
  FileText,
  Settings,
  UserPlus,
  CreditCard,
  Fingerprint,
  QrCode,
  GraduationCap,
  School,
  Shield,
  Mail,
  Building,
  Phone,
  MapPin,
  Cpu,
  HardDrive,
  Bell,
  ChevronRight,
  Zap,
  Check,
} from 'lucide-react'

// Relative time formatter
function formatRelativeTime(date: string | Date | null | undefined, isVi = true, offset = 0) {
  return notificationTime(date instanceof Date ? date.toISOString() : date || null, Date.now() + offset, isVi ? 'vi' : 'en')
}

export default function AdminOverviewPage() {
  const { isAuthenticated, role } = useAuth()
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const { report: analytics, refresh: refreshAnalytics, error: analyticsError, loading: analyticsLoading } = useAdminAnalytics()
  const stats = analytics?.summary
  const [health, setHealth] = React.useState<SystemHealth | null>(null)
  const [recentLogs, setRecentLogs] = React.useState<AuditEntry[]>([])
  const [recentClasses, setRecentClasses] = React.useState<any[]>([])
  const { notifications, unreadCount, markAllAsRead, clockOffset } = useNotifications()
  const [loading, setLoading] = React.useState(true)
  const [healthChecking, setHealthChecking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Quick Create User Modal
  const [createUserModal, setCreateUserModal] = React.useState(false)
  const [newUser, setNewUser] = React.useState({
    fullName: '',
    email: '',
    role: 'student',
    studentCode: '',
    lecturerCode: '',
    password: '',
    phone: '',
    campus: 'FPT University Quy Nhơn',
    department: 'Kỹ thuật phần mềm (SE)',
  })
  const [creatingUser, setCreatingUser] = React.useState(false)
  const [createSuccess, setCreateSuccess] = React.useState<string | null>(null)

  const loadDashboardData = React.useCallback(async () => {
    if (!isAuthenticated || role !== 'admin') return
    setLoading(true)
    setError(null)
    try {
      const [healthRes, logsRes, classesRes] = await Promise.all([
        reportsApi.getSystemHealth().catch(() => null),
        auditApi.getAuditLogs(1, 6).catch(() => []),
        classesApi.getClasses(1, 10).catch(() => []),
      ])

      setHealth(healthRes)
      setRecentLogs(Array.isArray(logsRes) ? logsRes : [])
      setRecentClasses(Array.isArray(classesRes) ? classesRes : (classesRes as any)?.items || (classesRes as any)?.data || [])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, role])

  React.useEffect(() => {
    void loadDashboardData()
  }, [loadDashboardData])

  const handleRefreshHealth = async () => {
    setHealthChecking(true)
    try {
      const res = await reportsApi.getSystemHealth()
      setHealth(res)
    } catch (err) {
      throw err
    } finally {
      setHealthChecking(false)
    }
  }

  const handleMarkAllRead = () => {
    void markAllAsRead().catch(() => {})
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    setCreateSuccess(null)
    try {
      await usersApi.createUser({
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        studentCode: newUser.role === 'student' ? newUser.studentCode : undefined,
        lecturerCode: newUser.role === 'lecturer' ? newUser.lecturerCode : undefined,
        password: newUser.password || 'Aita@123456',
      })
      setCreateSuccess(`Tài khoản ${newUser.fullName} (${newUser.email}) đã được tạo thành công!`)
      setNewUser({
        fullName: '',
        email: '',
        role: 'student',
        studentCode: '',
        lecturerCode: '',
        password: '',
        phone: '',
        campus: 'FPT University Quy Nhơn',
        department: 'Kỹ thuật phần mềm (SE)',
      })
      void refreshAnalytics()
      void loadDashboardData()
      setTimeout(() => {
        setCreateUserModal(false)
        setCreateSuccess(null)
      }, 1500)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setCreatingUser(false)
    }
  }

  const studentCount = analytics?.roles.find(item => item.role === 'student')?.count ?? 0
  const lecturerCount = analytics?.roles.find(item => item.role === 'lecturer')?.count ?? 0

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.overview.title', 'Bảng điều khiển Quản trị Hệ thống')}
      headerSubtitle={t('admin.overview.subtitle', 'Giám sát hạ tầng, phân quyền người dùng và kiểm soát vận hành toàn nền tảng')}
    >
      <div className="space-y-4 w-full pb-8">
        {(error || analyticsError) && <ErrorNotice message={error || analyticsError || ''} onRetry={() => { void refreshAnalytics(); void loadDashboardData() }} />}
        {analytics && <p role="status" className="text-xs text-slate-500">Thống kê tự động cập nhật · Cập nhật lúc {new Date(analytics.generatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Bài nộp tính từ {analytics.range.from} đến {analytics.range.to} (UTC+7).</p>}

        {/* ── 2. MAIN 2-COLUMN LAYOUT (LEFT 8 COLS, RIGHT 4 COLS MATCHING TEACHER'S OVERVIEW) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* ══════════════════════════════════════════════════════════════════════
              LEFT COLUMN (8 COLS)
              ★ TOP 4 KPI CARDS
              ★ INFRASTRUCTURE & SERVER HEALTH REPORT (CPU, RAM, DATABASE)
              ★ 2 ANALYTICS CHARTS (MAJOR BAR CHART & ROLE DONUT CHART)
              ★ RECENT CLASSES & LECTURERS ASSIGNED
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* ── 4 EXECUTIVE KPI CARDS (SYNCHRONIZED FRAME) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Classes */}
              <Link href="/admin/classes" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tổng số lớp học
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {analyticsLoading ? '…' : (stats?.classes ?? '—')}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>Tổng lớp hiện có</span>
                  </div>
                </div>
              </Link>

              {/* Card 2: Lecturers */}
              <Link href="/admin/users?role=lecturer" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Giảng viên Campus
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {analyticsLoading ? '…' : (analytics ? lecturerCount : '—')}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>{stats ? `${stats.assignedLecturers}/${lecturerCount} giảng viên đã có lớp` : 'Chưa có dữ liệu'}</span>
                  </div>
                </div>
              </Link>

              {/* Card 3: Students */}
              <Link href="/admin/users?role=student" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Sinh viên toàn trường
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {analyticsLoading ? '…' : (analytics ? studentCount : '—')}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>Tổng tài khoản sinh viên</span>
                  </div>
                </div>
              </Link>

              {/* Card 4: AI Graded / Submissions */}
              <Link href="/admin/reports" className="block group">
                <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Bài nộp & AI Chấm
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {analyticsLoading ? '…' : (stats?.submissions ?? '—')}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>{stats ? `${stats.evaluated} lượt hoàn tất chấm trong 30 ngày` : 'Chưa có dữ liệu'}</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* ── BÁO CÁO HẠ TẦNG MÁY CHỦ, CPU, RAM & DATABASE ── */}
            <Card className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <span>Báo cáo Trạng thái Hạ tầng & Máy chủ</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        <Check className="w-3 h-3 text-emerald-600" />
                        {health ? (health.database.status === 'up' ? 'API & DB đang kết nối' : 'Không kết nối được DB') : 'Chưa có dữ liệu kiểm tra'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Giám sát tải CPU, bộ nhớ RAM, độ trễ PostgreSQL DB và Sandbox Docker AI Grader
                    </p>
                  </div>
                </div>

                <RefreshAction onRefresh={handleRefreshHealth} disabled={healthChecking} cachePaths={["/reports"]} />
              </div>

              {/* 4 Infrastructure Diagnostics Bento Nodes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Node 1: API Core Server */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      API Gateway
                    </span>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                      {health ? 'API đang phản hồi' : 'Chưa kiểm tra'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                    {health?.api?.formattedUptime ?? 'Chưa đo được'}
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-medium">
                    Thời gian chạy tiến trình API
                  </p>
                </div>

                {/* Node 2: PostgreSQL Database */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-600" />
                      PostgreSQL DB
                    </span>
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                      {health ? (health.database.status === 'up' ? 'Kết nối tốt' : 'Mất kết nối') : 'Chưa kiểm tra'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                    {health?.database.latencyMs ?? '—'} ms
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-medium">
                    Kiểm tra truy vấn PostgreSQL
                  </p>
                </div>

                {/* Node 3: CPU Load Gauge */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      Tải CPU Máy chủ
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                      {health?.system?.cpuCores ?? '—'} Cores
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                      {health?.system?.cpuUsagePercent == null ? 'Chưa đo được' : `${health.system.cpuUsagePercent}%`}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{health?.system?.cpuUsagePercent == null ? 'Chưa đo được' : health.system.cpuUsagePercent >= 80 ? 'Mức tải cao' : health.system.cpuUsagePercent >= 50 ? 'Mức tải vừa' : 'Mức tải thấp'}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, health?.system?.cpuUsagePercent ?? 0)}%` }}
                      className="h-full rounded-full bg-[#FA7014]"
                    />
                  </div>
                </div>

                {/* Node 4: RAM Allocation */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                      Bộ nhớ RAM
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                      {health?.system ? `${health.system.memoryUsagePercent}%` : 'Chưa đo được'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                    {health?.system ? `${Math.round(health.system.usedMemoryMb / 1024 * 10) / 10} GB` : 'Chưa đo được'}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, health?.system?.memoryUsagePercent ?? 0)}%` }}
                      className="h-full rounded-full bg-[#FA7014]"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* ── 3. CHARTS ROW (STUDENT MAJOR BREAKDOWN & USER ROLE DONUT) ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Left Chart: Phân bổ sinh viên theo chuyên ngành (7 cols) */}
              <Card className="md:col-span-7 p-5 rounded-2xl"><h4 className="font-bold">Phân bổ sinh viên theo chuyên ngành</h4><p className="py-12 text-sm text-center text-slate-500">Chưa có dữ liệu chuyên ngành sinh viên được lưu trong hệ thống.</p></Card>

<Card className="md:col-span-5 p-5 rounded-2xl"><h4 className="font-bold">Cơ cấu tài khoản toàn hệ thống</h4>{analytics ? <RoleDistribution roles={analytics.roles} /> : <p className="py-12 text-sm text-slate-500">{analyticsLoading ? 'Đang tải...' : 'Chưa tải được dữ liệu.'}</p>}</Card>
            </div>

            {/* ── 4. LOWER SECTION: CÁC LỚP HỌC MỚI NHẤT & GIẢNG VIÊN PHỤ TRÁCH ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card 1: Recent Classes with Instructors */}
              <Card className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>Lớp học & Giảng viên phụ trách</span>
                  </h4>
                  <Link
                    href="/admin/classes"
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-0.5 transition-colors"
                  >
                    <span>Quản lý lớp</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-2">
                  {recentClasses.length === 0 && <p className="text-xs text-slate-500">{loading ? 'Đang tải lớp học...' : 'Chưa có lớp học để hiển thị.'}</p>}
                  {recentClasses.slice(0, 4).map((cls: any) => (
                    <div key={cls.id || cls.code} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs transition-colors">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                            {cls.code}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {cls.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                          GV: <span className="font-bold text-slate-900 dark:text-white">{cls.lecturer?.fullName || cls.lecturerName || 'Chưa phân công'}</span>
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                        {cls._count?.enrollments ?? cls.studentCount ?? 0} SV
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Card 2: Recent Security & Audit Events */}
              <Card className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span>Nhật ký Kiểm toán Gần nhất</span>
                  </h4>
                </div>

                <div className="space-y-1.5">
                  {recentLogs.length === 0 && <p className="text-xs text-slate-500">{loading ? 'Đang tải nhật ký...' : 'Chưa có nhật ký để hiển thị.'}</p>}
                  {recentLogs.slice(0, 4).map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Activity className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {log.action || log.actionType}
                        </span>
                        {log.entityName && (
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate hidden sm:inline">
                            {log.entityName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-700 dark:text-slate-300 font-mono shrink-0 font-medium">
                        {formatRelativeTime(log.createdAt, isVi)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              RIGHT COLUMN (4 COLS)
              ★ ĐẶC BIỆT: KHUNG THÔNG BÁO HỆ THỐNG
              ★ THAO TÁC NHANH (QUICK ACTIONS 2x2)
              ★ TÌNH TRẠNG SAO LƯU & BẢO MẬT
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* ── ★ 1. BẢNG THÔNG BÁO HỆ THỐNG ── */}
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#FA7014] border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    <span>{isVi ? 'Thông báo Hệ thống' : 'System Notifications'}</span>
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FA7014] text-white text-xs font-bold leading-tight">
                      {unreadCount}
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-[#FA7014] hover:underline transition-colors cursor-pointer"
                  >
                    {isVi ? 'Đã đọc tất cả' : 'Mark all read'}
                  </button>
                )}
              </div>

              {/* Feed: Extended Scrollable Area without outer card container */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {isVi ? 'Không có thông báo mới' : 'No new notifications'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notif: any) => {
                    const isUnread = !notif.isRead

                    let typeLabel = isVi ? 'Hệ thống' : 'System'
                    if (notif.type === 'INFRA') typeLabel = isVi ? 'Hạ tầng CPU' : 'Infra'
                    else if (notif.type === 'CLASS') typeLabel = isVi ? 'Lớp học' : 'Class'
                    else if (notif.type === 'AI_GRADER') typeLabel = isVi ? 'Chấm AI' : 'AI Grader'
                    else if (notif.type === 'SECURITY') typeLabel = isVi ? 'Bảo mật' : 'Security'
                    else if (notif.type === 'USER') typeLabel = isVi ? 'Người dùng' : 'User'

                    return (
                      <div
                        key={notif.id}
                        className={`group relative rounded-xl p-3.5 transition-all duration-150 cursor-pointer bg-white dark:bg-slate-900 border ${
                          isUnread
                            ? 'border-orange-200 dark:border-orange-900/60 border-l-4 !border-l-[#FA7014] shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 border-l-4 border-l-transparent hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase text-[#FA7014] tracking-wider">
                              {typeLabel}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {formatRelativeTime(notif.createdAt, isVi, clockOffset)}
                              </span>
                              {isUnread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FA7014] shrink-0" />
                              )}
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#FA7014] transition-colors">
                            {notif.title}
                          </h4>

                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* ── 2. QUICK ACTIONS (2x2) ── */}
            <Card className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-wider uppercase">
                Thao tác Quản trị Nhanh
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/admin/classes"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-300 hover:bg-orange-50/30 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center text-center gap-1 group bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <BookOpen className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:text-[#FA7014] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Tạo Lớp Học</span>
                  <span className="text-[10px] text-slate-500">Xếp SV & GV</span>
                </Link>

                <Link
                  href="/admin/users?role=lecturer"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-300 hover:bg-orange-50/30 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center text-center gap-1 group bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <GraduationCap className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:text-[#FA7014] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Giảng Viên</span>
                  <span className="text-[10px] text-slate-500">Quản lý campus</span>
                </Link>

                <Link
                  href="/admin/users?role=student"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-300 hover:bg-orange-50/30 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center text-center gap-1 group bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <Users className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:text-[#FA7014] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Sinh Viên</span>
                  <span className="text-[10px] text-slate-500">K17 · K18 · K19</span>
                </Link>

                <Link
                  href="/admin/ai-config"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-300 hover:bg-orange-50/30 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center text-center gap-1 group bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <Bot className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:text-[#FA7014] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Cấu hình AI</span>
                  <span className="text-[10px] text-slate-500">Gemini & Sandbox</span>
                </Link>
              </div>
            </Card>

<Card className="p-5 rounded-2xl"><h4 className="font-bold text-sm">Trạng thái sao lưu</h4><p className="text-xs text-slate-500 mt-2">Chưa kết nối dữ liệu giám sát sao lưu. Chưa thể xác nhận lịch sao lưu hoặc lần sao lưu gần nhất.</p></Card>

          </div>
        </div>

        {/* ── 3. QUICK CREATE USER MODAL WITH LIVE PREVIEW ── */}
        <Modal
          isOpen={createUserModal}
          onClose={() => setCreateUserModal(false)}
          maxWidth="5xl"
          title={
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-50 text-[#FA7014] dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200">
                <UserPlus className="w-5 h-5" />
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">Thêm Tài Khoản Người Dùng Mới</span>
            </div>
          }
          description="Khởi tạo tài khoản Sinh viên hoặc Giảng viên với bản xem trước hồ sơ thẻ FPT University trực tiếp"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Fields (7 cols) */}
            <form onSubmit={handleCreateUser} className="lg:col-span-7 space-y-4">
              {createSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs rounded-xl font-medium border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{createSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center justify-between">
                  <span>Họ và tên đầy đủ <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-500">Hiển thị trên thẻ ID</span>
                </label>
                <Input
                  required
                  placeholder="Nguyễn Văn A"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:border-[#FA7014]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  Email đăng nhập FPT <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder="nguyenvana@fpt.edu.vn"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:border-[#FA7014]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                    Vai trò (Role)
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => {
                      const newRole = e.target.value
                      setNewUser({
                        ...newUser,
                        role: newRole,
                        department: newRole === 'lecturer' ? 'Bộ môn Kỹ thuật phần mềm' : newRole === 'admin' ? 'Ban Công nghệ FPT' : 'Kỹ thuật phần mềm (SE)',
                        studentCode: newRole === 'student' ? (newUser.studentCode || 'SE180001') : '',
                        lecturerCode: newRole === 'lecturer' ? (newUser.lecturerCode || 'GV001') : '',
                      })
                    }}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#FA7014]"
                  >
                    <option value="student">Sinh viên (Student)</option>
                    <option value="lecturer">Giảng viên (Lecturer)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                    {newUser.role === 'student' ? 'Mã số sinh viên (MSSV)' : newUser.role === 'lecturer' ? 'Mã giảng viên (MSGV)' : 'Mã quản trị viên'}
                  </label>
                  <Input
                    placeholder={newUser.role === 'student' ? 'SE180001' : newUser.role === 'lecturer' ? 'GV001' : 'AD001'}
                    value={newUser.role === 'student' ? newUser.studentCode : newUser.lecturerCode}
                    onChange={(e) => {
                      if (newUser.role === 'student') setNewUser({ ...newUser, studentCode: e.target.value })
                      else setNewUser({ ...newUser, lecturerCode: e.target.value })
                    }}
                    className="text-xs font-mono uppercase rounded-xl border border-slate-200 dark:border-slate-800 focus:border-[#FA7014]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                    Cơ sở (Campus)
                  </label>
                  <select
                    value={newUser.campus}
                    onChange={(e) => setNewUser({ ...newUser, campus: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#FA7014]"
                  >
                    <option value="FPT University Quy Nhơn">FPT University Quy Nhơn</option>
                    <option value="FPT University Cần Thơ">FPT University Cần Thơ</option>
                    <option value="FPT University Đà Nẵng">FPT University Đà Nẵng</option>
                    <option value="FPT University Hòa Lạc">FPT University Hòa Lạc</option>
                    <option value="FPT University TP.HCM">FPT University TP.HCM</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                    Số điện thoại
                  </label>
                  <Input
                    placeholder="0987654321"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:border-[#FA7014]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  Mật khẩu ban đầu (Để trống sẽ mặc định là Aita@123456)
                </label>
                <Input
                  type="password"
                  placeholder="Mặc định: Aita@123456"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 focus:border-[#FA7014]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateUserModal(false)}
                  className="text-xs cursor-pointer rounded-xl font-bold border border-slate-200 dark:border-slate-800"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  isLoading={creatingUser}
                >
                  Tạo người dùng & Đồng bộ
                </Button>
              </div>
            </form>

            {/* Right Column: Live Interactive FPT Card Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FA7014]" />
                  Xem trước Thẻ ID FPT
                </span>
                <span className="text-[10px] text-[#FA7014] font-mono font-medium">Live Preview</span>
              </div>

              {/* FPT University Student/Lecturer ID Card */}
              <div className="relative w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-all duration-200">
                {/* Header Strip */}
                <div className="bg-[#FA7014] px-4 py-2.5 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center font-black text-xs">
                      FPT
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider leading-none">
                        FPT UNIVERSITY
                      </h4>
                      <p className="text-[8px] text-white/80 leading-none mt-0.5">
                        Academic Identity Card
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/20">
                    2026
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar Badge */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black text-white bg-[#FA7014]">
                        {newUser.fullName
                          ? newUser.fullName.split(' ').slice(-2).map((n) => n[0]).join('').toUpperCase()
                          : (newUser.role === 'lecturer' ? 'GV' : newUser.role === 'admin' ? 'AD' : 'SV')}
                      </div>
                      <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Hoạt động">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      </span>
                    </div>

                    {/* Name & Role */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {newUser.fullName.trim() || 'Nguyễn Văn A'}
                      </h3>
                      <p className="text-xs font-mono font-semibold text-[#FA7014] mt-0.5">
                        {newUser.role === 'student' ? 'MSSV: ' : newUser.role === 'lecturer' ? 'MSGV: ' : 'MÃ QTV: '}
                        {(newUser.role === 'student' ? newUser.studentCode : newUser.lecturerCode) || 'CHƯA CẤP'}
                      </p>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {newUser.role === 'lecturer' ? (
                            <>
                              <School className="w-2.5 h-2.5" />
                              Giảng viên (Lecturer)
                            </>
                          ) : newUser.role === 'admin' ? (
                            <>
                              <Shield className="w-2.5 h-2.5" />
                              Quản trị viên (Admin)
                            </>
                          ) : (
                            <>
                              <GraduationCap className="w-2.5 h-2.5" />
                              Sinh viên (Student)
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Info Rows */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">{newUser.email || 'email@fpt.edu.vn'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-[11px]">{newUser.department || 'Chuyên ngành CNTT'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-[11px]">{newUser.campus}</span>
                    </div>

                    {newUser.phone && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate text-[11px]">{newUser.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Smart Barcode / Verification Strip */}
                  <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-0.5">
                        {[4, 2, 6, 3, 5, 2, 7, 4, 3, 6, 2, 5, 3, 4, 6, 2].map((w, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-800 dark:bg-slate-300 rounded-sm"
                            style={{ width: `${w}px`, height: '18px' }}
                          />
                        ))}
                      </div>
                      <p className="text-[9px] font-mono text-slate-400">ID • AITA-{(newUser.role === 'student' ? newUser.studentCode : newUser.lecturerCode) || 'NEW2026'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <QrCode className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center italic">
                Ảnh thẻ tự động cập nhật ngay khi bạn nhập thông tin bên cạnh.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
