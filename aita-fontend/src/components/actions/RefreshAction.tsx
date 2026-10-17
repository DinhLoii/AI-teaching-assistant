'use client'

import { RefreshButton, type RefreshButtonProps } from '@/components/ui/refresh-button'
import { clearClientApiCache } from '@/lib/api/client'
import { useLanguage } from '@/providers/language-provider'

type Props = Omit<RefreshButtonProps, 'label' | 'busyLabel' | 'errorLabel'> & {
  cachePaths?: readonly string[]
  label?: string
}

/** Invalidate only this screen's resources; the awaited loader repopulates the cache. */
export function RefreshAction({ cachePaths = [], onRefresh, label, ...props }: Props) {
  const { language } = useLanguage()
  const isVi = language === 'vi'
  return <RefreshButton
    {...props}
    label={label || (isVi ? 'Làm mới' : 'Refresh')}
    busyLabel={isVi ? 'Đang làm mới...' : 'Refreshing...'}
    errorLabel={isVi ? 'Không thể làm mới. Vui lòng thử lại.' : 'Unable to refresh. Please try again.'}
    onRefresh={async () => {
      cachePaths.forEach(path => clearClientApiCache(path))
      await onRefresh()
    }}
  />
}
