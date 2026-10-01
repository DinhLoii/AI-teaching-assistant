'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { notificationsApi } from '@/lib/api/modules/notifications'
import { useNotifications } from '@/providers/notification-provider'
import { emitNotificationEvent, subscribeNotificationEvents } from '@/lib/events/notifications'
import {
  Bell,
  CheckCircle2,
  ArrowRight,
  Shield,
  Users,
  Settings,
  AlertTriangle,
  CheckCheck,
  Send,
  MessageSquare,
  Trash2,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'


export default function AdminNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const [loading, setLoading] = React.useState(false)
  const [broadcastModal, setBroadcastModal] = React.useState(false)
  const [broadcasting, setBroadcasting] = React.useState(false)
  const [broadcastData, setBroadcastData] = React.useState({ title: '', message: '', targetRole: 'ALL' })
  const { refresh: refreshBadge, clearNew } = useNotifications()
  const { t } = useLanguage()

  const resolveTarget = React.useCallback((item: any): string => {
    if (item.link) return item.link
    return '/admin'
  }, [])

  const loadNotifications = React.useCallback(() => {
    setLoading(true)
    notificationsApi.getMyNotifications()
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          const apiMapped = data.map((n: any) => {
            const isRead = n.isRead ?? n.read ?? false
            const createdAt = n.createdAt ? new Date(n.createdAt) : null
            let timeStr = t('notifications.time_recently', 'Gần đây')
            if (createdAt && !isNaN(createdAt.getTime())) {
              const diffMs = Date.now() - createdAt.getTime()
              const diffMins = Math.floor(diffMs / 60000)
              const diffHours = Math.floor(diffMins / 60)
              const diffDays = Math.floor(diffHours / 24)
              if (diffMins < 5) timeStr = t('notifications.time_just_now', 'Vừa xong')
              else if (diffMins < 60) timeStr = t('notifications.time_minutes_ago', '{{minutes}} phút trước').replace('{{minutes}}', String(diffMins))
              else if (diffHours < 24) timeStr = t('notifications.time_hours_ago', '{{hours}} giờ trước').replace('{{hours}}', String(diffHours))
              else timeStr = t('notifications.time_days_ago', '{{days}} ngày trước').replace('{{days}}', String(diffDays))
            }

            return {
              id: n.id,
              title: n.title,
              content: n.message || n.content,
              time: timeStr,
              read: isRead,
              type: n.type,
              referenceId: n.referenceId,
              referenceType: n.referenceType,
              subjectCode: n.subjectCode,
              link: resolveTarget(n),
              actionText: t('admin.notifications.action_detail', 'Xem chi tiết'),
            }
          })

          setNotifications(apiMapped)
        }
      })
      .catch((err) => {
        console.error('Failed to load notifications from API:', err)
      })
      .finally(() => setLoading(false))
  }, [resolveTarget, t])

  React.useEffect(() => {
    loadNotifications()
    const unsub = subscribeNotificationEvents(() => loadNotifications())
    return unsub
  }, [loadNotifications])

  const handleItemClick = (item: any) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true, isRead: true } : n))
    )

    if (!item.read && item.id && !item.id.startsWith('admin_notif_')) {
      notificationsApi.markNotificationAsRead(item.id).catch(() => {}).finally(() => refreshBadge())
      emitNotificationEvent()
    }

    const targetUrl = resolveTarget(item)
    router.push(targetUrl)
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })))
    clearNew()
    emitNotificationEvent()
    notificationsApi.markAllNotificationsAsRead().catch(() => {}).finally(() => refreshBadge())
  }

  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(t('notifications.confirm_delete_one', 'Bạn có chắc muốn xóa thông báo này?'))) return
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      if (id && !id.startsWith('admin_notif_')) {
        await notificationsApi.deleteNotification(id)
      }
      emitNotificationEvent()
      refreshBadge()
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(t('notifications.confirm_delete_all', 'Bạn có chắc muốn xóa tất cả thông báo?'))) return
    setNotifications([])
    try {
      await notificationsApi.deleteAllNotifications()
      emitNotificationEvent()
      refreshBadge()
    } catch (err) {
      console.error('Failed to delete all notifications:', err)
    }
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastData.title.trim() || !broadcastData.message.trim()) return
    setBroadcasting(true)
    try {
      await notificationsApi.broadcastNotification({
        title: broadcastData.title,
        message: broadcastData.message,
        targetRole: broadcastData.targetRole,
        type: 'SYSTEM_UPDATE'
      })
      setBroadcastModal(false)
      setBroadcastData({ title: '', message: '', targetRole: 'ALL' })
      alert(t('admin.notifications.broadcast_success', 'Gửi thông báo thành công!'))
      loadNotifications()
    } catch (err: any) {
      alert(err?.message || t('admin.notifications.broadcast_error', 'Không thể gửi thông báo.'))
    } finally {
      setBroadcasting(false)
    }
  }

  const visibleNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const renderIcon = (type: string, title: string) => {
    const t = String(type || '').toUpperCase()
    const text = String(title || '').toLowerCase()

    if (t === 'SYSTEM_UPDATE' || text.includes('cập nhật')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5" />
        </div>
      )
    }

    if (t === 'SYSTEM_ALERT' || text.includes('cảnh báo')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
      )
    }

    if (t === 'USER_REGISTER' || text.includes('người dùng') || text.includes('giảng viên')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
      )
    }

    return (
      <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
        <Shield className="w-5 h-5" />
      </div>
    )
  }

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.notifications.header_title', 'Thông báo quản trị')}
      headerSubtitle={t('admin.notifications.header_subtitle', 'Nhật ký hệ thống, cảnh báo hiệu suất và người dùng mới')}
    >
      <div className="space-y-5 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <span>{t('notifications.inbox', 'Hộp thông báo')}</span>
              <span className="text-sm font-semibold text-slate-400 font-mono">
                ({visibleNotifications.length})
              </span>
            </h2>

            {unreadCount > 0 && (
              <Badge variant="orange" className="text-xs">
                {unreadCount} {t('notifications.unread_count', 'chưa đọc')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('notifications.filter_all', 'Tất cả')}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filter === 'unread'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('notifications.filter_unread', 'Chưa đọc')} {unreadCount > 0 ? `(${unreadCount})` : ''}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white gap-1.5"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline">{t('notifications.mark_all_read', 'Đã đọc tất cả')}</span>
                </Button>
              )}

              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteAll}
                  className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Xóa tất cả</span>
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => setBroadcastModal(true)}
                className="text-xs gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{t('admin.notifications.broadcast_btn', 'Gửi Broadcast')}</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {visibleNotifications.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 border-dashed">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {t('notifications.empty_title', 'Không có thông báo nào!')}
              </p>
            </Card>
          ) : (
            visibleNotifications.map((n) => (
              <Card
                key={n.id}
                onClick={() => handleItemClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleItemClick(n)
                  }
                }}
                className={`p-4 md:p-5 transition-all cursor-pointer group hover:border-orange-500/70 hover:shadow-md relative overflow-hidden ${
                  n.read
                    ? 'bg-white dark:bg-slate-900/50 hover:bg-slate-50/80 dark:hover:bg-slate-900/80'
                    : 'bg-orange-50/40 dark:bg-slate-900/90 border-l-4 border-l-orange-500 hover:bg-orange-50/70 dark:hover:bg-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {renderIcon(n.type, n.title)}

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                          {n.title}
                        </h3>
                        {!n.read && (
                          <Badge variant="orange" className="text-[10px] px-1.5 py-0.2">
                            {t('notifications.badge_new', 'Mới')}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {n.content}
                      </p>

                      <div className="pt-1.5 flex items-center gap-3 text-xs text-orange-600 dark:text-orange-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span className="flex items-center gap-1">
                          {n.actionText || t('notifications.click_to_view', 'Nhấn để xem chi tiết nội dung')}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      {n.time}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOne(n.id, e)}
                      title="Xóa thông báo này"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Broadcast Modal */}
      <Modal
        isOpen={broadcastModal}
        onClose={() => setBroadcastModal(false)}
        title={t('admin.notifications.broadcast_modal_title', 'Gửi thông báo toàn hệ thống')}
        description={t('admin.notifications.broadcast_modal_desc', 'Thông báo sẽ được gửi trực tiếp đến tất cả người dùng hoặc nhóm vai trò được chọn.')}
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('admin.notifications.broadcast_title_label', 'Tiêu đề thông báo')}
            </label>
            <Input
              type="text"
              placeholder={t('admin.notifications.broadcast_title_placeholder', 'VD: Hệ thống bảo trì...')}
              value={broadcastData.title}
              onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('admin.notifications.broadcast_message_label', 'Nội dung thông báo')}
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 min-h-[100px] resize-y"
              placeholder={t('admin.notifications.broadcast_message_placeholder', 'Nhập nội dung chi tiết...')}
              value={broadcastData.message}
              onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t('admin.notifications.broadcast_target_label', 'Đối tượng nhận')}
            </label>
            <select
              value={broadcastData.targetRole}
              onChange={(e) => setBroadcastData({ ...broadcastData, targetRole: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">{t('admin.notifications.target_all', 'Tất cả người dùng (ALL)')}</option>
              <option value="STUDENT">{t('admin.notifications.target_student', 'Chỉ Sinh viên (STUDENT)')}</option>
              <option value="LECTURER">{t('admin.notifications.target_lecturer', 'Chỉ Giảng viên (LECTURER)')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setBroadcastModal(false)}>
              {t('ui.cancel', 'Hủy')}
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={broadcasting} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              {t('admin.notifications.broadcast_submit', 'Gửi ngay')}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
