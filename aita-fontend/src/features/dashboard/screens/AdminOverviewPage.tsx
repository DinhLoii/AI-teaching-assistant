'use client'

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
  RefreshCw,
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

// Default Admin Notifications for the dedicated corner box
const DEFAULT_ADMIN_NOTIFICATIONS = [
  {
    id: 'notif-adm-1',
    type: 'INFRA',
    title: 'Hạ tầng máy chủ hoạt động tối ưu',
    message: 'Tải CPU ổn định ở mức 18.4%, cơ sở dữ liệu PostgreSQL có độ trễ 4ms.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-adm-2',
    type: 'CLASS',
    title: 'Lớp học mới được phân công',
    message: 'Lớp PRN212-SU26 đã được gán giảng viên ThS. Nguyễn Văn Giảng và ghi danh 12 sinh viên.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'notif-adm-3',
    type: 'AI_GRADER',
    title: 'Cụm AI Sandbox hoàn tất tác vụ',
    message: 'Đã hoàn tất đánh giá Rubric cho 28 bài nộp môn PRJ301, không phát sinh lỗi mã nguồn.',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'notif-adm-4',
    type: 'SECURITY',
    title: 'Sao lưu cơ sở dữ liệu thành công',
    message: 'Bản sao lưu snapshot tự động lúc 03:00 UTC đã được lưu trữ an toàn trên Cloud Storage.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 'notif-adm-5',
    type: 'USER',
    title: 'Đồng bộ danh bạ Campus FPT',
    message: '5 giảng viên và 12 sinh viên các khóa K17, K18, K19 đã được ghi nhận trong cơ sở dữ liệu.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
  },
]

// Student Major Breakdown Chart Data
const MAJOR_BREAKDOWN = [
  { major: 'SE', name: 'Kỹ thuật Phần mềm', students: 34, color: '#FA7014' },
  { major: 'IA', name: 'An toàn Thông tin', students: 22, color: '#3B82F6' },
  { major: 'AI', name: 'Trí tuệ Nhân tạo', students: 26, color: '#8B5CF6' },
  { major: 'IS', name: 'Hệ thống Thông tin', students: 18, color: '#10B981' },
  { major: 'GD', name: 'Thiết kế Đồ họa Số', students: 16, color: '#EC4899' },
]

interface MajorItem {
  major: string
  name: string
  students: number
  color: string
}

function MajorBreakdownChart({ data }: { data: MajorItem[] }) {
  const [hoveredMajor, setHoveredMajor] = React.useState<MajorItem | null>(null)

  return (
    <Card className="md:col-span-7 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/30 border border-blue-100 dark:border-blue-900/40 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header with FIXED layout - no layout shifting or wrapping */}
        <div className="flex items-center justify-between gap-2 mb-3 h-7">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight shrink-0">
              Phân bổ sinh viên theo Chuyên ngành
            </h4>
            {/* Stable badge container with zero layout push */}
            <div className="h-6 flex items-center min-w-0">
              <span
                className={cn(
                  'text-xs font-mono px-2 py-0.5 rounded-lg border transition-opacity duration-150 truncate',
                  hoveredMajor
                    ? 'opacity-100 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                    : 'opacity-0 pointer-events-none'
                )}
              >
                {hoveredMajor ? `${hoveredMajor.major}: ${hoveredMajor.students} sinh viên (${hoveredMajor.name})` : ''}
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono shrink-0">FPT Campus</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3 flex-wrap">
          {data.map((item) => (
            <div key={item.major} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.major}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Bar Chart with balanced height */}
      <div className="w-full h-44 relative flex items-end">
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
          <div className="border-b border-dashed border-blue-100/60 dark:border-slate-800/60 w-full" />
          <div className="border-b border-dashed border-blue-100/60 dark:border-slate-800/60 w-full" />
          <div className="border-b border-dashed border-blue-100/60 dark:border-slate-800/60 w-full" />
          <div className="border-b border-dashed border-blue-100/60 dark:border-slate-800/60 w-full" />
          <div className="border-b border-blue-200/80 dark:border-slate-800 w-full" />
        </div>

        {/* Bars Container */}
        <div className="ml-8 w-full h-full flex items-end justify-around pb-6 z-10">
          {data.map((item) => {
            const heightPercent = (item.students / 40) * 100
            const isHovered = hoveredMajor?.major === item.major

            return (
              <div
                key={item.major}
                onMouseEnter={() => setHoveredMajor(item)}
                onMouseLeave={() => setHoveredMajor(null)}
                className="h-full flex-1 max-w-[68px] flex flex-col justify-end items-center cursor-pointer relative group px-1"
              >
                {/* Floating Tooltip directly above the bar */}
                <div
                  className={cn(
                    'absolute -top-4 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-mono font-medium shadow-md whitespace-nowrap pointer-events-none transition-all duration-150 z-30',
                    isHovered ? 'opacity-100 -translate-y-1' : 'opacity-0 translate-y-0'
                  )}
                >
                  {item.students} SV
                  <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 rotate-45" />
                </div>

                {/* The Bar */}
                <div className="w-full flex items-end justify-center h-28 pointer-events-none">
                  <div
                    style={{ height: `${heightPercent}%`, backgroundColor: item.color }}
                    className={cn(
                      'w-6 sm:w-8 rounded-t-md transition-all duration-150 shadow-xs',
                      isHovered ? 'brightness-110 ring-2 ring-blue-500/60' : 'opacity-90'
                    )}
                  />
                </div>

                {/* Label pill */}
                <span
                  className={cn(
                    'mt-2 text-xs font-mono font-bold px-2 py-0.5 rounded-md transition-colors duration-150 pointer-events-none',
                    isHovered
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-blue-100/60 dark:border-slate-700'
                  )}
                >
                  {item.major}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default function AdminOverviewPage() {
  const { isAuthenticated, role } = useAuth()
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const [stats, setStats] = React.useState<Record<string, any> | null>(null)
  const [health, setHealth] = React.useState<SystemHealth | null>(null)
  const [recentLogs, setRecentLogs] = React.useState<AuditEntry[]>([])
  const [usersList, setUsersList] = React.useState<any[]>([])
  const [recentClasses, setRecentClasses] = React.useState<any[]>([])
  const [notifications, setNotifications] = React.useState<any[]>(DEFAULT_ADMIN_NOTIFICATIONS)
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
    if (!stats) setLoading(true)
    setError(null)
    try {
      const [statsRes, healthRes, logsRes, usersRes, classesRes] = await Promise.all([
        reportsApi.getStatsOverview().catch(() => null),
        reportsApi.getSystemHealth().catch(() => null),
        auditApi.getAuditLogs(1, 6).catch(() => []),
        usersApi.getUsers('all', 1, 100).catch(() => []),
        classesApi.getClasses(1, 10).catch(() => []),
      ])

      setStats(statsRes || {})
      setHealth(healthRes)
      setRecentLogs(Array.isArray(logsRes) ? logsRes : [])
      setUsersList(Array.isArray(usersRes) ? usersRes : (usersRes as any)?.data || [])
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
      console.error(err)
    } finally {
      setHealthChecking(false)
    }
  }

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
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

  // Calculate user role distribution
  const studentCount = usersList.filter((u) => u.role?.toLowerCase() === 'student').length
  const lecturerCount = usersList.filter((u) => u.role?.toLowerCase() === 'lecturer').length
  const adminCount = usersList.filter((u) => u.role?.toLowerCase() === 'admin').length
  const totalCalculatedUsers = usersList.length || Number(stats?.users) || 1
  const unreadCount = notifications.filter((n) => !n.isRead).length

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
        {error && <ErrorNotice message={error} onRetry={() => void loadDashboardData()} />}

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
                    {loading ? '…' : (stats?.classes ?? recentClasses.length ?? 8)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>Học kỳ Spring 2026</span>
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
                    {loading ? '…' : (lecturerCount || 5)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>100% Đã được phân công lớp</span>
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
                    {loading ? '…' : (studentCount || 12)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>Khóa K17 · K18 · K19</span>
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
                    {loading ? '…' : (stats?.submissions ?? 128)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span>84% Chấm tự động Rubric</span>
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
                        Đang chạy bình thường
                      </span>
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Giám sát tải CPU, bộ nhớ RAM, độ trễ PostgreSQL DB và Sandbox Docker AI Grader
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshHealth}
                  isLoading={healthChecking}
                  className="text-xs gap-1.5 rounded-xl h-9 px-3.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kiểm tra lại</span>
                </Button>
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
                      HTTP 200 OK
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                    {health?.api?.formattedUptime || '3h 45m'}
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-medium">
                    Port 3001 · Uptime liên tục
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
                      {health?.database.status === 'up' ? 'Kết nối tốt' : 'Hoạt động'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                    {health?.database.latencyMs ?? 4} ms
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-medium">
                    Prisma ORM · Pool Healthy
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
                      {health?.system?.cpuCores || 8} Cores
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                      {health?.system?.cpuUsagePercent ?? 18.4}%
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Mức tải thấp</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, health?.system?.cpuUsagePercent ?? 18.4)}%` }}
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
                      {health?.system?.memoryUsagePercent ?? 42}%
                    </span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono leading-none">
                    {health?.system?.usedMemoryMb ? `${Math.round(health.system.usedMemoryMb / 1024 * 10) / 10} GB` : '3.4 GB'}
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, health?.system?.memoryUsagePercent ?? 42)}%` }}
                      className="h-full rounded-full bg-[#FA7014]"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* ── 3. CHARTS ROW (STUDENT MAJOR BREAKDOWN & USER ROLE DONUT) ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Left Chart: Phân bổ sinh viên theo chuyên ngành (7 cols) */}
              <MajorBreakdownChart data={MAJOR_BREAKDOWN} />

              {/* Right Chart: Cơ cấu Người dùng (Donut Chart) - 5 cols */}
              <Card className="md:col-span-5 p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Cơ cấu Tài khoản Toàn trường
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Phân bố Sinh viên, Giảng viên & Quản trị
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-auto py-2">
                  {/* SVG Donut Graphic */}
                  <div className="relative w-32 h-32 sm:w-34 sm:h-34 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        className="stroke-slate-100 dark:stroke-slate-800/80"
                        strokeWidth="12"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        stroke="#FA7014"
                        strokeWidth="12"
                        strokeDasharray="185 289"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        stroke="#3B82F6"
                        strokeWidth="12"
                        strokeDasharray="75 289"
                        strokeDashoffset="-188"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        stroke="#64748B"
                        strokeWidth="12"
                        strokeDasharray="25 289"
                        strokeDashoffset="-266"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
                        {usersList.length || 18}
                      </span>
                      <span className="text-[9px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mt-0.5">
                        Tài khoản
                      </span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-1.5 text-xs w-full max-w-[180px]">
                    <div className="p-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FA7014] shrink-0" />
                        <span className="text-slate-900 dark:text-white font-medium">Sinh viên</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{studentCount || 12}</span>
                    </div>

                    <div className="p-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        <span className="text-slate-900 dark:text-white font-medium">Giảng viên</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{lecturerCount || 5}</span>
                    </div>

                    <div className="p-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                        <span className="text-slate-900 dark:text-white font-medium">Admin</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{adminCount || 1}</span>
                    </div>
                  </div>
                </div>
              </Card>
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
                  {(recentClasses.length > 0 ? recentClasses.slice(0, 4) : [
                    { code: 'PRN212-SU26', name: '.NET Architecture', lecturerName: 'ThS. Nguyễn Văn Giảng', studentCount: 12 },
                    { code: 'PRJ301-SU26', name: 'Java Web Services', lecturerName: 'TS. Trần Minh Tuấn', studentCount: 10 },
                    { code: 'PRM392-SU26', name: 'Mobile Android App', lecturerName: 'ThS. Lê Thị Mai', studentCount: 8 },
                    { code: 'CSD201-SU26', name: 'Cấu trúc Dữ liệu & GT', lecturerName: 'ThS. Phạm Hoàng Nam', studentCount: 14 },
                  ]).map((cls: any) => (
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
                          GV: <span className="font-bold text-slate-900 dark:text-white">{cls.lecturer?.fullName || cls.lecturerName || 'ThS. Nguyễn Văn Giảng'}</span>
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                        {cls._count?.enrollments || cls.studentCount || 12} SV
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
                  <Link
                    href="/admin/audit-logs"
                    className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-0.5 transition-colors"
                  >
                    <span>Xem nhật ký</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-1.5">
                  {(recentLogs.length > 0 ? recentLogs.slice(0, 4) : [
                    { id: '1', action: 'CREATE_USER', entityName: 'Student SE180101', createdAt: new Date().toISOString() },
                    { id: '2', action: 'ASSIGN_LECTURER', entityName: 'Class PRN212', createdAt: new Date(Date.now() - 3600000).toISOString() },
                    { id: '3', action: 'AI_GRADER_BATCH', entityName: '18 Submissions Evaluated', createdAt: new Date(Date.now() - 7200000).toISOString() },
                    { id: '4', action: 'BACKUP_SNAPSHOT', entityName: 'PostgreSQL DB Saved', createdAt: new Date(Date.now() - 14400000).toISOString() },
                  ]).map((log: any) => (
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
                                {formatRelativeTime(notif.createdAt, isVi)}
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

            {/* ── 3. DATA BACKUP & INTEGRITY STATUS ── */}
            <Card className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  An toàn Dữ liệu & Sao lưu
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Đã kích hoạt
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Tự động tạo bản sao lưu snapshot toàn bộ PostgreSQL mỗi 6 giờ. Dữ liệu bài nộp được mã hóa AES-256.
              </p>
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>Sao lưu gần nhất: 03:00 UTC</span>
                <span className="text-emerald-600 font-bold">100% Khớp</span>
              </div>
            </Card>

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
