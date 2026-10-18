import type { NotificationItem } from './feed'

export function notificationTarget(item: Partial<NotificationItem>, role: string): string {
  const id = item.referenceId ? encodeURIComponent(item.referenceId) : ''
  const ref = String(item.referenceType || '').toUpperCase()
  if (role === 'student') {
    if (ref === 'SUBMISSION' && id) return `/student/grading/result/${id}`
    if (['EXAM', 'ASSIGNMENT', 'ASSIGNMENT_GRADING'].includes(ref) && id) return `/student/assignments/${id}`
    if (ref === 'CLASS' && id) return `/student/classes/${id}`
    return '/student/notifications'
  }
  if (role === 'lecturer') {
    if (['EXAM', 'ASSIGNMENT', 'ASSIGNMENT_GRADING'].includes(ref) && id) return `/lecturer/assignments/${id}/submissions`
    if (ref === 'CLASS' && id) return `/lecturer/classes/${id}`
    if (ref === 'SUBMISSION' && id) return `/lecturer/grading/result/${id}`
    return '/lecturer/notifications'
  }
  if (ref === 'CLASS' && id) return `/admin/classes/${id}`
  return '/admin/notifications'
}

export function notificationTime(createdAt: string | null, now: number, locale: string): string {
  const time = createdAt ? Date.parse(createdAt) : NaN
  if (!Number.isFinite(time)) return locale === 'vi' ? 'Chưa rõ thời gian' : 'Time unavailable'
  const seconds = Math.round((time - now) / 1000)
  if (Math.abs(seconds) < 60) return locale === 'vi' ? 'Vừa xong' : 'Just now'
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (Math.abs(seconds) < 3600) return relative.format(Math.trunc(seconds / 60), 'minute')
  if (Math.abs(seconds) < 86400) return relative.format(Math.trunc(seconds / 3600), 'hour')
  return relative.format(Math.trunc(seconds / 86400), 'day')
}

export function notificationAbsoluteTime(createdAt: string | null | undefined, locale: string): string {
  const time = createdAt ? Date.parse(createdAt) : NaN
  if (!Number.isFinite(time)) return ''
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(time) + ' (UTC+7)'
}
