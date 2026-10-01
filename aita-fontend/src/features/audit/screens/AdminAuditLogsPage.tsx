'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { ErrorNotice, Pagination } from '@/components/ui/feedback'
import { auditApi, type AuditEntry } from '@/lib/api/modules/audit'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'

export default function AdminAuditLogsPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()
  const [mode, setMode] = useState<'system' | 'ai'>('system')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AuditEntry[] | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') return
    let active = true
    const fetchPage = mode === 'system' ? auditApi.getAuditLogs : auditApi.getAIAuditLogs
    Promise.all([fetchPage(page), fetchPage(page + 1)]).then(([result, next]) => { if (active) { setRows(result); setHasNext(next.length > 0); setError(null) } }).catch(cause => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [isAuthenticated, role, mode, page, revision])
  return <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel={t('profile.role_admin', 'Quản trị viên')} requiredRole="admin" headerTitle={t('admin.audit.title', 'Nhật ký kiểm toán')} headerSubtitle={t('admin.audit.subtitle', 'Lịch sử hoạt động hệ thống và sử dụng AI')}>
    <div className="space-y-5">
      <div className="flex gap-3">{(['system', 'ai'] as const).map(value => <Button key={value} variant={mode === value ? 'primary' : 'outline'} aria-pressed={mode === value} onClick={() => { setMode(value); setPage(1); setRows(null); setError(null) }}>{value === 'system' ? t('admin.audit.system_btn', 'Hệ thống') : t('admin.audit.ai_btn', 'Sử dụng AI')}</Button>)}</div>
      <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)} />
      {!rows && !error && <p role="status">{t('admin.audit.loading', 'Đang tải nhật ký…')}</p>}
      {rows?.length === 0 && !error && <p>{t('admin.audit.empty', 'Chưa có nhật ký ở trang này.')}</p>}
      {!error && rows?.map(row => <article key={row.id} className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-semibold">{mode === 'system' ? row.action : row.actionType || row.modelUsed || 'Lượt gọi AI'}</h2><p className="break-all text-sm">Người thực hiện: {row.userId || 'Hệ thống'}</p>{mode === 'system' ? <p className="break-all text-sm">{row.entityName} · {row.entityId}</p> : <><p className="text-sm">{row.modelUsed} · {row.isSuccess === true ? 'Thành công' : row.isSuccess === false ? 'Thất bại' : 'Chưa có trạng thái'}</p><p className="text-sm">Token đầu vào: {row.promptTokens ?? '—'} · đầu ra: {row.completionTokens ?? '—'}</p>{row.errorMessage && <p className="text-sm text-rose-600">{row.errorMessage}</p>}</>}<time className="text-sm text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString() : 'Chưa có thời gian'}</time></article>)}
      <Pagination page={page} hasNext={hasNext} loading={!rows && !error} onChange={value => { setPage(value); setRows(null); setError(null) }} />
    </div>
  </DashboardLayout>
}
