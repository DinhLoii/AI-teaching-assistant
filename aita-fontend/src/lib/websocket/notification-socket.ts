/**
 * WebSocket client for Real-Time Notification synchronization
 */

export interface NotificationPayload {
  id: string
  title: string
  message: string
  notificationType?: string
  referenceId?: string | null
  referenceType?: string | null
  createdAt?: string
  isRead?: boolean
  unreadCount?: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export class NotificationSocket {
  private ws: WebSocket | null = null
  private token: string | null = null
  private active = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private retryDelay = 1000
  private status: ConnectionStatus = 'disconnected'

  // Callbacks
  public onNotification: ((notification: NotificationPayload) => void) | null = null
  public onUnreadCount: ((count: number) => void) | null = null
  public onNotificationRead: ((data: { notificationId: string; unreadCount: number }) => void) | null = null
  public onAllRead: (() => void) | null = null
  public onStatusChange: ((status: ConnectionStatus) => void) | null = null

  constructor() {}

  public getStatus(): ConnectionStatus {
    return this.status
  }

  public isConnected(): boolean {
    return this.status === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status
      this.onStatusChange?.(status)
    }
  }

  private resolveUrl(token: string): string {
    if (typeof window === 'undefined') return ''
    const configured = process.env.NEXT_PUBLIC_WS_URL
    if (configured) {
      const sep = configured.includes('?') ? '&' : '?'
      return `${configured}${sep}token=${encodeURIComponent(token)}`
    }

    const isHttps = window.location.protocol === 'https:'
    const protocol = isHttps ? 'wss:' : 'ws:'
    const host = window.location.hostname || 'localhost'
    return `${protocol}//${host}:3001/ws/notifications?token=${encodeURIComponent(token)}`
  }

  public connect(token: string) {
    if (!token || typeof window === 'undefined') return
    this.token = token
    this.active = true
    this.cleanupSocket()
    this.initSocket()
  }

  private initSocket() {
    if (!this.active || !this.token || typeof WebSocket === 'undefined') return

    try {
      this.setStatus('connecting')
      const url = this.resolveUrl(this.token)
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.setStatus('connected')
        this.retryDelay = 1000
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch {
          // Ignore non-json frames
        }
      }

      this.ws.onerror = () => {
        // Handled in onclose
      }

      this.ws.onclose = () => {
        this.setStatus('disconnected')
        this.stopHeartbeat()
        this.scheduleReconnect()
      }
    } catch {
      this.setStatus('disconnected')
      this.scheduleReconnect()
    }
  }

  private handleMessage(data: any) {
    const type = String(data?.type || '').toUpperCase()

    switch (type) {
      case 'CONNECTED':
        if (typeof data?.payload?.unreadCount === 'number') {
          this.onUnreadCount?.(data.payload.unreadCount)
        }
        break

      case 'NEW_NOTIFICATION':
        if (data?.payload) {
          const payload = data.payload as NotificationPayload
          if (typeof payload.unreadCount === 'number') {
            this.onUnreadCount?.(payload.unreadCount)
          }
          this.onNotification?.(payload)
        }
        break

      case 'UNREAD_COUNT':
        if (typeof data?.payload?.count === 'number') {
          this.onUnreadCount?.(data.payload.count)
        }
        break

      case 'NOTIFICATION_READ':
        if (data?.payload) {
          if (typeof data.payload.unreadCount === 'number') {
            this.onUnreadCount?.(data.payload.unreadCount)
          }
          this.onNotificationRead?.(data.payload)
        }
        break

      case 'ALL_READ':
        this.onUnreadCount?.(0)
        this.onAllRead?.()
        break

      case 'PONG':
        // Heartbeat acknowledged
        break

      default:
        break
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.ws?.send(JSON.stringify({ type: 'PING' }))
        } catch {}
      }
    }, 25_000)
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect() {
    if (!this.active) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)

    this.reconnectTimer = setTimeout(() => {
      this.retryDelay = Math.min(this.retryDelay * 1.5, 15_000)
      this.initSocket()
    }, this.retryDelay)
  }

  public markAsRead(notificationId: string): boolean {
    if (!this.isConnected()) return false
    try {
      this.ws?.send(JSON.stringify({ type: 'MARK_READ', payload: { notificationId } }))
      return true
    } catch {
      return false
    }
  }

  public markAllAsRead(): boolean {
    if (!this.isConnected()) return false
    try {
      this.ws?.send(JSON.stringify({ type: 'MARK_ALL_READ' }))
      return true
    } catch {
      return false
    }
  }

  public requestUnreadCount(): boolean {
    if (!this.isConnected()) return false
    try {
      this.ws?.send(JSON.stringify({ type: 'GET_UNREAD_COUNT' }))
      return true
    } catch {
      return false
    }
  }

  private cleanupSocket() {
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      try {
        this.ws.close()
      } catch {}
      this.ws = null
    }
  }

  public disconnect() {
    this.active = false
    this.cleanupSocket()
    this.setStatus('disconnected')
  }
}
