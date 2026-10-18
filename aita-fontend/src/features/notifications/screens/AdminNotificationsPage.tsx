'use client'

import * as React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { notificationsApi } from '@/lib/api/modules/notifications'
import { useNotificationInbox } from '../hooks/useNotificationInbox'
import { NotificationSyncStatus } from '../components/NotificationSyncStatus'
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
  const { t } = useLanguage()
  const { notifications, filter, setFilter, loading, working, error, hasMore, loadMore, loadNotifications,
    unreadCount, visibleNotifications, resolveTarget, handleItemClick, handleMarkAllAsRead, handleDeleteOne, handleDeleteAll } = useNotificationInbox('admin')
  const [broadcastModal, setBroadcastModal] = React.useState(false)
  const [broadcasting, setBroadcasting] = React.useState(false)
  const [broadcastData, setBroadcastData] = React.useState({ title: '', message: '', targetRole: 'ALL' })
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

  const renderIcon = (type: string, title: string) => {
    const t = String(type || '').toUpperCase()
    const text = String(title || '').toLowerCase()

    if (t === 'SYSTEM_UPDATE' || text.includes('cập nhật')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
          <Settings className="w-5 h-5" />
        </div>
      )
    }

    if (t === 'SYSTEM_ALERT' || text.includes('cảnh báo')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
          <AlertTriangle className="w-5 h-5" />
        </div>
      )
    }

    if (t === 'USER_REGISTER' || text.includes('người dùng') || text.includes('giảng viên')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
          <Users className="w-5 h-5" />
        </div>
      )
    }

    return (
      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
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
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{t('notifications.inbox', 'Hộp thông báo')}</span>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  ({visibleNotifications.length})
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Thông báo sự kiện và cập nhật nội bộ
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100/80 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60">
                {unreadCount} {t('notifications.unread_count', 'chưa đọc')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                {t('notifications.filter_all', 'Tất cả')}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
                }`}
              >
                {t('notifications.filter_unread', 'Chưa đọc')} {unreadCount > 0 ? `(${unreadCount})` : ''}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead} disabled={working}
                  className="text-xs text-slate-700 dark:text-slate-300 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 gap-1.5 rounded-xl font-bold cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                  <span className="hidden sm:inline">{t('notifications.mark_all_read', 'Đã đọc tất cả')}</span>
                </Button>
              )}

              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteAll} disabled={working}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1.5 rounded-xl font-bold cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Xóa tất cả</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setBroadcastModal(true)}
                variant="primary"
                className="text-xs gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{t('admin.notifications.broadcast_btn', 'Gửi Broadcast')}</span>
              </Button>
            </div>
          </div>
        </div>

        <NotificationSyncStatus />
        <div className="space-y-3">
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm">{error}<Button size="sm" variant="outline" onClick={loadNotifications}>{t('ui.retry', 'Thử lại')}</Button></div>}
          {loading && notifications.length === 0 ? <p role="status" className="p-8 text-center text-slate-500">{t('notifications.loading', 'Đang tải thông báo...')}</p> : error && notifications.length === 0 ? null : visibleNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {filter === 'unread' && unreadCount > 0 ? t('notifications.more_unread', 'Còn thông báo chưa đọc; chọn Xem thêm thông báo để tải tiếp.') : t('notifications.empty_title', 'Không có thông báo nào!')}
              </p>
            </div>
          ) : (
            visibleNotifications.map((n) => (
              <div
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
                className={`p-4 md:p-5 rounded-2xl transition-all cursor-pointer group relative overflow-hidden shadow-xs ${
                  n.read
                    ? 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-orange-200 hover:shadow-xs'
                    : 'bg-gradient-to-br from-orange-50/70 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-200/90 dark:border-orange-900/40 border-l-4 border-l-orange-500 hover:border-orange-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {renderIcon(n.type, n.title)}

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                          {n.title}
                        </h3>
                        {!n.read && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-xs">
                            {t('notifications.badge_new', 'Mới')}
                          </span>
                        )}
                      </div>

                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        {n.content}
                      </p>

                      <div className="pt-1.5 flex items-center gap-3 text-xs text-orange-600 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span className="flex items-center gap-1">
                          {n.actionText || t('notifications.click_to_view', 'Nhấn để xem chi tiết nội dung')}
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full sm:w-auto flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="text-[11px] text-slate-500 font-medium">
                      <time dateTime={n.createdAt || undefined} title={n.absoluteTime} className="block text-left sm:text-right">
                          <span className="block">{n.time}</span>
                          {n.absoluteTime && <span className="block mt-0.5 text-[10px]">{n.absoluteTime}</span>}
                        </time>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOne(n.id, e)} disabled={working} onKeyDown={e => e.stopPropagation()}
                      title="Xóa thông báo này"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {hasMore && <Button variant="outline" onClick={loadMore} disabled={loading || working}>{t('notifications.load_more', 'Xem thêm thông báo')}</Button>}
      {/* Broadcast Modal */}
      <Modal
        isOpen={broadcastModal}
        onClose={() => setBroadcastModal(false)}
        title={t('admin.notifications.broadcast_modal_title', 'Gửi thông báo toàn hệ thống')}
        description={t('admin.notifications.broadcast_modal_desc', 'Thông báo sẽ được gửi trực tiếp đến tất cả người dùng hoặc nhóm vai trò được chọn.')}
      >
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {t('admin.notifications.broadcast_title_label', 'Tiêu đề thông báo')}
            </label>
            <Input
              type="text"
              placeholder={t('admin.notifications.broadcast_title_placeholder', 'VD: Hệ thống bảo trì...')}
              value={broadcastData.title}
              onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800 focus:border-orange-400 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {t('admin.notifications.broadcast_message_label', 'Nội dung thông báo')}
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-400 min-h-[100px] resize-y"
              placeholder={t('admin.notifications.broadcast_message_placeholder', 'Nhập nội dung chi tiết...')}
              value={broadcastData.message}
              onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {t('admin.notifications.broadcast_target_label', 'Đối tượng nhận')}
            </label>
            <select
              value={broadcastData.targetRole}
              onChange={(e) => setBroadcastData({ ...broadcastData, targetRole: e.target.value })}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-orange-400 font-medium"
            >
              <option value="ALL">{t('admin.notifications.target_all', 'Tất cả người dùng (ALL)')}</option>
              <option value="STUDENT">{t('admin.notifications.target_student', 'Chỉ Sinh viên (STUDENT)')}</option>
              <option value="LECTURER">{t('admin.notifications.target_lecturer', 'Chỉ Giảng viên (LECTURER)')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setBroadcastModal(false)} className="rounded-xl font-bold">
              {t('ui.cancel', 'Hủy')}
            </Button>
            <Button
              size="sm"
              type="submit"
              isLoading={broadcasting}
              variant="primary"
              className="gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {t('admin.notifications.broadcast_submit', 'Gửi ngay')}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
