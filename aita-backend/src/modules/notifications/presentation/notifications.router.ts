import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { NotificationsController } from './notifications.controller.js'

export class NotificationsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<NotificationsController>(TOKENS.NotificationsController)

        this.router.get('/', authenticate, asyncHandler((req, res) => ctrl.listMyNotifications(req, res)))
        this.router.get('/unread-count', authenticate, asyncHandler((req, res) => ctrl.unreadCount(req, res)))
        // SSE stream — client keeps this connection open to receive real-time pushes
        this.router.get('/stream', authenticate, (req, res) => ctrl.stream(req, res))
        // Sender-side history: the composer is not a recipient, so without this a lecturer had
        // no way to see what they had already sent.
        this.router.get('/sent', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => ctrl.listSentNotifications(req, res)))
        this.router.put('/read-all', authenticate, asyncHandler((req, res) => ctrl.markAllAsRead(req, res)))
        this.router.put('/:id/read', authenticate, asyncHandler((req, res) => ctrl.markAsRead(req, res)))
        this.router.delete('/all', authenticate, asyncHandler((req, res) => ctrl.deleteAllNotifications(req, res)))
        this.router.delete('/:id', authenticate, asyncHandler((req, res) => ctrl.deleteNotification(req, res)))
        this.router.post('/broadcast', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => ctrl.broadcast(req, res)))
    }
}
