import { randomUUID } from 'node:crypto'
import { prisma } from '../../database/prisma.js'

type Listener = (payload: any) => void
/** Shared event relay for API/worker processes. Durable snapshots remain the source of truth. */
export class RealtimeBus {
  private readonly sender = randomUUID()
  private readonly listeners = new Map<string, Set<Listener>>()
  private readonly seen = new Map<string, number>()
  private timer?: ReturnType<typeof setInterval>
  private busy = false
  private cleanupAt = 0
  private readonly startedAt = new Date()
  constructor(private readonly db: any = prisma) {}

  subscribe(topic: string, listener: Listener) {
    if (!this.listeners.has(topic)) this.listeners.set(topic, new Set())
    this.listeners.get(topic)!.add(listener)
    return () => this.listeners.get(topic)?.delete(listener)
  }

  publish(topic: string, payload: unknown) {
    if (!this.timer) return // Tests and offline tools do not emit external events.
    const data = JSON.stringify(payload)
    if (Buffer.byteLength(data) > 512 * 1024) { console.warn('[Realtime] Event too large; clients must reconcile their snapshot'); return }
    void this.db.$executeRaw`INSERT INTO "RealtimeEvent" ("Id", "Sender", "Topic", "Payload") VALUES (${randomUUID()}, ${this.sender}, ${topic}, ${data})`
      .catch(() => console.warn('[Realtime] Relay write failed; clients reconcile on reconnect'))
  }

  async poll() {
    if (this.busy) return
    this.busy = true
    try {
      // Overlap tolerates transactions committing out of timestamp order. Deduplicate by UUID.
      const rows = await this.db.$queryRaw`SELECT "Id", "Topic", "Payload", "CreatedAt" FROM "RealtimeEvent" WHERE "Sender"<>${this.sender} AND "CreatedAt">=${this.startedAt} AND "CreatedAt">NOW()-INTERVAL '2 minutes' ORDER BY "CreatedAt" DESC LIMIT 5000`
      for (const row of [...rows].reverse()) {
        if (this.seen.has(row.Id)) continue
        this.seen.set(row.Id, new Date(row.CreatedAt).getTime())
        try { for (const listener of this.listeners.get(row.Topic) || []) listener(JSON.parse(row.Payload)) }
        catch { console.warn('[Realtime] Ignored invalid relay event') }
      }
      const cutoff = Date.now() - 120000
      for (const [id, time] of this.seen) if (time < cutoff) this.seen.delete(id)
      if (Date.now() - this.cleanupAt > 60000) {
        this.cleanupAt = Date.now()
        await this.db.$executeRaw`DELETE FROM "RealtimeEvent" WHERE "CreatedAt"<NOW()-INTERVAL '5 minutes'`
      }
    } catch { console.warn('[Realtime] Relay unavailable; check PostgreSQL and migrations') }
    finally { this.busy = false }
  }

  start() { if (!this.timer) { this.timer = setInterval(() => { void this.poll() }, 1000); this.timer.unref?.() } }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined }
}

export const realtimeBus = new RealtimeBus()
