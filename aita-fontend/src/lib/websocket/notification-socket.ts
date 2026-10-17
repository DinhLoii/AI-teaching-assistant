import { BASE, request } from '../api/client'
import { AUTH_STORAGE_KEYS, getStoredItem } from '../api/storage'
import type { NotificationItem } from '../notifications/feed'

export type NotificationPayload = NotificationItem
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

// Authenticated fetch streaming works through the same API proxy as REST,
// including HTTPS deployments without exposing a separate WebSocket port.
export class NotificationSocket {
  public onEvent: ((event: { type: string; payload?: any }) => void) | null = null
  public onStatusChange: ((status: ConnectionStatus) => void) | null = null
  public onServerTime: ((time: string) => void) | null = null
  private controller: AbortController | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private active = false
  private attempt = 0
  private generation = 0
  private status: ConnectionStatus = 'disconnected'
  getStatus() { return this.status }
  isConnected() { return this.status === 'connected' }
  private setStatus(status: ConnectionStatus) { this.status = status; this.onStatusChange?.(status) }
  connect(_token: string) {
    this.disconnect()
    this.active = true
    void this.open(++this.generation)
  }
  private async open(generation: number): Promise<void> {
    if (!this.active || generation !== this.generation) return
    const controller = new AbortController()
    this.controller = controller
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const touch = () => { clearTimeout(watchdog); watchdog = setTimeout(() => controller.abort(), 45_000) }
    try {
      this.setStatus('connecting')
      touch()
      const response = await fetch(`${BASE}/notifications/stream`, {
        headers: { Authorization: `Bearer ${getStoredItem(AUTH_STORAGE_KEYS.token) || ''}`, Accept: 'text/event-stream' },
        cache: 'no-store', signal: controller.signal,
      })
      if (response.status === 401) {
        // Use the common refresh-token queue; the provider will reconnect after session sync.
        await request('/auth/me', { cache: 'no-store' })
        throw new Error('Reconnect with refreshed session')
      }
      if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Stream unavailable')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (this.active && generation === this.generation) {
        const { done, value } = await reader.read()
        if (done) break
        if (!this.active || generation !== this.generation) return
        touch()
        buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
        if (buffer.length > 1024 * 1024) throw new Error('Stream frame too large')
        let end: number
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end)
          buffer = buffer.slice(end + 2)
          const body = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
          if (!body) continue
          try {
            const event = JSON.parse(body)
            if (typeof event.type !== 'string') continue
            if (event.serverTime || event.payload?.serverTime) this.onServerTime?.(event.serverTime || event.payload.serverTime)
            if (event.type === 'CONNECTED') {
              this.attempt = 0
              this.setStatus('connected')
            }
            this.onEvent?.(event)
          } catch { /* Malformed frames must not tear down a healthy connection. */ }
        }
      }
    } catch { /* Reconciliation on reconnect recovers missed events. */ }
    finally {
      clearTimeout(watchdog)
      controller.abort()
      if (this.active && generation === this.generation) {
        this.setStatus('disconnected')
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.attempt++, 5)) * (0.8 + Math.random() * 0.4)
        this.timer = setTimeout(() => { void this.open(generation) }, delay)
      }
    }
  }
  disconnect() {
    this.active = false
    this.generation++
    if (this.timer) clearTimeout(this.timer)
    this.controller?.abort()
    this.setStatus('disconnected')
  }
}
