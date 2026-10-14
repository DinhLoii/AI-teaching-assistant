import { WebSocketServer, WebSocket } from 'ws'
import type { Server as HttpServer, IncomingMessage } from 'http'
import { URL } from 'url'
import { JwtTokenService } from '../jwt-token-service.js'
import { prisma } from '../../../database/prisma.js'
import { logger } from '../logger.js'

interface ClientMeta {
  userId: string
  role?: string
  isAlive: boolean
}

export class NotificationWsService {
  private wss: WebSocketServer | null = null
  private clients: Map<string, Set<WebSocket>> = new Map()
  private clientMeta: WeakMap<WebSocket, ClientMeta> = new WeakMap()
  private tokenService = new JwtTokenService()
  private heartbeatInterval: NodeJS.Timeout | null = null

  /**
   * Initialize WebSocket server and attach to existing HTTP server
   */
  init(server: HttpServer): WebSocketServer {
    if (this.wss) return this.wss

    this.wss = new WebSocketServer({
      noServer: false,
      server,
      // Handle both /ws/notifications and /ws paths
      verifyClient: (_info, done) => {
        done(true)
      },
    })

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req)
    })

    // Heartbeat every 30 seconds to clean up dead connections
    this.heartbeatInterval = setInterval(() => {
      this.pingClients()
    }, 30_000)

    logger.info('[WebSocket] Notification WebSocket server initialized on paths /ws, /ws/notifications')
    return this.wss
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const rawUrl = req.url || '/'
    // Only accept paths starting with /ws
    if (!rawUrl.startsWith('/ws')) {
      ws.close(1008, 'Invalid WebSocket path')
      return
    }

    let token: string | null = null
    try {
      const parsedUrl = new URL(rawUrl, 'http://localhost')
      token = parsedUrl.searchParams.get('token')
    } catch {
      // Fallback url parsing
    }

    if (!token && req.headers['sec-websocket-protocol']) {
      token = req.headers['sec-websocket-protocol']
    }

    let authUser: { userId: string; role?: string } | null = null

    if (token) {
      try {
        const decoded = this.tokenService.verify(token)
        if (decoded?.userId) {
          authUser = { userId: decoded.userId, role: decoded.role }
        }
      } catch (err: any) {
        logger.warn(`[WebSocket] Token validation failed on connect: ${err.message}`)
      }
    }

    // Set client alive flag
    this.clientMeta.set(ws, {
      userId: authUser?.userId || '',
      role: authUser?.role,
      isAlive: true,
    })

    ws.on('pong', () => {
      const meta = this.clientMeta.get(ws)
      if (meta) meta.isAlive = true
    })

    if (authUser) {
      await this.registerUserSocket(authUser.userId, authUser.role, ws)
    } else {
      // Allow 5 seconds for client to send AUTH message
      const authTimeout = setTimeout(() => {
        const meta = this.clientMeta.get(ws)
        if (!meta?.userId) {
          try {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Authentication timeout' }))
            ws.close(4001, 'Authentication timeout')
          } catch {}
        }
      }, 5_000)

      ws.on('close', () => clearTimeout(authTimeout))
    }

    // Handle incoming messages from client
    ws.on('message', async (raw: Buffer | string) => {
      try {
        const text = raw.toString()
        const data = JSON.parse(text)
        await this.handleClientMessage(ws, data)
      } catch (err: any) {
        logger.warn(`[WebSocket] Message parse error: ${err.message}`)
      }
    })

    ws.on('close', () => {
      this.unregisterSocket(ws)
    })

    ws.on('error', (err) => {
      logger.warn(`[WebSocket] Client socket error: ${err.message}`)
      this.unregisterSocket(ws)
    })
  }

  private async registerUserSocket(userId: string, role: string | undefined, ws: WebSocket): Promise<void> {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    this.clients.get(userId)!.add(ws)

    const meta = this.clientMeta.get(ws) || { userId, role, isAlive: true }
    meta.userId = userId
    meta.role = role
    this.clientMeta.set(ws, meta)

    // Calculate unread count
    const unreadCount = await this.getUnreadCount(userId)

    // Send connection success payload
    this.safeSend(ws, {
      type: 'CONNECTED',
      payload: {
        userId,
        role,
        unreadCount,
        serverTime: new Date().toISOString(),
      },
    })

    logger.info(`[WebSocket] User ${userId} connected (active tabs: ${this.clients.get(userId)!.size})`)
  }

  private unregisterSocket(ws: WebSocket): void {
    const meta = this.clientMeta.get(ws)
    if (!meta || !meta.userId) return

    const userSockets = this.clients.get(meta.userId)
    if (userSockets) {
      userSockets.delete(ws)
      if (userSockets.size === 0) {
        this.clients.delete(meta.userId)
      }
    }
  }

  private async handleClientMessage(ws: WebSocket, data: any): Promise<void> {
    const type = String(data?.type || '').toUpperCase()
    const meta = this.clientMeta.get(ws)

    // 1. AUTH message
    if (type === 'AUTH') {
      const token = data?.token || data?.payload?.token
      if (!token) {
        this.safeSend(ws, { type: 'ERROR', message: 'Token required' })
        return
      }
      try {
        const decoded = this.tokenService.verify(token)
        if (decoded?.userId) {
          await this.registerUserSocket(decoded.userId, decoded.role, ws)
        }
      } catch (err: any) {
        this.safeSend(ws, { type: 'AUTH_ERROR', message: 'Invalid token' })
      }
      return
    }

    // Require authentication for remaining actions
    const userId = meta?.userId
    if (!userId) {
      this.safeSend(ws, { type: 'UNAUTHORIZED', message: 'Please authenticate first' })
      return
    }

    // 2. Heartbeat PING
    if (type === 'PING') {
      if (meta) meta.isAlive = true
      this.safeSend(ws, { type: 'PONG', timestamp: Date.now() })
      return
    }

    // 3. Mark single notification as read
    if (type === 'MARK_READ') {
      const notificationId = data?.notificationId || data?.payload?.notificationId
      if (notificationId) {
        await prisma.notificationRecipient.updateMany({
          where: { NotificationId: notificationId, UserId: userId },
          data: { IsRead: true, ReadAt: new Date() },
        })

        const unreadCount = await this.getUnreadCount(userId)
        // Broadcast read sync to all open tabs of this user
        this.sendToUser(userId, {
          type: 'NOTIFICATION_READ',
          payload: { notificationId, unreadCount },
        })
      }
      return
    }

    // 4. Mark all notifications as read
    if (type === 'MARK_ALL_READ') {
      await prisma.notificationRecipient.updateMany({
        where: {
          UserId: userId,
          OR: [{ IsRead: false }, { IsRead: null }],
        },
        data: { IsRead: true, ReadAt: new Date() },
      })

      // Sync across all tabs of this user
      this.sendToUser(userId, {
        type: 'ALL_READ',
        payload: { unreadCount: 0 },
      })
      return
    }

    // 5. Get current unread count
    if (type === 'GET_UNREAD_COUNT') {
      const count = await this.getUnreadCount(userId)
      this.safeSend(ws, {
        type: 'UNREAD_COUNT',
        payload: { count },
      })
      return
    }
  }

  /**
   * Send an event to all open connections of a specific user
   */
  sendToUser(userId: string, event: { type: string; payload?: any }): void {
    const userSockets = this.clients.get(userId)
    if (!userSockets || userSockets.size === 0) return

    const message = JSON.stringify(event)
    for (const ws of userSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message)
        } catch (err: any) {
          logger.warn(`[WebSocket] Failed to send to socket of user ${userId}: ${err.message}`)
        }
      }
    }
  }

  /**
   * Send an event to multiple users
   */
  sendToUsers(userIds: string[], event: { type: string; payload?: any }): void {
    const uniqueIds = [...new Set(userIds)]
    for (const uid of uniqueIds) {
      this.sendToUser(uid, event)
    }
  }

  /**
   * Broadcast an event to all connected users, optionally filtered by role
   */
  broadcast(event: { type: string; payload?: any }, roleFilter?: string): void {
    const message = JSON.stringify(event)
    for (const sockets of this.clients.values()) {
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          const meta = this.clientMeta.get(ws)
          if (!roleFilter || meta?.role?.toUpperCase() === roleFilter.toUpperCase()) {
            try {
              ws.send(message)
            } catch {}
          }
        }
      }
    }
  }

  /**
   * Push a newly created notification in real-time
   */
  async notifyNewNotification(userId: string, notif: any): Promise<void> {
    const unreadCount = await this.getUnreadCount(userId)
    const payload = {
      id: notif.Id || notif.id,
      title: notif.Title || notif.title,
      message: notif.Message || notif.message,
      notificationType: notif.Type || notif.type || notif.notificationType,
      referenceId: notif.ReferenceId || notif.referenceId || null,
      referenceType: notif.ReferenceType || notif.referenceType || null,
      createdAt: notif.CreatedAt instanceof Date ? notif.CreatedAt.toISOString() : (notif.CreatedAt || new Date().toISOString()),
      isRead: false,
      unreadCount,
    }

    this.sendToUser(userId, {
      type: 'NEW_NOTIFICATION',
      payload,
    })
  }

  /**
   * Query database for user's unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.notificationRecipient.count({
        where: {
          UserId: userId,
          OR: [{ IsRead: false }, { IsRead: null }],
          Notification: { Type: { notIn: ['Reminder', 'DEADLINE_WARNING'] } },
        },
      })
    } catch {
      return 0
    }
  }

  private safeSend(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data))
      } catch (err: any) {
        logger.warn(`[WebSocket] safeSend error: ${err.message}`)
      }
    }
  }

  private pingClients(): void {
    if (!this.wss) return
    for (const ws of this.wss.clients) {
      const meta = this.clientMeta.get(ws)
      if (!meta) continue

      if (!meta.isAlive) {
        // Socket did not respond to last ping — terminate
        this.unregisterSocket(ws)
        ws.terminate()
        continue
      }

      meta.isAlive = false
      try {
        ws.ping()
      } catch {
        this.unregisterSocket(ws)
        ws.terminate()
      }
    }
  }

  getConnectedUsersCount(): number {
    return this.clients.size
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
  }
}

// Global singleton instance
export const notificationWsService = new NotificationWsService()

export function initNotificationWebSocket(server: HttpServer): NotificationWsService {
  notificationWsService.init(server)
  return notificationWsService
}
