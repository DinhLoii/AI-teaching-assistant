'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorNotice } from '@/components/ui/feedback'
import { settingsApi } from '@/lib/api/modules/settings'
import { errorMessage } from '@/lib/api/errors'
import type { AIConfig } from '@/lib/api/contracts'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'

export default function AdminAIConfigPage() {
  const { role, isAuthenticated } = useAuth()
  const { t } = useLanguage()
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!isAuthenticated || role !== 'admin') return
    let active = true
    settingsApi.getAIConfig().then(value => { if (active) { setConfig(value); setError(null) } }).catch(cause => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [isAuthenticated, role, revision])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!config || saving) return
    setSaving(true); setSaved(false); setError(null)
    try {
      await settingsApi.updateAIConfig(config)
      const persisted = await settingsApi.getAIConfig()
      if (Object.entries(config).some(([key, value]) => persisted[key as keyof AIConfig] !== value)) throw new Error('Dữ liệu đọc lại khác dữ liệu đã gửi. Vui lòng tải lại trước khi thử tiếp.')
      setConfig(persisted); setSaved(true)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setSaving(false) }
  }
  return <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel={t('profile.role_admin', 'Quản trị viên')} requiredRole="admin" headerTitle={t('admin.ai.title', 'Cấu hình AI')} headerSubtitle={t('admin.ai.subtitle', 'Quản lý cấu hình đã lưu của hệ thống')}>
    <div className="max-w-3xl space-y-5">
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">{t('admin.ai.notice', 'Các giá trị bên dưới được lưu trong hệ thống. Engine chấm hiện đọc cấu hình từ môi trường máy chủ; thay đổi tại đây chưa tự áp dụng cho engine. API key được quản lý tại máy chủ.')}</p>
      <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)} />
      {!config ? !error && <p role="status">{t('ui.loading', 'Đang tải…')}</p> : <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900" onChange={() => setSaved(false)}>
        <label className="block space-y-2"><span>{t('admin.ai.endpoint', 'AI endpoint')}</span><Input type="url" value={config.aiEndpoint} onChange={e => setConfig({ ...config, aiEndpoint: e.target.value })} /></label>
        <label className="block space-y-2"><span>{t('admin.ai.model', 'Tên mô hình')}</span><Input required value={config.aiModel} onChange={e => setConfig({ ...config, aiModel: e.target.value })} /></label>
        <label className="block space-y-2"><span>{t('admin.ai.timeout', 'Thời gian chờ (giây)')}</span><Input type="number" required min={1} max={3600} step={1} value={config.aiTimeout} onChange={e => setConfig({ ...config, aiTimeout: e.target.value })} /></label>
        <label className="flex items-center gap-3"><input type="checkbox" checked={config.aiStubMode === 'true'} onChange={e => setConfig({ ...config, aiStubMode: String(e.target.checked) })} /><span>{t('admin.ai.stub_mode', 'Lưu lựa chọn chế độ giả lập')}</span></label>
        <Button type="submit" isLoading={saving}>{t('admin.ai.save_btn', 'Lưu cấu hình')}</Button>
        {saved && <p role="status" className="text-emerald-700 dark:text-emerald-400">{t('admin.ai.saved_msg', 'Đã lưu và kiểm tra lại dữ liệu. Engine chưa tự chuyển cấu hình.')}</p>}
      </form>}
    </div>
  </DashboardLayout>
}
