import { notificationsApi } from '../api/modules/notifications'

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  createdAt: string | null
  isRead: boolean
  read: boolean
  referenceId?: string | null
  referenceType?: string | null
  subjectCode?: string | null
  [key: string]: unknown
}

export function normalizeNotification(raw: any): NotificationItem {
  const parsed = [raw.createdAt, raw.CreatedAt].filter(value => value !== null && value !== undefined && value !== '')
    .map(value => new Date(value)).find(date => Number.isFinite(date.getTime()))
  const read = raw.isRead ?? raw.read ?? false
  return {
    ...raw, id: String(raw.id ?? raw.Id ?? ''), title: raw.title ?? raw.Title ?? '',
    message: raw.message ?? raw.content ?? raw.Message ?? '',
    type: raw.type ?? raw.notificationType ?? raw.Type ?? 'SYSTEM',
    referenceId: raw.referenceId ?? raw.ReferenceId ?? null,
    referenceType: raw.referenceType ?? raw.ReferenceType ?? null,
    createdAt: parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null,
    read: !!read, isRead: !!read,
  }
}

const sorted = (items: NotificationItem[]) => [...new Map(items.filter(n => n.id).map(n => [n.id, n])).values()]
  .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0) || b.id.localeCompare(a.id))

export class NotificationFeed {
  private listeners = new Set<() => void>()
  private epoch = 0
  private active = true
  private flight: Promise<void> | null = null
  private refreshAgain = false
  private pages = 1
  private queue: Promise<unknown> = Promise.resolve()
  private snapshot = { items: [] as NotificationItem[], unreadCount: 0, loading: true, working: false, error: '', hasMore: false }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.snapshot
  private update(patch: Partial<typeof this.snapshot>) {
    if (!this.active) return
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach(listener => listener())
  }
  start() { this.active = true; void this.refresh() }
  stop() { this.active = false; this.epoch++ }

  refresh = (): Promise<void> => {
    if (!this.active) return Promise.resolve()
    if (this.snapshot.working) { this.refreshAgain = true; return Promise.resolve() }
    if (this.flight) { this.refreshAgain = true; return this.flight }
    const epoch = this.epoch
    const flight = (async () => {
      try {
        const [batches, { count }] = await Promise.all([
          Promise.all(Array.from({ length: this.pages }, (_, index) => notificationsApi.getMyNotifications({ page: index + 1, limit: 50 }))), notificationsApi.getUnreadCount(),
        ])
        const rows = batches.flat()
        if (epoch !== this.epoch) { this.refreshAgain = true; return }
        const knownDates = new Map(this.snapshot.items.map(item => [item.id, item.createdAt]))
        const items = rows.map(normalizeNotification).map(item => ({ ...item, createdAt: item.createdAt || knownDates.get(item.id) || null }))
        this.update({ items: sorted(items), unreadCount: count, hasMore: batches[batches.length - 1]?.length === 50, error: this.snapshot.error.startsWith('Thao tác') ? this.snapshot.error : '' })
      } catch {
        this.update({ error: 'Không thể đồng bộ thông báo. Dữ liệu hiện có được giữ lại; vui lòng thử lại.' })
      } finally { this.update({ loading: false }) }
    })().finally(() => {
      if (this.flight === flight) this.flight = null
      if (this.refreshAgain && this.active) { this.refreshAgain = false; void this.refresh() }
    })
    this.flight = flight
    return flight
  }
  loadMore = () => {
    if (this.snapshot.loading || this.snapshot.working) return Promise.resolve()
    this.pages++
    this.epoch++
    this.update({ loading: true })
    return this.refresh()
  }
  clearError = () => this.update({ error: '' })

  receive = (event: { type: string; payload?: any }) => {
    const p = event.payload || {}
    const type = event.type.toUpperCase()
    if (type === 'CONNECTED') { if (!this.flight) void this.refresh(); return }
    this.epoch++
    if (type === 'NOTIFICATION' || type === 'NEW_NOTIFICATION') {
      const item = normalizeNotification(p)
      if (item.id && !['REMINDER', 'DEADLINE_WARNING'].includes(item.type.toUpperCase())) {
        const previous = this.snapshot.items.find(n => n.id === item.id)
        if (!item.createdAt && previous) item.createdAt = previous.createdAt
        if (!previous || p.updated) {
          const increment = (!item.isRead ? 1 : 0) - (previous && !previous.isRead ? 1 : 0)
          this.update({ items: sorted([item, ...this.snapshot.items.filter(n => n.id !== item.id)]), unreadCount: Math.max(0, this.snapshot.unreadCount + increment) })
        }
      }
    } else if (type === 'NOTIFICATION_READ') {
      const unread = this.snapshot.items.some(n => n.id === p.notificationId && !n.isRead)
      this.update({ items: this.snapshot.items.map(n => n.id === p.notificationId ? { ...n, read: true, isRead: true } : n), unreadCount: Math.max(0, this.snapshot.unreadCount - (unread ? 1 : 0)) })
    } else if (type === 'ALL_READ') {
      this.update({ items: this.snapshot.items.map(n => ({ ...n, read: true, isRead: true })), unreadCount: 0 })
    } else if (type === 'NOTIFICATION_DELETED') {
      const unread = this.snapshot.items.some(n => n.id === p.notificationId && !n.isRead)
      this.update({ items: this.snapshot.items.filter(n => n.id !== p.notificationId), unreadCount: Math.max(0, this.snapshot.unreadCount - (unread ? 1 : 0)) })
    } else if (type === 'ALL_DELETED') {
      this.update({ items: [], unreadCount: 0 })
    }
    if (Number.isInteger(p.unreadCount) && p.unreadCount >= 0) this.update({ unreadCount: p.unreadCount })
    void this.refresh()
  }

  mutate = (operation: 'read' | 'readAll' | 'delete' | 'deleteAll', id?: string): Promise<void> => {
    const work = this.queue.then(async () => {
      if (!this.active) return
      const before = this.snapshot.items
      const affected = before.filter(n => !id || n.id === id)
      if (operation === 'read' && affected[0]?.isRead) return
      this.epoch++
      const deleting = operation === 'delete' || operation === 'deleteAll'
      const changedUnread = affected.filter(n => !n.isRead).length
      const countDelta = !id ? this.snapshot.unreadCount : changedUnread
      this.update({ working: true, error: '', items: deleting ? before.filter(n => id && n.id !== id) : before.map(n => !id || n.id === id ? { ...n, isRead: true, read: true } : n),
        unreadCount: !id ? 0 : Math.max(0, this.snapshot.unreadCount - changedUnread) })
      try {
        if (operation === 'read') await notificationsApi.markNotificationAsRead(id!)
        if (operation === 'readAll') await notificationsApi.markAllNotificationsAsRead()
        if (operation === 'delete') await notificationsApi.deleteNotification(id!)
        if (operation === 'deleteAll') await notificationsApi.deleteAllNotifications()
      } catch (error) {
        // Restore only the affected records, preserving messages received during the write.
        this.update({ items: sorted([...this.snapshot.items.filter(n => !affected.some(a => a.id === n.id)), ...affected]),
          unreadCount: this.snapshot.unreadCount + countDelta,
          error: 'Thao tác chưa được xác nhận. Vui lòng thử lại.' })
        throw error
      } finally {
        this.epoch++
        this.update({ working: false })
        void this.refresh()
      }
    })
    this.queue = work.catch(() => {})
    return work
  }
}
