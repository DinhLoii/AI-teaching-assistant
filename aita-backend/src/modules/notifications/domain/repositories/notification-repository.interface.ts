import { Notification } from '../entities/notification.entity.js'

export interface INotificationRepository {
    findForUser(userId: string, params: { limit?: number; offset?: number; read?: boolean }): Promise<Notification[]>
    getById(id: string): Promise<Notification | null>
    save(notification: Notification): Promise<void>
    markAsRead(userId: string, notificationId: string): Promise<void>
    markAllAsRead(userId: string): Promise<void>
    deleteForUser(userId: string, notificationId: string): Promise<void>
    deleteAllForUser(userId: string): Promise<void>
}
