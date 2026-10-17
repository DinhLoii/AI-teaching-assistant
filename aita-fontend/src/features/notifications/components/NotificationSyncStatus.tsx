'use client'
import { useNotifications } from '@/providers/notification-provider'
import { useLanguage } from '@/providers/language-provider'

export function NotificationSyncStatus() {
  const { isConnected } = useNotifications()
  const { t } = useLanguage()
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-slate-500">
      <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
      {isConnected ? t('notifications.live', 'Đang cập nhật trực tiếp') : t('notifications.reconnecting', 'Đang kết nối lại; thông báo sẽ tự đồng bộ')}
    </p>
  )
}
