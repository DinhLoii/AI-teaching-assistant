import type { Response } from 'express'

interface SseClient {
    userId: string
    res: Response
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
    register(userId: string, res: Response): () => void {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set())
        }
        const client: SseClient = { userId, res }
        this.clients.get(userId)!.add(client)

        // Send a heartbeat every 25 s so proxies / load-balancers don't close idle connections
        const heartbeat = setInterval(() => {
            try {
                res.write(': heartbeat\n\n')
            } catch {
                this.remove(userId, client)
            }
        }, 25_000)

        return () => {
            clearInterval(heartbeat)
            this.remove(userId, client)
        }
    }

    private remove(userId: string, client: SseClient) {
        const set = this.clients.get(userId)
        if (!set) return
        set.delete(client)
        if (set.size === 0) this.clients.delete(userId)
    }

    /** Push a JSON event to every open connection for userId. */
    push(userId: string, event: { type: string; payload?: unknown }) {
        const set = this.clients.get(userId)
        if (!set || set.size === 0) return
        const data = `data: ${JSON.stringify(event)}\n\n`
        for (const client of set) {
            try {
                client.res.write(data)
            } catch {
                this.remove(userId, client)
            }
        }
    }

    /** Broadcast to every connected user (e.g. admin announcements). */
    broadcast(event: { type: string; payload?: unknown }) {
        for (const userId of this.clients.keys()) {
            this.push(userId, event)
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
