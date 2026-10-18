import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../../../database/prisma.js'
import { AppError } from '../../../../shared/application/app.error.js'
import { sseService } from '../../../../shared/infrastructure/sse-service.js'

export interface BroadcastNotificationParams {
    title: string
    message: string
    type?: string
    /** Role-wide broadcast. Ignored when `classIds` is supplied. */
    targetRole?: 'ALL' | 'LECTURER' | 'STUDENT'
    /** Send to the students enrolled in these classes instead of a whole role. */
    classIds?: string[]
    createdBy?: string
    /** Role of the caller — a LECTURER may only target classes they actually teach. */
    actorRole?: string
}

export class BroadcastNotificationUseCase {
    constructor(_notificationRepo: INotificationRepository) { }

    async execute(params: BroadcastNotificationParams) {
        const classIds = (params.classIds ?? []).filter(Boolean)
        const byClass = classIds.length > 0

        if (!byClass && !params.targetRole) {
            throw new AppError('BROADCAST_NO_TARGET', 'Phải chọn lớp hoặc vai trò nhận thông báo', 400)
        }

        if (!byClass) {
            // Role-wide: there is no class to record, so this stays a single row.
            const userIds = await this.usersOfRole(params.targetRole!)
            const notification = await this.createNotification(params, null, params.type || 'SYSTEM')
            await this.addRecipients(notification.Id, userIds)
            // Push SSE to all recipients who have an open connection
            const ssePayload = this.buildSsePayload(notification)
            userIds.forEach(uid => sseService.push(uid, { type: 'NOTIFICATION', payload: ssePayload }))
            return { notification, recipientCount: userIds.length }
        }

        await this.assertOwnsClasses(classIds, params)

        // One notification PER CLASS. `Notification` has room for exactly one reference
        // (`ReferenceId`/`ReferenceType`), and a reader has to be told the class *they* are
        // in — with several classes on one row there is no way to answer that per recipient.
        // Recipients are deduplicated across the batch so a student enrolled in two targeted
        // classes still receives the message once.
        const notified = new Set<string>()
        const notifications: any[] = []
        let recipientCount = 0

        for (const classId of classIds) {
            // Sequential, not Promise.all: this SQL Server instance accepts one connection.
            const enrolled = await prisma.studentClass.findMany({
                where: { ClassId: classId },
                select: { UserId: true },
            })
            const userIds = [...new Set(enrolled.map((e: any) => e.UserId))].filter((id) => !notified.has(id))

            // Created even when the class is empty, so "Đã gửi" can keep reporting
            // "Không ai nhận được — lớp chưa có sinh viên" instead of silently dropping it.
            const notification = await this.createNotification(params, classId, params.type || 'CLASS')
            await this.addRecipients(notification.Id, userIds)

            // Push SSE in real-time to each recipient with an open connection
            const ssePayload = this.buildSsePayload(notification)
            userIds.forEach(uid => sseService.push(uid, { type: 'NOTIFICATION', payload: ssePayload }))

            userIds.forEach((id) => notified.add(id))
            notifications.push(notification)
            recipientCount += userIds.length
        }

        return { notification: notifications[0], notifications, recipientCount, classIds }
    }

    private async createNotification(params: BroadcastNotificationParams, classId: string | null, type: string) {
        return prisma.notification.create({
            data: {
                Id: uuidv4(),
                Title: params.title,
                Message: params.message,
                Type: type,
                // The class the message was sent to. Nothing recorded this before, so a
                // student could not tell which of their classes a broadcast came from.
                ReferenceId: classId,
                ReferenceType: classId ? 'CLASS' : null,
                CreatedBy: params.createdBy,
                CreatedAt: new Date(),
            }
        })
    }

    private async addRecipients(notificationId: string, userIds: string[]) {
        if (userIds.length === 0) return
        await prisma.notificationRecipient.createMany({
            data: userIds.map(userId => ({ NotificationId: notificationId, UserId: userId, IsRead: false }))
        })
    }

    private buildSsePayload(n: any) {
        return {
            id: n.Id,
            title: n.Title,
            message: n.Message,
            notificationType: n.Type,
            referenceId: n.ReferenceId ?? null,
            referenceType: n.ReferenceType ?? null,
            createdAt: n.CreatedAt instanceof Date ? n.CreatedAt.toISOString() : (n.CreatedAt ?? null),
            isRead: false,
        }
    }

    /** A lecturer is confined to their own classes. Checked before anything is written. */
    private async assertOwnsClasses(classIds: string[], params: BroadcastNotificationParams): Promise<void> {
        if (String(params.actorRole).toUpperCase() !== 'LECTURER') return

        const own = await prisma.instructorClass.findMany({
            where: { UserId: params.createdBy, ClassId: { in: classIds } },
            select: { ClassId: true },
        })
        const allowed = new Set(own.map(o => o.ClassId))
        const denied = classIds.filter(id => !allowed.has(id))
        if (denied.length > 0) {
            throw new AppError('CLASS_NOT_OWNED', 'Bạn chỉ được gửi thông báo cho lớp mình phụ trách', 403)
        }
    }

    private async usersOfRole(targetRole: 'ALL' | 'LECTURER' | 'STUDENT'): Promise<string[]> {
        if (targetRole === 'ALL') {
            const users = await prisma.user.findMany({ select: { Id: true } })
            return users.map(u => u.Id)
        }
        const roles = await prisma.role.findMany({ where: { RoleName: targetRole } })
        if (roles.length === 0) return []
        const userRoles = await prisma.userRole.findMany({
            where: { RoleId: { in: roles.map(r => r.Id) } },
            select: { UserId: true }
        })
        return [...new Set(userRoles.map(ur => ur.UserId))]
    }
}
