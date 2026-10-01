'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV } from '@/config/navigation'
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
  Sparkles,
  Award,
  FileCode,
  GraduationCap,
  CheckCheck,
  RotateCcw,
  BookOpen,
  Trash2,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'


export default function StudentNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all')
  const [loading, setLoading] = React.useState(false)
  const { refresh: refreshBadge, clearNew } = useNotifications()
  const { t } = useLanguage()

  // Resolve target route based on notification metadata
  const resolveTarget = React.useCallback((item: any): string => {
    if (item.link) return item.link

    const refId = item.referenceId || item.refId
    const refType = String(item.referenceType || item.refType || '').toUpperCase()
    const type = String(item.type || '').toUpperCase()
    const title = String(item.title || '')
    const content = String(item.content || item.message || '')

    // 1. Grade published / result
    if (
      refType === 'SUBMISSION' ||
      type === 'GRADE_PUBLISHED' ||
      title.toLowerCase().includes('công bố') ||
      title.toLowerCase().includes('đã có điểm')
    ) {
      if (refType === 'SUBMISSION' && refId) {
        return `/student/grading/result/${refId}`
      }
      if (refId) {
        return `/student/assignments/${refId}`
      }
      if (title.includes('PRJ301') || content.includes('PRJ301') || title.includes('Assignment 1')) {
        return '/student/assignments/d603bb1e-918e-4b63-9451-f572d9127c1a'
      }
      if (title.includes('Full-Stack') || content.includes('CSD201')) {
        return '/student/assignments/29aa1e99-a4ba-4837-94a2-40a88d73ab85'
      }
      return '/student/assignments/d603bb1e-918e-4b63-9451-f572d9127c1a'
    }

    // 2. Assignment / Deadline reminder
    if (
      refType === 'EXAM' ||
      refType === 'ASSIGNMENT' ||
      type === 'ASSIGNMENT' ||
      title.toLowerCase().includes('bài tập mới') ||
      title.toLowerCase().includes('hạn nộp') ||
      title.toLowerCase().includes('workshop 1')
    ) {
      if (refId) return `/student/assignments/${refId}`
      if (title.includes('PRJ301') || content.includes('PRJ301')) {
        return '/student/assignments/d603bb1e-918e-4b63-9451-f572d9127c1a'
      }
      return '/student/assignments/29aa1e99-a4ba-4837-94a2-40a88d73ab85'
    }

    // 3. Class announcement / Semester
    if (
      refType === 'CLASS' ||
      type === 'CLASS_ANNOUNCEMENT' ||
      title.toLowerCase().includes('lớp') ||
      title.toLowerCase().includes('học kỳ') ||
      title.toLowerCase().includes('spring 2026')
    ) {
      if (refId) return `/student/classes/${refId}`
      return '/student/classes'
    }

    // 4. Course / Subject
    if (item.subjectCode) {
      return `/student/courses/${item.subjectCode}`
    }

    return '/student'
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
              actionText:
                String(n.type).toUpperCase() === 'GRADE_PUBLISHED'
                  ? t('student.notifications.action_grade', 'Xem điểm & Báo cáo')
                  : String(n.type).toUpperCase() === 'ASSIGNMENT'
                  ? t('student.notifications.action_assignment', 'Nộp bài ngay')
                  : t('student.notifications.action_detail', 'Xem chi tiết'),
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

  // Handle clicking on a notification item: mark as read and jump to target content
  const handleItemClick = (item: any) => {
    // 1. Mark as read in local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true, isRead: true } : n))
    )

    // 2. Call backend mark read if real ID
    if (!item.read && item.id && !item.id.startsWith('notif_default_')) {
      notificationsApi.markNotificationAsRead(item.id).catch(() => {}).finally(() => refreshBadge())
      emitNotificationEvent()   // sync other tabs & Navbar
    }

    // 3. Navigate directly to target content
    const targetUrl = resolveTarget(item)
    router.push(targetUrl)
  }

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })))
    clearNew()
    emitNotificationEvent()   // sync other tabs & Navbar badge immediately
    notificationsApi.markAllNotificationsAsRead().catch(() => {}).finally(() => refreshBadge())
  }

  // Delete single notification
  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(t('notifications.confirm_delete_one', 'Bạn có chắc muốn xóa thông báo này?'))) return
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      if (id && !id.startsWith('notif_default_')) {
        await notificationsApi.deleteNotification(id)
      }
      emitNotificationEvent()
      refreshBadge()
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  // Delete all notifications
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

  // Filter items
  const visibleNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  // Choose icon based on notification type
  const renderIcon = (type: string, title: string) => {
    const t = String(type || '').toUpperCase()
    const text = String(title || '').toLowerCase()

    if (t === 'GRADE_PUBLISHED' || text.includes('công bố') || text.includes('đã có điểm')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5" />
        </div>
      )
    }

    if (t === 'ASSIGNMENT' || t === 'ASSIGNMENT_REMINDER' || text.includes('hạn nộp') || text.includes('bài tập')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
          <FileCode className="w-5 h-5" />
        </div>
      )
    }

    if (t === 'RESUBMISSION' || text.includes('nộp lại')) {
      return (
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <RotateCcw className="w-5 h-5" />
        </div>
      )
    }

    return (
      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
        <GraduationCap className="w-5 h-5" />
      </div>
    )
  }

  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      title="AITA Student"
      roleLabel={t('profile.role_student', 'Sinh viên')}
      requiredRole="student"
      headerTitle={t('student.notifications.header_title', 'Thông báo')}
      headerSubtitle={t('student.notifications.header_subtitle', 'Cập nhật mới nhất về điểm số, bài tập và hoạt động lớp học')}
    >
      <div className="space-y-5 max-w-4xl">
        {/* Header Bar */}
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
            {/* Filter buttons */}
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
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {visibleNotifications.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 border-dashed">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {t('notifications.empty_title', 'Không có thông báo nào!')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {filter === 'unread'
                  ? t('notifications.empty_unread_desc', 'Bạn đã đọc tất cả thông báo.')
                  : t('notifications.empty_all_desc', 'Hộp thư thông báo của bạn hiện đang trống.')}
              </p>
            </Card>
          ) : (
            visibleNotifications.map((n) => {
              const targetUrl = resolveTarget(n)
              return (
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
                          {n.subjectCode && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {n.subjectCode}
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
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
