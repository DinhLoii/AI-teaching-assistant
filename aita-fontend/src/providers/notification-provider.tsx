'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { notificationsApi } from '@/lib/api/modules/notifications'
import { subscribeNotificationEvents, emitNotificationEvent } from '@/lib/events/notifications'
import { useAuth } from '@/providers/auth-provider'
import { NotificationSocket, type NotificationPayload, type ConnectionStatus } from '@/lib/websocket/notification-socket'

export interface NotificationContextValue {
  unreadCount: number
  hasNew: boolean
  latestNotification: NotificationPayload | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  refresh: () => void
  clearNew: () => void
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  hasNew: false,
  latestNotification: null,
  isConnected: false,
  connectionStatus: 'disconnected',
  refresh: () => {},
  clearNew: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading, token } = useAuth()
  const userId = user?.id

  const [state, setState] = useState<{
    owner: string
    count: number
    hasNew: boolean
    latestNotification: NotificationPayload | null
    connectionStatus: ConnectionStatus
  }>({
    owner: '',
    count: 0,
    hasNew: false,
    latestNotification: null,
    connectionStatus: 'disconnected',
  })

  const socketRef = useRef<NotificationSocket | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearNew = useCallback(() => {
    setState((prev) => ({ ...prev, hasNew: false }))
  }, [])

  // Sync REST unread count as initial baseline or fallback
  const fetchCountRest = useCallback(async () => {
    if (!userId || !isAuthenticated) return
    try {
      const { count } = await notificationsApi.getUnreadCount()
      setState((prev) => {
        const hasNew = prev.count > 0 && count > prev.count
        return {
          ...prev,
          owner: userId,
          count,
          hasNew: hasNew || prev.hasNew,
        }
      })
    } catch {
      // Retain last known state
    }
  }, [userId, isAuthenticated])

  // Mark single as read: via WebSocket first, fallback to REST
  const markAsRead = useCallback(
    async (notificationId: string) => {
      const socket = socketRef.current
      const sentViaWs = socket?.markAsRead(notificationId)

      // Optimistic update
      setState((prev) => ({
        ...prev,
        count: Math.max(0, prev.count - 1),
      }))

      if (!sentViaWs) {
        try {
          await notificationsApi.markNotificationAsRead(notificationId)
        } catch {}
      }

      emitNotificationEvent()
    },
    []
  )

  // Mark all as read: via WebSocket first, fallback to REST
  const markAllAsRead = useCallback(async () => {
    const socket = socketRef.current
    const sentViaWs = socket?.markAllAsRead()

    // Optimistic update
    setState((prev) => ({
      ...prev,
      count: 0,
      hasNew: false,
    }))

    if (!sentViaWs) {
      try {
        await notificationsApi.markAllNotificationsAsRead()
      } catch {}
    }

    emitNotificationEvent()
  }, [])

  useEffect(() => {
    if (!userId || loading || !isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    let active = true

    // Initialize WebSocket client
    const socket = new NotificationSocket()
    socketRef.current = socket

    socket.onStatusChange = (status) => {
      if (!active) return
      setState((prev) => ({ ...prev, connectionStatus: status }))
    }

    socket.onUnreadCount = (count) => {
      if (!active) return
      setState((prev) => ({
        ...prev,
        owner: userId,
        count,
      }))
    }

    socket.onNotification = (notification) => {
      if (!active) return

      setState((prev) => {
        const newCount = typeof notification.unreadCount === 'number' ? notification.unreadCount : prev.count + 1
        return {
          ...prev,
          owner: userId,
          count: newCount,
          hasNew: true,
          latestNotification: notification,
        }
      })

      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(clearNew, 5000)

      // Notify tabs and page listeners
      emitNotificationEvent()
    }

    socket.onNotificationRead = ({ unreadCount }) => {
      if (!active) return
      setState((prev) => ({
        ...prev,
        owner: userId,
        count: unreadCount,
      }))
      emitNotificationEvent()
    }

    socket.onAllRead = () => {
      if (!active) return
      setState((prev) => ({
        ...prev,
        owner: userId,
        count: 0,
        hasNew: false,
      }))
      emitNotificationEvent()
    }

    // Connect WebSocket
    socket.connect(token)

    // Initial count fetch via REST
    void fetchCountRest()

    // Listen to local tab broadcast events
    const unsubscribe = subscribeNotificationEvents(() => {
      void fetchCountRest()
    })

    // Background safety interval (60s)
    const interval = setInterval(() => {
      if (socket.isConnected()) {
        socket.requestUnreadCount()
      } else {
        void fetchCountRest()
      }
    }, 60_000)

    return () => {
      active = false
      socket.disconnect()
      socketRef.current = null
      unsubscribe()
      clearInterval(interval)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [userId, token, loading, isAuthenticated, clearNew, fetchCountRest])

  const ownsState = isAuthenticated && state.owner === userId

  const contextValue: NotificationContextValue = {
    unreadCount: ownsState ? state.count : 0,
    hasNew: ownsState && state.hasNew,
    latestNotification: ownsState ? state.latestNotification : null,
    isConnected: state.connectionStatus === 'connected',
    connectionStatus: state.connectionStatus,
    refresh: emitNotificationEvent,
    clearNew,
    markAsRead,
    markAllAsRead,
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
