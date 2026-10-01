import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { ListUserNotificationsUseCase, MarkNotificationAsReadUseCase, MarkAllNotificationsAsReadUseCase, DeleteNotificationUseCase, DeleteAllNotificationsUseCase } from '../application/use-cases/notification.use-case.js'
import { BroadcastNotificationUseCase } from '../application/use-cases/broadcast-notification.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { prisma } from '../../../database/prisma.js'
import { sseService } from '../../../shared/infrastructure/sse-service.js'

export class NotificationsController extends BaseController {
    constructor(
        private readonly listUserNotificationsUseCase: ListUserNotificationsUseCase,
        private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
        private readonly markAllNotificationsAsReadUseCase: MarkAllNotificationsAsReadUseCase,
        private readonly broadcastNotificationUseCase: BroadcastNotificationUseCase,
        private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
        private readonly deleteAllNotificationsUseCase: DeleteAllNotificationsUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async listMyNotifications(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const query = req.query as any
        this.logger.debug(`Fetching notifications for user: ${userId}`)
        const result = await this.listUserNotificationsUseCase.execute(userId, {
            page: Number(query.page || 1),
            limit: Number(query.limit || 20),
            read: query.read === 'true' ? true : query.read === 'false' ? false : undefined
        })
        this.ok(res, result, MESSAGES.NOTIFICATIONS_LIST_SUCCESS)
    }

    async unreadCount(req: Request, res: Response): Promise<void> {
        const count = await prisma.notificationRecipient.count({
            where: {
                UserId: req.user!.id,
                OR: [{ IsRead: false }, { IsRead: null }],
                Notification: { Type: { notIn: ['Reminder', 'DEADLINE_WARNING'] } },
            },
        })
        this.ok(res, { count }, 'Unread notification count')
    }

    /**
     * SSE stream — keeps the HTTP connection open and pushes events as they arrive.
     * The client reconnects automatically on disconnect (EventSource spec).
     */
    stream(req: Request, res: Response): void {
        const userId = (req as any).user?.id as string
        if (!userId) {
            res.status(401).end()
            return
        }

        // Set SSE headers — must disable any response compression / buffering
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('X-Accel-Buffering', 'no')   // nginx
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        // Send an initial "connected" event so the client knows the stream is live
        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', payload: { userId } })}\n\n`)

        // Register this response with the singleton service
        const cleanup = sseService.register(userId, res)

        // Clean up when the client closes the connection
        req.on('close', cleanup)
        req.on('error', cleanup)
    }

    async markAsRead(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const notificationId = req.params.id as string
        this.logger.info(`Marking notification ${notificationId} as read for user ${userId}`)
        await this.markNotificationAsReadUseCase.execute(userId, notificationId)
        this.ok(res, null, MESSAGES.NOTIFICATIONS_MARK_READ_SUCCESS)
    }

    async markAllAsRead(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        this.logger.info(`Marking all notifications as read for user ${userId}`)
        await this.markAllNotificationsAsReadUseCase.execute(userId)
        this.ok(res, null, 'Marked all notifications as read successfully')
    }

    async broadcast(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const actorRole = (req as any).user.role
        const { title, message, type, targetRole, classIds } = req.body
        this.logger.info(`Broadcasting notification: ${title} to ${classIds?.length ? `${classIds.length} class(es)` : targetRole}`)
        const result = await this.broadcastNotificationUseCase.execute({
            title,
            message,
            type,
            targetRole,
            classIds,
            createdBy: userId,
            actorRole
        })
        this.created(res, result, 'Broadcast notification successful')
    }

    /** Everything this user has sent, newest first, with how many people received each one. */
    async listSentNotifications(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const limit = Math.min(Number((req.query as any).limit) || 50, 200)
        const rows = await prisma.notification.findMany({
            where: { CreatedBy: userId },
            orderBy: { CreatedAt: 'desc' },
            take: limit,
            select: {
                Id: true, Title: true, Message: true, Type: true, CreatedAt: true,
                ReferenceId: true, ReferenceType: true,
                _count: { select: { NotificationRecipient: true } },
            },
        })

        // A send to several classes writes one notification per class, so without the class
        // code the sent list would read as duplicates of the same message.
        const classIds = [...new Set(rows
            .filter(r => String(r.ReferenceType ?? '').toUpperCase() === 'CLASS' && r.ReferenceId)
            .map(r => r.ReferenceId as string))]
        const classCodeById = new Map<string, string | null>()
        if (classIds.length > 0) {
            const classes = await prisma.class.findMany({
                where: { Id: { in: classIds } },
                select: { Id: true, ClassCode: true },
            })
            classes.forEach(c => classCodeById.set(c.Id, c.ClassCode ?? null))
        }

        this.ok(res, rows.map(r => ({
            id: r.Id,
            title: r.Title,
            message: r.Message,
            type: r.Type,
            createdAt: r.CreatedAt,
            classCode: r.ReferenceId ? (classCodeById.get(r.ReferenceId) ?? null) : null,
            recipientCount: r._count.NotificationRecipient,
        })), 'Lấy lịch sử thông báo đã gửi thành công')
    }

    async deleteNotification(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        const notificationId = req.params.id as string
        this.logger.info(`Deleting notification ${notificationId} for user ${userId}`)
        await this.deleteNotificationUseCase.execute(userId, notificationId)
        this.ok(res, null, 'Deleted notification successfully')
    }

    async deleteAllNotifications(req: Request, res: Response): Promise<void> {
        const userId = (req as any).user.id
        this.logger.info(`Deleting all notifications for user ${userId}`)
        await this.deleteAllNotificationsUseCase.execute(userId)
        this.ok(res, null, 'Deleted all notifications successfully')
    }
}
