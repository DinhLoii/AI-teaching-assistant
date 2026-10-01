'use client'

import { Button } from './button'

export function ErrorNotice({
  message,
  onRetry,
  retryLabel = 'Thử lại',
}: {
  message: string | null
  onRetry?: () => void
  retryLabel?: string
}) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
      <p>{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export function Pagination({
  page,
  hasNext,
  loading,
  onChange,
  prevLabel = 'Trang trước',
  nextLabel = 'Trang sau',
  pageLabel,
}: {
  page: number
  hasNext: boolean
  loading: boolean
  onChange: (page: number) => void
  prevLabel?: string
  nextLabel?: string
  pageLabel?: string
}) {
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-end gap-3 py-3">
      <Button variant="outline" size="sm" disabled={loading || page === 1} onClick={() => onChange(page - 1)}>
        {prevLabel}
      </Button>
      <span aria-live="polite" className="text-sm">
        {pageLabel ?? `Trang ${page}`}
      </span>
      <Button variant="outline" size="sm" disabled={loading || !hasNext} onClick={() => onChange(page + 1)}>
        {nextLabel}
      </Button>
    </nav>
  )
}

