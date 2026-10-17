import { request } from '../api/client'
import { AUTH_STORAGE_KEYS, getStoredItem } from '../api/storage'

/** Fetch-based SSE keeps credentials out of URLs and reconnects after transport loss. */
interface GradingProgress { state?: string; error?: string; progressPercent?: number; currentTask?: string; [key: string]: unknown }
export function subscribeProgressStream(url: string, onProgress: (job: GradingProgress) => void, onComplete: () => void, onError: (error: Error) => void) {
  const controller = new AbortController()
  let active = true
  let timer: ReturnType<typeof setTimeout> | undefined
  let attempts = 0
  const open = async () => {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${getStoredItem(AUTH_STORAGE_KEYS.token) || ''}`, Accept: 'text/event-stream' },
        cache: 'no-store', signal: controller.signal,
      })
      if (response.status === 401) { await request('/auth/me', { cache: 'no-store' }); throw new Error('Session refreshed') }
      if (!response.ok || !response.body) throw new Error('Không kết nối được tiến trình chấm bài.')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (active) {
          const { done, value } = await reader.read()
          if (done) break
          if (!active) return
          buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
          if (buffer.length > 1024 * 1024) throw new Error('Dữ liệu tiến trình vượt giới hạn.')
          let end: number
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2)
            const data = frame.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
            if (!data) continue
            let job: GradingProgress
            try {
              const value: unknown = JSON.parse(data)
              if (!value || typeof value !== 'object') continue
              job = value as GradingProgress
            } catch { continue }
            attempts = 0
            onProgress(job)
            if (job.state === 'failed' || job.error) { active = false; onError(new Error(job.error || 'Chấm bài thất bại.')); controller.abort(); return }
            if (job.state === 'completed') { active = false; onComplete(); controller.abort(); return }
          }
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
    } catch (error) {
      if (!active || controller.signal.aborted) return
      if (++attempts >= 8) { active = false; onError(error instanceof Error ? error : new Error('Mất kết nối tiến trình.')); return }
    }
    if (active) timer = setTimeout(() => { void open() }, Math.min(15000, 1000 * 2 ** attempts))
  }
  void open()
  return () => { active = false; clearTimeout(timer); controller.abort() }
}
