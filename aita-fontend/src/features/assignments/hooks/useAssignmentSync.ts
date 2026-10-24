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
    const resume = () => { if (document.visibilityState === 'visible') emitAssignmentsChanged() }
    window.addEventListener(ASSIGNMENTS_EVENT, reload)
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    // Keep relative deadline labels current without polling the API.
    const clock = setInterval(() => { if (document.visibilityState === 'visible') setClock(value => value + 1) }, 30_000)
    return () => {
      window.removeEventListener(ASSIGNMENTS_EVENT, reload)
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
      clearInterval(clock)
    }
  }, [])
}
