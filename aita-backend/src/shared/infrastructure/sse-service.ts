import type { Response } from 'express'
import { realtimeBus } from './realtime-bus.js'

interface SseClient {
    userId: string
    role?: string
    res: Response
    heartbeat?: NodeJS.Timeout
}

/**
 * SseService — singleton that keeps track of all active SSE connections
 * and lets any use-case push an event to a specific user.
 *
 * Usage:
 *   sseService.push(userId, { type: 'NOTIFICATION', payload: { ... } })
 */
class SseService {
    private clients: Map<string, Set<SseClient>> = new Map()

    /** Register a new SSE response for a user. Returns a cleanup function. */
    register(userId: string, res: Response, role?: string): () => void {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set())
        }
        const client: SseClient = { userId, res, role: role?.toLowerCase() }
        this.clients.get(userId)!.add(client)

        // Send a heartbeat every 25 s so proxies / load-balancers don't close idle connections
        client.heartbeat = setInterval(() => {
            try {
                if (res.writableEnded || res.destroyed) { this.remove(userId, client); return }
                if (res.writableLength > 1024 * 1024) { res.end(); this.remove(userId, client); return }
                res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', serverTime: new Date().toISOString() })}\n\n`)
            } catch {
                this.remove(userId, client)
            }
        }, 25_000)

        return () => {
            this.remove(userId, client)
        }
    }

    private remove(userId: string, client: SseClient) {
        if (client.heartbeat) clearInterval(client.heartbeat)
        const set = this.clients.get(userId)
        if (!set) return
        set.delete(client)
        if (set.size === 0) this.clients.delete(userId)
    }

    /** Push a JSON event to every open connection for userId (SSE + WebSocket). */
    push(userId: string, event: { type: string; payload?: unknown }, includeWebSocket = true, relay = true) {
        if (relay) realtimeBus.publish('notification', { userId, event })
        // Also push through WebSocket in real-time
        if (includeWebSocket) try {
            import('./websocket/notification-ws.service.js').then(({ notificationWsService }) => {
                if (event.type === 'NOTIFICATION' && event.payload) {
                    void notificationWsService.notifyNewNotification(userId, event.payload).catch(() => {})
                } else {
                    notificationWsService.sendToUser(userId, event)
                }
            }).catch(() => {})
        } catch {}

        const set = this.clients.get(userId)
        if (!set || set.size === 0) return
        const data = `data: ${JSON.stringify({ ...event, serverTime: new Date().toISOString() })}\n\n`
        for (const client of set) {
            try {
                if (client.res.writableEnded || client.res.destroyed) { this.remove(userId, client); continue }
                if (client.res.writableLength > 1024 * 1024) { client.res.end(); this.remove(userId, client); continue }
                client.res.write(data)
            } catch {
                this.remove(userId, client)
            }
        }
    }

    /** Broadcast to every connected user (e.g. admin announcements). */
    broadcast(event: { type: string; payload?: unknown }, relay = true) {
        if (relay) realtimeBus.publish('notification-broadcast', { event })
        void import('./websocket/notification-ws.service.js').then(({ notificationWsService }) => notificationWsService.broadcast(event)).catch(() => {})
        for (const userId of this.clients.keys()) {
            this.push(userId, event, false, false)
        }
    }

    broadcastToRole(role: string, event: { type: string; payload?: unknown }, relay = true) {
        if (relay) realtimeBus.publish('notification-role', { role, event })
        const data = `data: ${JSON.stringify({ ...event, serverTime: new Date().toISOString() })}\n\n`
        for (const [userId, clients] of this.clients) for (const client of clients) {
            if (client.role !== role) continue
            try {
                if (client.res.writableEnded || client.res.destroyed || client.res.writableLength > 1024 * 1024) {
                    client.res.end(); this.remove(userId, client); continue
                }
                client.res.write(data)
            } catch { this.remove(userId, client) }
        }
    }

    connectedCount(): number {
        let n = 0
        for (const s of this.clients.values()) n += s.size
        return n
    }
}

// Module-level singleton — imported by use-cases and the controller.
export const sseService = new SseService()
realtimeBus.subscribe('notification', ({ userId, event }) => sseService.push(userId, event, true, false))
realtimeBus.subscribe('notification-broadcast', ({ event }) => sseService.broadcast(event, false))
realtimeBus.subscribe('notification-role', ({ role, event }) => sseService.broadcastToRole(role, event, false))
