'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/providers/notification-provider'
import { useLanguage } from '@/providers/language-provider'
import { notificationTarget, notificationTime } from '@/lib/notifications/presentation'
import type { NotificationItem } from '@/lib/notifications/feed'

export function useNotificationInbox(role: 'student' | 'lecturer' | 'admin') {
  const router = useRouter()
  const feed = useNotifications()
  const { language, t } = useLanguage()
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const [now, setNow] = React.useState(Date.now)
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const notifications = feed.notifications.map(n => ({
    ...n, content: n.message, time: notificationTime(n.createdAt, now + feed.clockOffset, language),
    absoluteTime: n.createdAt ? new Date(n.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '',
    actionText: n.type.toUpperCase() === 'GRADE_PUBLISHED'
      ? t('student.notifications.action_grade', 'Xem điểm & Báo cáo') : t('notifications.click_to_view', 'Xem chi tiết'),
  }))
  const resolveTarget = (item: Partial<NotificationItem>) => notificationTarget(item, role)
  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) void feed.markAsRead(item.id).catch(() => {})
    feed.clearNew()
    router.push(resolveTarget(item))
  }
  const handleMarkAllAsRead = () => { feed.clearNew(); void feed.markAllAsRead().catch(() => {}) }
  const handleDeleteOne = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (confirm(t('notifications.confirm_delete_one', 'Bạn có chắc muốn xóa thông báo này?'))) void feed.deleteNotification(id).catch(() => {})
  }
  const handleDeleteAll = () => {
    if (confirm(t('notifications.confirm_delete_all', 'Bạn có chắc muốn xóa tất cả thông báo?'))) void feed.deleteAllNotifications().catch(() => {})
  }
  return { ...feed, notifications, filter, setFilter, resolveTarget, handleItemClick, handleMarkAllAsRead, handleDeleteOne, handleDeleteAll,
    loadNotifications: feed.refresh, visibleNotifications: notifications.filter(n => filter !== 'unread' || !n.isRead) }
}
