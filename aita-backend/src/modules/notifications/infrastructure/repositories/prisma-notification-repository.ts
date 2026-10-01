import { INotificationRepository } from '../../domain/repositories/notification-repository.interface.js'
import { Notification } from '../../domain/entities/notification.entity.js'

export class PrismaNotificationRepository implements INotificationRepository {
    constructor(private readonly prisma: any) { }

    async findForUser(userId: string, params: { limit?: number; offset?: number; read?: boolean }): Promise<Notification[]> {
        const recipientWhere: any = { UserId: userId }
        if (typeof params.read === 'boolean') {
            recipientWhere.IsRead = params.read
        }

        const list = await (this.prisma as any).notification.findMany({
            where: {
                NotificationRecipient: {
                    some: recipientWhere
                },
                Type: {
                    notIn: ['Reminder', 'DEADLINE_WARNING']
                }
            },
            take: params.limit ?? 50,
            skip: params.offset ?? 0,
            orderBy: { CreatedAt: 'desc' },
            include: {
                NotificationRecipient: {
                    where: { UserId: userId },
                    select: { IsRead: true, ReadAt: true }
                },
                // `CreatedBy` is the lecturer who sent it. Without this the API returned a
                // bare uuid and no client could name the sender.
                User: {
                    select: { Id: true, FullName: true, Avatar: true }
                }
            }
        })

        // Filter out all automatic deadline reminders — only display notifications sent by lecturers
        const filteredList = list.filter((l: any) => {
            const isDeadlineNotif = l.Type === 'Reminder' || l.Type === 'DEADLINE_WARNING';
            if (isDeadlineNotif) return false;
            return true;
        }).slice(0, params.limit ?? 20);

        // Subject + class for the assignment notifications. Nothing on `Notification` records
        // either one, but an ASSIGNMENT row carries `ReferenceId = ExamId`, and an exam knows
        // its subject and the classes it was assigned to (ExamClass) — so both are derivable
        // without touching the schema. Resolved in two extra queries for the whole page, and
        // sequentially: this SQL Server instance accepts one connection, so a Promise.all here
        // fails the request outright.
        const examIds = [
            ...new Set(
                filteredList
                    .filter((l: any) => {
                        const ref = String(l.ReferenceType ?? '').toUpperCase()
                        const typ = String(l.Type ?? '').toUpperCase()
                        return (ref === 'EXAM' || ref === 'ASSIGNMENT' || ref === 'ASSIGNMENT_GRADING' || typ === 'RESUBMISSION') && l.ReferenceId
                    })
                    .map((l: any) => l.ReferenceId as string)
            )
        ]

        // Broadcasts sent to a class carry `ReferenceId = ClassId` (one notification per
        // class — see BroadcastNotificationUseCase), so the class code is a direct lookup.
        const classRefIds = [
            ...new Set(
                filteredList
                    .filter((l: any) => String(l.ReferenceType ?? '').toUpperCase() === 'CLASS' && l.ReferenceId)
                    .map((l: any) => l.ReferenceId as string)
            )
        ]

        const classById = new Map<string, { code: string | null; subjectCode: string | null; subjectName: string | null }>()
        if (classRefIds.length > 0) {
            const classes = await (this.prisma as any).class.findMany({
                where: { Id: { in: classRefIds } },
                select: {
                    Id: true,
                    ClassCode: true,
                    Subject: { select: { SubjectCode: true, SubjectName: true } }
                }
            })
            for (const cl of classes) {
                classById.set(cl.Id, {
                    code: cl.ClassCode ?? null,
                    subjectCode: cl.Subject?.SubjectCode ?? null,
                    subjectName: cl.Subject?.SubjectName ?? null,
                })
            }
        }

        const examById = new Map<string, { subjectCode: string | null; subjectName: string | null; classes: { id: string; code: string | null }[] }>()
        let myClassIds = new Set<string>()

        if (examIds.length > 0) {
            const exams = await (this.prisma as any).exam.findMany({
                where: { Id: { in: examIds } },
                select: {
                    Id: true,
                    Subject: { select: { SubjectCode: true, SubjectName: true } },
                    ExamClass: { select: { Class: { select: { Id: true, ClassCode: true } } } }
                }
            })
            for (const e of exams) {
                examById.set(e.Id, {
                    subjectCode: e.Subject?.SubjectCode ?? null,
                    subjectName: e.Subject?.SubjectName ?? null,
                    classes: (e.ExamClass ?? []).map((ec: any) => ({ id: ec.Class?.Id, code: ec.Class?.ClassCode ?? null })),
                })
            }

            // An exam can target several classes; the reader only cares about the one they are
            // enrolled in, so their own enrolment decides which code is shown.
            const enrolled = await (this.prisma as any).studentClass.findMany({
                where: { UserId: userId },
                select: { ClassId: true }
            })
            myClassIds = new Set(enrolled.map((e: any) => e.ClassId))
        }

        return filteredList.map((l: any) => {
            const notif = Notification.restore(
                l.Id, l.Title, l.Message, l.Type, l.ReferenceId, l.ReferenceType, l.CreatedBy, l.CreatedAt
            )
            const recipient = l.NotificationRecipient?.[0]
            ;(notif as any).isRead = recipient?.IsRead ?? false
            ;(notif as any).read = recipient?.IsRead ?? false

            if (l.User) {
                ;(notif as any).sender = { id: l.User.Id, name: l.User.FullName, avatar: l.User.Avatar ?? null }
            }

            const exam = l.ReferenceId ? examById.get(l.ReferenceId) : undefined
            if (exam) {
                ;(notif as any).subjectCode = exam.subjectCode
                ;(notif as any).subjectName = exam.subjectName
                const mine = exam.classes.find((c) => c.id && myClassIds.has(c.id))
                ;(notif as any).classCode = (mine ?? exam.classes[0])?.code ?? null
            }

            const cls = l.ReferenceId ? classById.get(l.ReferenceId) : undefined
            if (cls) {
                ;(notif as any).classCode = cls.code
                ;(notif as any).subjectCode = cls.subjectCode
                ;(notif as any).subjectName = cls.subjectName
            }

            return notif
        })
    }

    async getById(id: string): Promise<Notification | null> {
        const n = await (this.prisma as any).notification.findUnique({ where: { Id: id } })
        if (!n) return null
        return Notification.restore(n.Id, n.Title, n.Message, n.Type, n.ReferenceId, n.ReferenceType, n.CreatedBy, n.CreatedAt)
    }

    async save(notification: Notification): Promise<void> {
        await (this.prisma as any).notification.upsert({
            where: { Id: notification.id },
            create: {
                Id: notification.id,
                Title: notification.title,
                Message: notification.message,
                Type: notification.type,
                ReferenceId: notification.referenceId,
                ReferenceType: notification.referenceType,
                CreatedBy: notification.createdBy,
                CreatedAt: notification.createdAt
            },
            update: {
                Title: notification.title,
                Message: notification.message
            }
        })
    }

    async markAsRead(userId: string, notificationId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.updateMany({
            where: { UserId: userId, NotificationId: notificationId, IsRead: false },
            data: { IsRead: true, ReadAt: new Date() }
        })
    }

    async markAllAsRead(userId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.updateMany({
            where: { UserId: userId, IsRead: false },
            data: { IsRead: true, ReadAt: new Date() }
        })
    }

    async deleteForUser(userId: string, notificationId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.deleteMany({
            where: { UserId: userId, NotificationId: notificationId }
        })
    }

    async deleteAllForUser(userId: string): Promise<void> {
        await (this.prisma as any).notificationRecipient.deleteMany({
            where: { UserId: userId }
        })
    }
}
