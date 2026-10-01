'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorNotice } from '@/components/ui/feedback'
import { settingsApi } from '@/lib/api/modules/settings'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'

export default function AdminSettingsPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()
  const [config, setConfig] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') return
    let active = true
    settingsApi.getSettingsConfig().then(value => { if (active) { setConfig(value); setError(null) } }).catch(cause => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [isAuthenticated, role, revision])
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!config || saving) return
    const payload = { appName: config.appName, organization: config.organization, sessionTimeout: config.sessionTimeout }
    setSaving(true); setError(null); setSaved(false)
    try {
      await settingsApi.updateSettingsConfig(payload)
      const persisted = await settingsApi.getSettingsConfig()
      if (Object.entries(payload).some(([key, value]) => persisted[key] !== value)) throw new Error('Dữ liệu đọc lại chưa khớp. Vui lòng thử tải lại.')
      setConfig(persisted); setSaved(true)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setSaving(false) }
  }
  return <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel={t('profile.role_admin', 'Quản trị viên')} requiredRole="admin" headerTitle={t('admin.settings.title', 'Cài đặt hệ thống')} headerSubtitle={t('admin.settings.subtitle', 'Thông tin tổ chức và cấu hình lưu trữ')}>
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('admin.settings.notice', 'Chính sách nộp muộn được đặt riêng cho từng đề. Giới hạn tải tệp và thời hạn phiên hiện do máy chủ quyết định. Các trường dưới đây lưu cấu hình, chưa tự thay đổi các giới hạn đang chạy.')}</p>
      <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)} />
      {!config ? !error && <p role="status">{t('ui.loading', 'Đang tải…')}</p> : <form onSubmit={save} onChange={() => setSaved(false)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <label className="block space-y-2"><span>{t('admin.settings.app_name', 'Tên hệ thống')}</span><Input required value={config.appName ?? ''} onChange={e => setConfig({ ...config, appName: e.target.value })} /></label>
        <label className="block space-y-2"><span>{t('admin.settings.organization', 'Tổ chức')}</span><Input required value={config.organization ?? ''} onChange={e => setConfig({ ...config, organization: e.target.value })} /></label>
        <label className="block space-y-2"><span>{t('admin.settings.session_timeout', 'Thời hạn phiên đã lưu (phút)')}</span><Input required type="number" min={1} max={10080} step={1} value={config.sessionTimeout ?? ''} onChange={e => setConfig({ ...config, sessionTimeout: e.target.value })} /></label>
        <Button type="submit" isLoading={saving}>{t('ui.save', 'Lưu thay đổi')}</Button>
        {saved && <p role="status" className="text-emerald-700 dark:text-emerald-400">{t('admin.settings.saved_success', 'Đã lưu và đọc lại cấu hình thành công.')}</p>}
      </form>}
    </div>
  </DashboardLayout>
}
