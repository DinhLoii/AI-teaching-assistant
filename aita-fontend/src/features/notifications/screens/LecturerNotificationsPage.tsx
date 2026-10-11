'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { notificationsApi } from '@/lib/api/modules/notifications'
import { useNotifications } from '@/providers/notification-provider'
import { emitNotificationEvent, subscribeNotificationEvents } from '@/lib/events/notifications'
import {
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck,
  Users,
  GraduationCap,
  RotateCcw,
  Sparkles,
  CheckCheck,
  Trash2,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'


export default function LecturerNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const [loading, setLoading] = React.useState(false)
  const { refresh: refreshBadge, clearNew } = useNotifications()
  const { t } = useLanguage()

  const resolveTarget = React.useCallback((item: any): string => {
    if (item.link) return item.link

    const refId = item.referenceId || item.refId
    const refType = String(item.referenceType || item.refType || '').toUpperCase()
    const type = String(item.type || '').toUpperCase()
    const title = String(item.title || '')
    const content = String(item.content || item.message || '')

    // 1. Assignment submission / grading
    if (
      refType === 'EXAM' ||
      refType === 'ASSIGNMENT' ||
      type === 'NEW_SUBMISSION' ||
      type === 'GRADING_COMPLETE' ||
      title.toLowerCase().includes('nộp bài') ||
      title.toLowerCase().includes('chấm bài')
    ) {
      if (refId) return `/lecturer/assignments/${refId}/submissions`
      if (title.includes('PRJ301') || content.includes('PRJ301')) {
        return '/lecturer/assignments/d603bb1e-918e-4b63-9451-f572d9127c1a/submissions'
      }
      return '/lecturer/grading/assignments'
    }

    // 2. Class / Teaching assignment
    if (
      refType === 'CLASS' ||
      type === 'TEACHING_ASSIGNMENT' ||
      title.toLowerCase().includes('lớp') ||
      title.toLowerCase().includes('phân công')
    ) {
      if (refId) return `/lecturer/classes/${refId}`
      return '/lecturer/classes'
    }

    return '/lecturer'
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
              actionText: t('lecturer.notifications.action_detail', 'Xem chi tiết'),
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

    if (!item.read && item.id && !item.id.startsWith('lecturer_notif_')) {
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
      if (id && !id.startsWith('lecturer_notif_')) {
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

  const visibleNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const renderIcon = (type: string, title: string) => {
    const t = String(type || '').toUpperCase()
    const text = String(title || '').toLowerCase()

    if (t === 'GRADING_COMPLETE' || text.includes('hoàn tất') || text.includes('chấm bài')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <FileCheck className="w-5 h-5" />
        </div>
      )
    }

    if (t === 'NEW_SUBMISSION' || text.includes('nộp bài')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
      )
    }

    return (
      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
        <Users className="w-5 h-5" />
      </div>
    )
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.notifications.header_title', 'Thông báo giảng viên')}
      headerSubtitle={t('lecturer.notifications.header_subtitle', 'Nhật ký nộp bài của sinh viên và tiến độ hàng đợi chấm điểm')}
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
            <div className="inline-flex p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                {t('notifications.filter_all', 'Tất cả')}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === 'unread'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
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
                className={`p-4 md:p-5 transition-all cursor-pointer group rounded-2xl relative overflow-hidden ${
                  n.read
                    ? 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-200 hover:shadow-xs'
                    : 'bg-gradient-to-br from-orange-50/70 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-200/90 dark:border-orange-900/40 border-l-4 border-l-orange-500 hover:border-orange-300 hover:shadow-md'
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
    </DashboardLayout>
  )
}
