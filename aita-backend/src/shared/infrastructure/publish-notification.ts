import { sseService } from './sse-service.js'

// Call only after the notification and its recipients have been persisted.
export function publishNotification(userIds: Iterable<string>, notification: any, updated = false): void {
  const type = notification.Type ?? notification.type ?? notification.notificationType
  if (['REMINDER', 'DEADLINE_WARNING'].includes(String(type).toUpperCase())) return
  const rawDate = notification.CreatedAt ?? notification.createdAt
  const payload = {
    id: notification.Id ?? notification.id,
    title: notification.Title ?? notification.title,
    message: notification.Message ?? notification.message,
    type,
    referenceId: notification.ReferenceId ?? notification.referenceId ?? null,
    referenceType: notification.ReferenceType ?? notification.referenceType ?? null,
    createdAt: rawDate instanceof Date ? rawDate.toISOString() : rawDate ?? null,
    isRead: false,
    updated,
  }
  for (const userId of new Set(userIds)) sseService.push(userId, { type: 'NOTIFICATION', payload })
}
