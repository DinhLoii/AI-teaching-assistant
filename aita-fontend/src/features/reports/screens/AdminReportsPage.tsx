'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { ErrorNotice } from '@/components/ui/feedback'
import { reportsApi, type AdminReport, type SystemHealth } from '@/lib/api/modules/reports'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'

export default function AdminReportsPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()
  const [period, setPeriod] = useState<'7d' | '30d' | 'semester'>('30d')
  const [report, setReport] = useState<AdminReport | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const labels = {
    users: t('admin.dashboard.total_users', 'Người dùng'),
    classes: t('admin.dashboard.classes', 'Lớp học'),
    exams: t('Đề thi & Bài tập', 'Đề thi'),
    submissions: t('Kết quả & Bài nộp', 'Bài nộp'),
    auditLogs: t('Nhật ký kiểm toán', 'Sự kiện kiểm toán'),
  }

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') return
    let active = true
    Promise.all([reportsApi.getSystemReports(period), reportsApi.getSystemHealth()]).then(([result, status]) => {
      if (active) { setReport(result); setHealth(status); setError(null) }
    }).catch(cause => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [isAuthenticated, role, period, revision])
  return <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel={t('profile.role_admin', 'Quản trị viên')} requiredRole="admin" headerTitle={t('admin.reports.title', 'Báo cáo hệ thống')} headerSubtitle={t('admin.reports.subtitle', 'Số liệu và trạng thái từ máy chủ')}>
    <div className="space-y-5">
      <label className="flex items-center gap-3">{t('admin.reports.period', 'Khoảng thời gian')}<select className="rounded-xl border bg-white p-3 dark:bg-slate-900" value={period} onChange={e => { setPeriod(e.target.value as typeof period); setReport(null) }}><option value="7d">{t('admin.reports.7d', '7 ngày')}</option><option value="30d">{t('admin.reports.30d', '30 ngày')}</option><option value="semester">{t('admin.reports.semester', '120 ngày')}</option></select></label>
      <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)} />
      {!report && !error && <p role="status">{t('ui.loading', 'Đang tải báo cáo…')}</p>}
      {report && !error && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key, label]) => <Card key={key} className="p-5"><h2 className="text-sm text-slate-500">{label}</h2><p className="mt-2 text-3xl font-bold">{report.summary[key as keyof typeof labels].toLocaleString()}</p></Card>)}</div>}
      {health && !error && <Card className="space-y-3 p-5"><h2 className="font-bold">{t('admin.reports.health_title', 'Trạng thái kiểm tra')}</h2><p>API: {health.api.status === 'up' ? t('admin.reports.api_responding', 'Đang phản hồi') : t('admin.reports.api_unavailable', 'Không khả dụng')}</p><p>Database: {health.database.status === 'up' ? `${t('admin.reports.db_connected', 'Kết nối thành công')} (${health.database.latencyMs ?? '—'} ms)` : t('admin.reports.db_failed', 'Không kết nối được')}</p><p>AI: Mode {health.aiEngine.mode}.</p>{health.checkedAt && <p className="text-sm text-slate-500">Checked: {new Date(health.checkedAt).toLocaleString()}</p>}</Card>}
    </div>
  </DashboardLayout>
}
