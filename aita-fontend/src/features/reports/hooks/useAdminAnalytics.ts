'use client'

import * as React from 'react'
import { useAuth } from '@/providers/auth-provider'
import { reportsApi, type AdminReport } from '@/lib/api/modules/reports'
import { ANALYTICS_EVENT } from '@/lib/events/analytics'

export function useAdminAnalytics(period: '7d' | '30d' | 'semester' | 'year' | 'custom' = '30d', start?: string, end?: string) {
  const { user, role, token, loading: authLoading } = useAuth()
  const key = `${user?.id}:${period}:${start || ''}:${end || ''}`
  const [state, setState] = React.useState<{ key: string; report: AdminReport | null; error: string | null; refreshing: boolean }>({ key: '', report: null, error: null, refreshing: false })
  const fetchRef = React.useRef<() => Promise<void>>(async () => {})

  React.useEffect(() => {
    if (authLoading || role !== 'admin' || !token || (period === 'custom' && (!start || !end))) return
    let active = true, queued = false
    let flight: Promise<void> | null = null
    let controller: AbortController | null = null
    let debounce: ReturnType<typeof setTimeout> | undefined
    const fetchData = (): Promise<void> => {
      if (!active) return Promise.resolve()
      if (flight) { queued = true; return flight }
      flight = (async () => {
        do {
          queued = false
          controller = new AbortController()
          const currentController = controller
          const timeout = setTimeout(() => currentController.abort(), 20_000)
          setState(previous => ({ key, report: previous.key === key ? previous.report : null, error: null, refreshing: true }))
          try {
            const report = await reportsApi.getSystemReports(period, start, end, controller.signal)
            if (active && !queued) setState({ key, report, error: null, refreshing: false })
          } catch (cause) {
            if (active && !queued) setState(previous => ({ ...previous, key, error: currentController.signal.aborted ? 'Quá thời gian tải thống kê. Vui lòng thử lại.' : cause instanceof Error ? cause.message : 'Không thể tải thống kê.', refreshing: false }))
          } finally { clearTimeout(timeout) }
        } while (queued && active)
      })().finally(() => { flight = null })
      return flight
    }
    fetchRef.current = fetchData
    const schedule = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(debounce)
      debounce = setTimeout(() => { void fetchData() }, 250)
    }
    const visible = () => { if (document.visibilityState === 'visible') schedule() }
    void fetchData()
    window.addEventListener(ANALYTICS_EVENT, schedule)
    window.addEventListener('online', schedule)
    document.addEventListener('visibilitychange', visible)
    // Reconcile after lost SSE frames, worker/API restarts or blocked streaming.
    const poll = setInterval(schedule, 30_000)
    return () => {
      active = false; controller?.abort(); clearTimeout(debounce); clearInterval(poll)
      window.removeEventListener(ANALYTICS_EVENT, schedule)
      window.removeEventListener('online', schedule)
      document.removeEventListener('visibilitychange', visible)
      fetchRef.current = async () => {}
    }
  }, [key, period, start, end, token, authLoading, role])
  const refresh = React.useCallback(() => fetchRef.current(), [])
  const report = state.key === key && role === 'admin' ? state.report : null
  const error = state.key === key ? state.error : null
  return { report, error, loading: !report && !error && !(period === 'custom' && (!start || !end)), refreshing: state.key === key && state.refreshing, refresh }
}
