'use client'

import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RefreshButtonProps {
  onRefresh: () => Promise<unknown>
  disabled?: boolean
  busy?: boolean
  iconOnly?: boolean
  label: string
  busyLabel: string
  errorLabel: string
  className?: string
}

/** The callback must settle only after the requested data has finished loading. */
export function RefreshButton({ onRefresh, disabled, busy, iconOnly, label, busyLabel, errorLabel, className }: RefreshButtonProps) {
  const [pending, setPending] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const locked = React.useRef(false)
  const mounted = React.useRef(true)
  React.useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const active = pending || !!busy

  const refresh = async () => {
    if (locked.current || disabled || busy) return
    locked.current = true
    setPending(true)
    setFailed(false)
    try {
      await onRefresh()
    } catch {
      if (mounted.current) setFailed(true)
    } finally {
      locked.current = false
      if (mounted.current) setPending(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={disabled || active}
        aria-busy={active}
        aria-label={active ? busyLabel : label}
        title={active ? busyLabel : label}
        data-refresh-button="true"
        className={cn('relative overflow-hidden inline-flex shrink-0 items-center justify-center gap-1.5 h-9 rounded-xl border border-orange-200/80 dark:border-orange-900/40 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-orange-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:border-orange-300 disabled:text-orange-600 dark:disabled:text-orange-400', iconOnly ? 'w-10' : 'w-10 sm:w-36 px-3', className)}
      >
        <RefreshCw aria-hidden="true" className={cn('w-3.5 h-3.5 shrink-0 text-orange-500', active && 'motion-safe:animate-spin')} />
        {!iconOnly && <span className="hidden sm:inline whitespace-nowrap">{active ? busyLabel : label}</span>}
        {active && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-orange-400/70 motion-safe:animate-pulse" />}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{active ? busyLabel : ''}</span>
      {failed && <span role="alert" className="max-w-64 text-xs text-red-600 dark:text-red-400">{errorLabel}</span>}
    </span>
  )
}
