import { Button } from './button'
import { useLanguage } from '@/providers/language-provider'

export function ErrorNotice({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  const { t } = useLanguage()
  if (!message) return null
  return <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
    <p>{message}</p>
    {onRetry && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>{t('ui.retry', 'Thử lại')}</Button>}
  </div>
}

export function Pagination({ page, hasNext, loading, onChange }: {
  page: number; hasNext: boolean; loading: boolean; onChange: (page: number) => void
}) {
  const { t } = useLanguage()
  return <nav aria-label={t('ui.pagination', 'Phân trang')} className="flex items-center justify-end gap-3 py-3">
    <Button variant="outline" size="sm" disabled={loading || page === 1} onClick={() => onChange(page - 1)}>{t('ui.prev_page', 'Trang trước')}</Button>
    <span aria-live="polite" className="text-sm">{t('ui.page_num', `Trang ${page}`, { page })}</span>
    <Button variant="outline" size="sm" disabled={loading || !hasNext} onClick={() => onChange(page + 1)}>{t('ui.next_page', 'Trang sau')}</Button>
  </nav>
}
