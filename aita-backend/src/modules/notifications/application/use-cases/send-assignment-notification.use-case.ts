import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { logger } from '../../../../shared/infrastructure/logger.js'

const prisma = new PrismaClient()

export interface SendAssignmentNotificationParams {
    examId: string
    title: string
    type: string
    classIds?: string[]
    subjectId?: string
    dueDate?: string | Date
    createdBy: string
    isUpdate?: boolean
    filterUnsubmittedOnly?: boolean
}

export class SendAssignmentNotificationUseCase {
    constructor(private readonly emailService: IEmailService) { }

    async execute(params: SendAssignmentNotificationParams) {
        try {
            // 1. Fetch Exam and Subject details if available
            const exam = await prisma.exam.findUnique({
                where: { Id: params.examId },
                include: {
                    Subject: true,
                    ExamClass: true
                }
            })

            const subjectId = params.subjectId || exam?.SubjectId
            const subject = subjectId
                ? (exam?.Subject || await prisma.subject.findUnique({ where: { Id: subjectId } }))
                : null

            const subjectCode = subject?.SubjectCode || ''
            const subjectName = subject?.SubjectName || ''

            // Resolve DueDate from params, Exam, or ExamClass
            const rawDueDate = params.dueDate || exam?.DueDate || exam?.ExamClass?.[0]?.DueDate
            let formattedDueDate = ''
            if (rawDueDate) {
                const dt = new Date(rawDueDate)
                if (!isNaN(dt.getTime())) {
                    const hours = String(dt.getHours()).padStart(2, '0')
                    const minutes = String(dt.getMinutes()).padStart(2, '0')
                    const day = String(dt.getDate()).padStart(2, '0')
                    const month = String(dt.getMonth() + 1).padStart(2, '0')
                    const year = dt.getFullYear()
                    formattedDueDate = `${hours}:${minutes} ngày ${day}/${month}/${year}`
                }
            }

            // 2. Resolve target classIds
            let targetClassIds = params.classIds || []
            if (targetClassIds.length === 0 && exam?.ExamClass && exam.ExamClass.length > 0) {
                targetClassIds = exam.ExamClass.map(ec => ec.ClassId).filter(Boolean) as string[]
            }

            let students: any[] = []

            if (targetClassIds.length > 0) {
                const studentClasses = await prisma.studentClass.findMany({
                    where: { ClassId: { in: targetClassIds } },
                    include: { User: true }
                })
                const uniqueStudentsMap = new Map<string, any>()
                for (const sc of studentClasses) {
                    if (sc.User) {
                        uniqueStudentsMap.set(sc.UserId, sc.User)
                    }
                }
                students = Array.from(uniqueStudentsMap.values())
            }

            if (students.length === 0) {
                logger.warn(`SendAssignmentNotificationUseCase: No enrolled students found in target classes for exam ${params.examId}. Notification skipped.`)
                return
            }

            // 2.1 Lọc chỉ gửi cho sinh viên CHƯA nộp bài nếu filterUnsubmittedOnly = true
            if (params.filterUnsubmittedOnly) {
                const submittedRecords = await prisma.submission.findMany({
                    where: {
                        ExamId: params.examId,
                        NOT: {
                            ReportData: { contains: '"isAutoZero":true' }
                        },
                        ZipFileUrl: { not: null }
                    },
                    select: { StudentId: true }
                })
                const submittedStudentIds = new Set(submittedRecords.map(s => s.StudentId))
                students = students.filter(student => !submittedStudentIds.has(student.Id))

                if (students.length === 0) {
                    logger.info(`SendAssignmentNotificationUseCase: All students have already submitted for exam ${params.examId}. No update notification needed.`)
                    return
                }
            }

            // 3. Format Notification Title and Message with clear Subject, Exam Title & Deadline
            const isUpdate = !!params.isUpdate
            const subjectLabel = subjectCode && subjectName
                ? `${subjectName} (${subjectCode})`
                : (subjectCode || subjectName || 'môn học')

            const isExamType = params.type === 'Exam' || params.type === 'Đề thi'
            const itemTypeLabel = isExamType ? 'đề thi' : 'bài tập'
            const deadlineText = formattedDueDate ? ` (Hạn nộp: ${formattedDueDate})` : ''

            const notifTitle = isUpdate
                ? (subjectCode ? `[${subjectCode}] Cập nhật hạn nộp: ${params.title}` : `Cập nhật hạn nộp: ${params.title}`)
                : (subjectCode ? `[${subjectCode}] Bài tập mới: ${params.title}` : `Bài tập mới: ${params.title}`)

            const notifMessage = isUpdate
                ? `Môn ${subjectLabel}: Giảng viên vừa cập nhật hạn nộp mới cho ${itemTypeLabel} "${params.title}" đến ${formattedDueDate || 'thời gian mới'}. Vui lòng nhấp vào đây để xem chi tiết và nộp bài.`
                : `Môn ${subjectLabel}: Giảng viên vừa đăng ${itemTypeLabel} "${params.title}"${deadlineText}. Vui lòng nhấp vào đây để xem chi tiết và nộp bài.`

            // 4. Create In-App Notification
            const notificationId = uuidv4()
            await prisma.notification.create({
                data: {
                    Id: notificationId,
                    Title: notifTitle,
                    Message: notifMessage,
                    Type: isUpdate ? 'DEADLINE' : 'ASSIGNMENT',
                    ReferenceId: params.examId,
                    ReferenceType: 'EXAM',
                    CreatedBy: params.createdBy,
                    CreatedAt: new Date(),
                }
            })

            // 5. Create Recipients
            const recipients = students.map(student => ({
                NotificationId: notificationId,
                UserId: student.Id,
                IsRead: false
            }))

            await prisma.notificationRecipient.createMany({
                data: recipients
            })

            // 6. Send Emails asynchronously with direct redirect link
            const webUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
            const assignmentLink = `${webUrl}/student/assignments/${params.examId}`

            const emailHtml = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #2563eb; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">AITA SUPPORT PLATFORM</h2>
                    </div>
                    
                    <h3 style="color: #0f172a; margin-top: 0; font-size: 16px;">Xin chào sinh viên,</h3>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        ${isUpdate 
                            ? `Giảng viên vừa <strong>cập nhật thời hạn nộp bài mới</strong> cho bài tập <strong>${params.title}</strong> trên hệ thống AITA:` 
                            : `Bạn nhận được thông báo bài tập mới trên hệ thống <strong>AITA</strong>:`}
                    </p>
                    
                    <div style="background-color: #f8fafc; padding: 18px; border-radius: 12px; border-left: 4px solid ${isUpdate ? '#f59e0b' : '#3b82f6'}; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; color: #334155; font-size: 14px;"><strong>Môn học:</strong> ${subjectLabel}</p>
                        <p style="margin: 0 0 10px 0; color: #334155; font-size: 14px;"><strong>Tên ${itemTypeLabel}:</strong> ${params.title}</p>
                        ${formattedDueDate ? `<p style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px;"><strong>Hạn nộp mới (Deadline):</strong> ${formattedDueDate}</p>` : ''}
                        ${isUpdate ? `<p style="margin: 0; color: #d97706; font-size: 13px; font-weight: 600;">⚠️ Ghi chú: Bạn chưa nộp bài tập này, vui lòng hoàn thành trước thời hạn mới.</p>` : ''}
                    </div>

                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${assignmentLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 32px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                            Truy cập bài tập và nộp bài →
                        </a>
                    </div>

                    <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 16px;">
                        Nếu nút bấm trên không hoạt động, bạn có thể copy và truy cập đường link trực tiếp sau:<br>
                        <a href="${assignmentLink}" style="color: #2563eb; word-break: break-all;">${assignmentLink}</a>
                    </p>

                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
                        Email này được gửi tự động từ Hệ thống AITA Platform. Vui lòng không trả lời trực tiếp email này.
                    </p>
                </div>
            `

            const emailSubject = `[AITA] ${notifTitle}`
            const validEmails = students.map(s => s.Email).filter(Boolean) as string[]
            if (validEmails.length > 0) {
                this.emailService.sendEmail(validEmails, emailSubject, emailHtml).catch(err => {
                    logger.error(`Failed to send bulk email for exam ${params.examId}: ${err.message}`)
                })
            }

            logger.info(`Assignment notification sent to ${students.length} students for exam ${params.examId} (isUpdate: ${isUpdate})`)

        } catch (error: any) {
            logger.error(`SendAssignmentNotificationUseCase error: ${error.message}`)
        }
    }
}

