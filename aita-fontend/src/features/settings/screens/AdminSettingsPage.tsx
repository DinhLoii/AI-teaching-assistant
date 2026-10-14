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
import { Settings, Building2, Clock, Globe, Save, Check, Info } from 'lucide-react'

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
    settingsApi
      .getSettingsConfig()
      .then((value) => {
        if (active) {
          setConfig(value)
          setError(null)
        }
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause))
      })
    return () => {
      active = false
    }
  }, [isAuthenticated, role, revision])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!config || saving) return
    const payload = {
      appName: config.appName,
      organization: config.organization,
      sessionTimeout: config.sessionTimeout,
    }
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await settingsApi.updateSettingsConfig(payload)
      const persisted = await settingsApi.getSettingsConfig()
      if (Object.entries(payload).some(([key, value]) => persisted[key] !== value)) {
        throw new Error('Dữ liệu đọc lại chưa khớp. Vui lòng thử tải lại.')
      }
      setConfig(persisted)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.settings.title', 'Cài đặt hệ thống')}
      headerSubtitle={t('admin.settings.subtitle', 'Thông tin tổ chức và cấu hình lưu trữ')}
    >
      <div className="w-full space-y-6 pb-12">
        {/* Info notice banner */}
        <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FA7014] border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {t(
              'admin.settings.notice',
              'Chính sách nộp muộn được đặt riêng cho từng đề. Giới hạn tải tệp và thời hạn phiên hiện do máy chủ quyết định. Các trường dưới đây lưu cấu hình, chưa tự thay đổi các giới hạn đang chạy.'
            )}
          </p>
        </div>

        <ErrorNotice message={error} onRetry={() => setRevision((value) => value + 1)} />

        {!config ? (
          !error && (
            <div className="py-20 text-center text-slate-400 text-xs">
              {t('ui.loading', 'Đang tải…')}
            </div>
          )
        ) : (
          <form onSubmit={save} onChange={() => setSaved(false)} className="space-y-6">
            <div className="rounded-xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-6">
              {/* Form Title & Icon Badge */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FA7014] border border-orange-200/60 dark:border-orange-900/60 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Cấu hình Tham số Nền tảng</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Tùy biến tên hiển thị, đơn vị tổ chức và thời lượng phiên làm việc
                  </p>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-5">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#FA7014]" />
                    {t('admin.settings.app_name', 'Tên hệ thống')}
                  </span>
                  <Input
                    required
                    value={config.appName ?? ''}
                    onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800 focus:border-[#FA7014] text-slate-900 dark:text-white"
                    placeholder="AITA - AI Teaching Assistant"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#FA7014]" />
                    {t('admin.settings.organization', 'Tổ chức')}
                  </span>
                  <Input
                    required
                    value={config.organization ?? ''}
                    onChange={(e) => setConfig({ ...config, organization: e.target.value })}
                    className="text-xs rounded-xl border-slate-200 dark:border-slate-800 focus:border-[#FA7014] text-slate-900 dark:text-white"
                    placeholder="Trường Đại học FPT"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#FA7014]" />
                    {t('admin.settings.session_timeout', 'Thời hạn phiên đã lưu (phút)')}
                  </span>
                  <Input
                    required
                    type="number"
                    min={1}
                    max={10080}
                    step={1}
                    value={config.sessionTimeout ?? ''}
                    onChange={(e) => setConfig({ ...config, sessionTimeout: e.target.value })}
                    className="text-xs font-mono rounded-xl border-slate-200 dark:border-slate-800 focus:border-[#FA7014] text-slate-900 dark:text-white"
                  />
                </label>
              </div>

              {/* Actions & Feedback */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  {saved && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                      {t('admin.settings.saved_success', 'Đã lưu và đọc lại cấu hình thành công.')}
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={saving}
                  className="gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{t('ui.save', 'Lưu thay đổi')}</span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
