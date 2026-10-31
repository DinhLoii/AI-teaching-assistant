'use client'

import { emitAnalyticsEvent } from '@/lib/events/analytics'
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useAuth } from './auth-provider'
import { NotificationSocket, type ConnectionStatus, type NotificationPayload } from '@/lib/websocket/notification-socket'
import { NotificationFeed, type NotificationItem } from '@/lib/notifications/feed'
import { subscribeNotificationEvents, emitNotificationEvent } from '@/lib/events/notifications'
import { clearClientApiCache } from '@/lib/api/client'
import { assignmentNoticeVersion, emitAssignmentsChanged } from '@/lib/events/assignments'

export interface NotificationContextValue {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  working: boolean
  error: string
  hasMore: boolean
  hasNew: boolean
  latestNotification: NotificationPayload | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  clockOffset: number
  refresh: () => void
  loadMore: () => void
  clearNew: () => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  deleteAllNotifications: () => Promise<void>
}
const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, token, isAuthenticated, loading: authLoading } = useAuth()
  const owner = isAuthenticated ? user?.id : undefined
  const feed = useMemo(() => new NotificationFeed(), [owner])
  const snapshot = useSyncExternalStore(feed.subscribe, feed.getSnapshot, feed.getSnapshot)
  const assignmentNotices = useRef<{ owner?: string; versions: Set<string> }>({ versions: new Set() })
  useEffect(() => {
    if (assignmentNotices.current.owner !== owner) assignmentNotices.current = { owner, versions: new Set() }
    const versions = new Set(snapshot.items.map(assignmentNoticeVersion).filter((version): version is string => version !== null))
    const changed = [...versions].some(version => !assignmentNotices.current.versions.has(version))
    assignmentNotices.current.versions = versions
    // Works for live events and the polling fallback after a missed connection.
    if (owner && changed) emitAssignmentsChanged()
  }, [owner, snapshot.items])
  const [connection, setConnection] = useState<{ owner?: string; status: ConnectionStatus; offset: number }>({ status: 'disconnected', offset: 0 })
  const [latest, setLatest] = useState<{ owner?: string; item: NotificationPayload | null; hasNew: boolean }>({ item: null, hasNew: false })
  useEffect(() => {
    if (!owner || !token || authLoading) return
    feed.start()
    const socket = new NotificationSocket()
    let active = true
    let connectedOnce = false
    let highlight: ReturnType<typeof setTimeout>
    socket.onStatusChange = status => { if (active) setConnection(prev => ({ owner, status, offset: prev.owner === owner ? prev.offset : 0 })) }
    socket.onServerTime = time => {
      const server = Date.parse(time)
      if (active && Number.isFinite(server)) setConnection(prev => ({ ...prev, owner, offset: server - Date.now() }))
    }
    socket.onEvent = event => {
      if (!active) return
      if (event.type === 'HEARTBEAT') return
      if (event.type === 'ANALYTICS_INVALIDATED') { emitAnalyticsEvent(); return }
      if (event.type === 'CONNECTED') {
        // Initial pages already load their data. Only reconnects need to repair
        // assignment changes missed while the notification stream was offline.
        if (connectedOnce) { emitAnalyticsEvent(); emitAssignmentsChanged() }
        connectedOnce = true
      }
      clearClientApiCache('/notifications')
      const existed = feed.getSnapshot().items.some(n => n.id === event.payload?.id)
      feed.receive(event)
      if (['NOTIFICATION', 'NEW_NOTIFICATION'].includes(event.type) && event.payload?.id && (!existed || event.payload.updated) && !event.payload.isRead && !['REMINDER', 'DEADLINE_WARNING'].includes(String(event.payload.type || event.payload.notificationType).toUpperCase())) {
        setLatest({ owner, item: event.payload, hasNew: true })
        clearTimeout(highlight)
        highlight = setTimeout(() => setLatest(prev => ({ ...prev, hasNew: false })), 5000)
      }
    }
    socket.connect(token)
    const unsubscribe = subscribeNotificationEvents(() => { void feed.refresh() })
    const online = () => { socket.connect(token); void feed.refresh() }
    window.addEventListener('online', online)
    // Repair missed events after outages and provide a fallback if a proxy blocks streaming.
    let tick = 0
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && (!socket.isConnected() || ++tick % 4 === 0)) void feed.refresh()
    }, 15_000)
    return () => { active = false; socket.disconnect(); feed.stop(); clearTimeout(highlight); clearInterval(poll); unsubscribe(); window.removeEventListener('online', online) }
  }, [owner, token, authLoading, feed])

  const act = async (operation: 'read' | 'readAll' | 'delete' | 'deleteAll', id?: string) => {
    try { await feed.mutate(operation, id) }
    finally { emitNotificationEvent() }
  }
  const value: NotificationContextValue = {
    ...snapshot, notifications: owner ? snapshot.items : [], unreadCount: owner ? snapshot.unreadCount : 0,
    hasNew: latest.owner === owner && latest.hasNew, latestNotification: latest.owner === owner ? latest.item : null,
    isConnected: connection.owner === owner && connection.status === 'connected', connectionStatus: connection.owner === owner ? connection.status : 'disconnected',
    clockOffset: connection.owner === owner ? connection.offset : 0,
    refresh: () => { feed.clearError(); void feed.refresh() }, loadMore: () => { void feed.loadMore() },
    clearNew: () => setLatest(prev => ({ ...prev, hasNew: false })),
    markAsRead: id => act('read', id), markAllAsRead: () => act('readAll'),
    deleteNotification: id => act('delete', id), deleteAllNotifications: () => act('deleteAll'),
  }
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
