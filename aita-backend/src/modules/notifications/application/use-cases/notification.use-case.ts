import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'

export class ListUserNotificationsUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string, params: { page?: number; limit?: number; read?: boolean }) {
        const limit = params.limit ?? 20
        const offset = ((params.page ?? 1) - 1) * limit

        const list = await this.notificationRepo.findForUser(userId, { limit, offset, read: params.read })

        return list.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            referenceId: n.referenceId,
            referenceType: n.referenceType,
            createdBy: n.createdBy,
            // Who sent it, and what it is about. `createdBy` alone is a uuid, which no screen
            // can render — the repository resolves the sender and, for assignment
            // notifications, the subject and the reader's own class.
            sender: (n as any).sender ?? null,
            subjectCode: (n as any).subjectCode ?? null,
            subjectName: (n as any).subjectName ?? null,
            classCode: (n as any).classCode ?? null,
            createdAt: n.createdAt ? (typeof n.createdAt === 'string' ? n.createdAt : (n.createdAt as any).toISOString ? (n.createdAt as any).toISOString() : new Date(n.createdAt).toISOString()) : new Date().toISOString(),
            read: (n as any).read ?? (n as any).isRead ?? false,
            isRead: (n as any).isRead ?? (n as any).read ?? false
        })).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    }
}

export class MarkNotificationAsReadUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string, notificationId: string) {
        await this.notificationRepo.markAsRead(userId, notificationId)
    }
}

export class MarkAllNotificationsAsReadUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string) {
        await this.notificationRepo.markAllAsRead(userId)
    }
}

export class DeleteNotificationUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string, notificationId: string) {
        await this.notificationRepo.deleteForUser(userId, notificationId)
    }
}

export class DeleteAllNotificationsUseCase {
    constructor(private readonly notificationRepo: INotificationRepository) { }

    async execute(userId: string) {
        await this.notificationRepo.deleteAllForUser(userId)
    }
}
