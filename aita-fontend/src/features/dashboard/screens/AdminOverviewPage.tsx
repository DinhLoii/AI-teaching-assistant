'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { ErrorNotice } from '@/components/ui/feedback'
import { reportsApi } from '@/lib/api/modules/reports'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'

export default function AdminOverviewPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()
  const [stats, setStats] = useState<Record<string, string | number> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const entries = [
    { key: 'users', label: t('admin.dashboard.total_users', 'Người dùng'), href: '/admin/users' },
    { key: 'subjects', label: t('admin.dashboard.subjects', 'Môn học'), href: '/admin/subjects' },
    { key: 'classes', label: t('admin.dashboard.classes', 'Lớp học'), href: '/admin/classes' },
    { key: 'exams', label: t('Đề thi & Bài tập', 'Đề thi & Bài tập'), href: '/admin/exams' },
  ]

  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') return
    let active = true
    reportsApi.getStatsOverview().then(value => { if (active) { setStats(value); setError(null) } }).catch(cause => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [isAuthenticated, role, revision])
  return <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel={t('profile.role_admin', 'Quản trị viên')} requiredRole="admin" headerTitle={t('admin.overview.title', 'Tổng quan quản trị')} headerSubtitle={t('admin.overview.subtitle', 'Quản lý người dùng, đào tạo và hoạt động hệ thống')}>
    <div className="space-y-6">
      <div className="rounded-3xl border border-orange-200 bg-gradient-to-r from-orange-50 to-blue-50 p-7 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"><h2 className="text-2xl font-bold">{t('admin.overview.center_title', 'Trung tâm quản trị AITA')}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('admin.overview.center_desc', 'Chọn phân hệ để quản lý hoặc xem báo cáo hoạt động.')}</p></div>
      <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)} />
      {!stats && !error && <p role="status">{t('admin.overview.loading', 'Đang tải số liệu…')}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{entries.map(entry => <Link key={entry.key} href={entry.href}><Card className="space-y-3 p-5 hover:border-orange-400"><h2 className="font-semibold">{entry.label}</h2><p className="text-3xl font-bold">{!error && stats ? stats[entry.key] ?? '—' : '—'}</p></Card></Link>)}</div>
      <div className="flex flex-wrap gap-4"><Link className="text-orange-600 underline" href="/admin/reports">{t('admin.overview.link_reports', 'Báo cáo và trạng thái hệ thống')}</Link><Link className="text-orange-600 underline" href="/admin/ai-config">{t('admin.overview.link_ai_config', 'Cấu hình AI')}</Link><Link className="text-orange-600 underline" href="/admin/audit-logs">{t('admin.overview.link_audit', 'Nhật ký kiểm toán')}</Link></div>
    </div>
  </DashboardLayout>
}
