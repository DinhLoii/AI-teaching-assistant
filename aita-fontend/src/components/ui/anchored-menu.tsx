'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface AnchoredMenuProps {
  anchor: HTMLElement | null
  id: string
  label: string
  onClose: () => void
  children: React.ReactNode
}

/** Render outside scroll containers so table overflow cannot clip the menu. */
export function AnchoredMenu({ anchor, id, label, onClose, children }: AnchoredMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef(onClose)
  const focused = React.useRef(false)
  const [position, setPosition] = React.useState<React.CSSProperties>({ visibility: 'hidden', width: 256, maxWidth: 'calc(100vw - 16px)' })
  React.useLayoutEffect(() => { closeRef.current = onClose }, [onClose])

  React.useLayoutEffect(() => {
    if (!anchor) return
    const menu = menuRef.current
    if (!menu) return
    focused.current = false
    const place = () => {
      if (!anchor.isConnected) { closeRef.current(); return }
      const rect = anchor.getBoundingClientRect()
      const viewport = window.visualViewport
      const leftEdge = viewport?.offsetLeft ?? 0
      const topEdge = viewport?.offsetTop ?? 0
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      const margin = 8, gap = 6
      const menuWidth = Math.min(256, width - margin * 2)
      const below = Math.max(0, topEdge + height - rect.bottom - gap - margin)
      const above = Math.max(0, rect.top - topEdge - gap - margin)
      const naturalHeight = menu.scrollHeight
      const openAbove = below < naturalHeight && above > below
      const maxHeight = Math.max(0, openAbove ? above : below)
      const displayedHeight = Math.min(naturalHeight, maxHeight)
      setPosition({
        width: menuWidth,
        maxHeight,
        left: Math.max(leftEdge + margin, Math.min(rect.right - menuWidth, leftEdge + width - menuWidth - margin)),
        top: Math.max(topEdge + margin, openAbove ? rect.top - gap - displayedHeight : rect.bottom + gap),
      })
    }
    place()
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.contains(event.target) && !anchor.contains(event.target)) closeRef.current()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current() }
    }
    // Follow the trigger when its table/page scrolls, including automatic scroll on touch.
    const scroll = (event: Event) => {
      if (event.target instanceof Node && menu.contains(event.target)) return
      const rect = anchor.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) closeRef.current()
      else place()
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', scroll, true)
    window.visualViewport?.addEventListener('resize', place)
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', scroll, true)
      window.visualViewport?.removeEventListener('resize', place)
      if (anchor.isConnected) anchor.focus({ preventScroll: true })
    }
  }, [anchor])

  React.useLayoutEffect(() => {
    if (position.visibility === 'hidden' || focused.current) return
    focused.current = true
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  }, [position])

  if (!anchor) return null
  return createPortal(
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={label}
      style={position}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        if (event.key === 'Tab') {
          anchor.focus({ preventScroll: true })
          closeRef.current()
          return
        }
        const target = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : event.key === 'ArrowDown' ? (index + 1) % items.length
          : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : null
        if (target !== null) { event.preventDefault(); items[target]?.focus() }
      }}
      className={cn('fixed z-[60] overflow-y-auto overscroll-contain rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-950/20 p-1.5 divide-y divide-slate-100 dark:divide-slate-800', '[&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-orange-400')}
    >{children}</div>,
    document.body,
  )
}
