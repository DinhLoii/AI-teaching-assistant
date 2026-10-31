'use client'

import { useEffect, useRef, useState } from 'react'
import { ASSIGNMENTS_EVENT, emitAssignmentsChanged } from '@/lib/events/assignments'

/** Refresh mounted student views after a deadline change or returning to the app. */
export function useAssignmentSync(refresh: () => unknown) {
  const [, setClock] = useState(0)
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh }, [refresh])
  useEffect(() => {
    const reload = () => { void Promise.resolve().then(() => latest.current()).catch(error => console.warn('Assignment refresh failed:', error)) }
    let needsRefresh = false
    const suspend = () => { needsRefresh = true }
    const resume = () => {
      if (document.visibilityState !== 'visible' || !needsRefresh) return
      needsRefresh = false
      emitAssignmentsChanged()
    }
    const visibility = () => { if (document.visibilityState === 'hidden') suspend(); else resume() }
    window.addEventListener(ASSIGNMENTS_EVENT, reload)
    window.addEventListener('focus', resume)
    window.addEventListener('blur', suspend)
    document.addEventListener('visibilitychange', visibility)
    // Keep relative deadline labels current without polling the API.
    const clock = setInterval(() => { if (document.visibilityState === 'visible') setClock(value => value + 1) }, 30_000)
    return () => {
      window.removeEventListener(ASSIGNMENTS_EVENT, reload)
      window.removeEventListener('focus', resume)
      window.removeEventListener('blur', suspend)
      document.removeEventListener('visibilitychange', visibility)
      clearInterval(clock)
    }
  }, [])
}
