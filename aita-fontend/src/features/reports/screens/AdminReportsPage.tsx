'use client'

import * as React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErrorNotice } from '@/components/ui/feedback'
import { reportsApi, type AdminReport, type SystemHealth } from '@/lib/api/modules/reports'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  FileSignature,
  FileCheck,
  ShieldCheck,
  Server,
  Database,
  Bot,
  Download,
  Calendar,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Activity,
} from 'lucide-react'

export default function AdminReportsPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()

  const [period, setPeriod] = React.useState<'7d' | '30d' | 'semester'>('30d')
  const [report, setReport] = React.useState<AdminReport | null>(null)
  const [health, setHealth] = React.useState<SystemHealth | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)

  const loadReportData = React.useCallback(async () => {
    if (!isAuthenticated || role !== 'admin') return
    setLoading(true)
    setError(null)
    try {
      const [reportRes, healthRes] = await Promise.all([
        reportsApi.getSystemReports(period),
        reportsApi.getSystemHealth(),
      ])
      setReport(reportRes)
      setHealth(healthRes)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, role, period])

  React.useEffect(() => {
    void loadReportData()
  }, [loadReportData])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadReportData()
    } finally {
      setRefreshing(false)
    }
  }

  // Export CSV Report
  const handleExportCSV = () => {
    if (!report) return
    const csvContent = [
      ['Chỉ số', 'Số lượng', 'Khoảng thời gian', 'Thời điểm xuất'],
      ['Người dùng hệ thống', report.summary.users, period, new Date().toISOString()],
      ['Lớp học đào tạo', report.summary.classes, period, new Date().toISOString()],
      ['Đề thi & Assignment', report.summary.exams, period, new Date().toISOString()],
      ['Lượt nộp bài sinh viên', report.summary.submissions, period, new Date().toISOString()],
      ['Sự kiện kiểm toán', report.summary.auditLogs, period, new Date().toISOString()],
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `AITA_System_Report_${period}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export JSON Report
  const handleExportJSON = () => {
    if (!report) return
    const data = {
      report,
      health,
      exportedAt: new Date().toISOString(),
      platform: 'AITA Teaching Assistant System',
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `AITA_Full_Report_${period}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const periodLabels = {
    '7d': '7 ngày qua',
    '30d': '30 ngày qua',
    semester: '120 ngày (Học kỳ)',
  }

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.reports.title', 'Báo cáo & Phân tích Nền tảng')}
      headerSubtitle={t('admin.reports.subtitle', 'Số liệu vận hành, hiệu suất nộp bài và tình trạng hạ tầng toàn trường')}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── TOP CONTROLS & TIMEFRAME SELECTOR ── */}
        <div className="rounded-xl p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FA7014] border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Khoảng thời gian phân tích</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Lọc số liệu tổng hợp theo chu kỳ vận hành học vụ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Period Tabs */}
            <div className="inline-flex flex-wrap p-1 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
              {(['7d', '30d', 'semester'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    period === p
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={refreshing}
              className="text-xs gap-1.5 cursor-pointer rounded-2xl h-9 px-4 font-semibold shadow-xs border border-orange-200/80 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/30 dark:from-slate-900 dark:to-slate-800 text-slate-700 dark:text-slate-200 hover:border-orange-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </Button>
          </div>
        </div>

        {error && <ErrorNotice message={error} onRetry={() => void loadReportData()} />}

        {/* ── 5 PRIMARY KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* KPI 1: Users */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Người dùng
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : (report?.summary.users ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Tài khoản trong hệ thống</span>
            </div>
          </div>

          {/* KPI 2: Classes */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lớp học
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : (report?.summary.classes ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Lớp đang hoạt động</span>
            </div>
          </div>

          {/* KPI 3: Exams */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đề thi & BTVN
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileSignature className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : (report?.summary.exams ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Barem Rubric tiêu chuẩn</span>
            </div>
          </div>

          {/* KPI 4: Submissions */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Bài nộp ({period})
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : (report?.summary.submissions ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Đã kiểm tra & xếp điểm</span>
            </div>
          </div>

          {/* KPI 5: Audit logs */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sự kiện kiểm toán
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : (report?.summary.auditLogs ?? 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Ghi nhận an ninh nền tảng</span>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN: SYSTEM HEALTH DIAGNOSTICS & DATA EXPORT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Diagnostics (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl p-6 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FA7014] border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Kiểm tra & Chuẩn đoán Dịch vụ Hạ tầng</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Tình trạng kết nối vi dịch vụ thời gian thực
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 font-semibold rounded-lg">
                  Real-time Health Check
                </Badge>
              </div>

              <div className="space-y-3">
                {/* Check 1: API */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Hệ thống API RESTful (Port 5000)
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Quản lý định tuyến và xác thực JWT Bearer
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {health?.api.status === 'up' ? 'Hoạt động tốt' : 'Không khả dụng'}
                  </span>
                </div>

                {/* Check 2: Database */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Cơ sở Dữ liệu Quan hệ (PostgreSQL)
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Độ trễ truy vấn: <strong className="text-slate-900 dark:text-white font-mono">{health?.database.latencyMs ?? 14} ms</strong>
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {health?.database.status === 'up' ? 'Kết nối thành công' : 'Lỗi kết nối'}
                  </span>
                </div>

                {/* Check 3: AI Engine */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        AI Grader & Sandbox Worker
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Engine Mode: <span className="font-mono text-slate-900 dark:text-white font-bold">{health?.aiEngine.mode ?? 'stub'}</span>
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-[#FA7014] dark:bg-orange-950/40 dark:text-[#FA7014] border border-orange-200 dark:border-orange-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FA7014]" />
                    Sẵn sàng xử lý
                  </span>
                </div>
              </div>

              {health?.checkedAt && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  Đồng bộ lần cuối lúc: {new Date(health.checkedAt).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
          </div>

          {/* Export Center (1 col) */}
          <div className="space-y-4">
            <div className="rounded-xl p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FA7014] border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Trung tâm Xuất Dữ liệu
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Trích xuất hồ sơ kiểm định
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Tải về số liệu hệ thống phục vụ công tác thanh tra học vụ và kiểm định chất lượng đào tạo toàn trường.
              </p>

              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleExportCSV}
                  disabled={!report}
                  className="w-full text-xs gap-2 justify-start cursor-pointer bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>Xuất báo cáo Excel (CSV)</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleExportJSON}
                  disabled={!report}
                  className="w-full text-xs gap-2 justify-start cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold rounded-xl text-slate-900 dark:text-slate-100 transition-colors"
                >
                  <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>Xuất bản sao lưu JSON</span>
                </Button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                💡 <span className="font-semibold text-slate-900 dark:text-white">Mẹo:</span> Báo cáo CSV tương thích trực tiếp với Microsoft Excel, Google Sheets và phần mềm quản lý điểm đào tạo FPT.
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
