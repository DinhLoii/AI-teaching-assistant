'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { notificationsApi } from '@/lib/api/modules/notifications'
import { subscribeNotificationEvents, emitNotificationEvent } from '@/lib/events/notifications'
import { BASE } from '@/lib/api/client'
import { useAuth } from '@/providers/auth-provider'

interface NotificationContextValue {
  unreadCount: number
  hasNew: boolean
  refresh: () => void
  clearNew: () => void
}
const NotificationContext = createContext<NotificationContextValue>({ unreadCount: 0, hasNew: false, refresh: () => {}, clearNew: () => {} })
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading, token } = useAuth()
  const userId = user?.id
  const [state, setState] = useState({ owner: '', count: 0, hasNew: false })
  const clearNew = useCallback(() => setState(previous => ({ ...previous, hasNew: false })), [])
  useEffect(() => {
    if (!userId || loading || !isAuthenticated || !token) return
    let active = true
    let previousCount: number | null = null
    let source: EventSource | null = null
    let retryDelay = 1000
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let highlightTimer: ReturnType<typeof setTimeout> | undefined
    let requestSequence = 0
    async function fetchCount() {
      const sequence = ++requestSequence
      try {
        const { count } = await notificationsApi.getUnreadCount()
        if (!active || sequence !== requestSequence) return
        const hasNew = previousCount !== null && count > previousCount
        previousCount = count
        setState({ owner: userId!, count, hasNew })
        if (highlightTimer) clearTimeout(highlightTimer)
        if (hasNew) highlightTimer = setTimeout(clearNew, 4000)
      } catch { /* Keep the last verified count; polling retries transient errors. */ }
    }
    function connect() {
      if (!active || typeof EventSource === 'undefined') return
      source = new EventSource(`${BASE}/notifications/stream?token=${encodeURIComponent(token!)}`)
      source.onopen = () => { retryDelay = 1000; void fetchCount() }
      source.onmessage = event => {
        try {
          if (JSON.parse(event.data).type === 'NOTIFICATION') emitNotificationEvent()
        } catch { /* Ignore malformed frames. */ }
      }
      source.onerror = () => {
        source?.close()
        if (active) retryTimer = setTimeout(() => { retryDelay = Math.min(retryDelay * 2, 16000); connect() }, retryDelay)
      }
    }
    void fetchCount()
    connect()
    const unsubscribe = subscribeNotificationEvents(() => void fetchCount())
    const interval = setInterval(() => void fetchCount(), 60000)
    return () => {
      active = false
      source?.close()
      unsubscribe()
      clearInterval(interval)
      if (retryTimer) clearTimeout(retryTimer)
      if (highlightTimer) clearTimeout(highlightTimer)
    }
  }, [userId, token, loading, isAuthenticated, clearNew])
  const ownsState = isAuthenticated && state.owner === userId
  return <NotificationContext.Provider value={{ unreadCount: ownsState ? state.count : 0, hasNew: ownsState && state.hasNew, refresh: emitNotificationEvent, clearNew }}>{children}</NotificationContext.Provider>
}
export function useNotifications() { return useContext(NotificationContext) }
