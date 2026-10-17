import { publishNotification } from '../../../shared/infrastructure/publish-notification.js'
import { sseService } from '../../../shared/infrastructure/sse-service.js'
import type { Request, Response } from 'express'
import { CreateClassRequestDto, EnrollStudentRequestDto, UpdateClassNoteDto, UpdateClassRequestDto } from '../application/dtos/class.dto.js'
import { ListClassesUseCase } from '../application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../application/use-cases/enroll-student.use-case.js'
import { UpdateClassNoteUseCase } from '../application/use-cases/update-class-note.use-case.js'
import { UpdateClassUseCase } from '../application/use-cases/update-class.use-case.js'
import { DeleteClassUseCase } from '../application/use-cases/delete-class.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { GetClassCodesBySubjectUseCase } from '../application/use-cases/get-class-codes-by-subject.use-case.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import { prisma } from '../../../database/prisma.js'
import { classEvents } from '../../../shared/infrastructure/events/class-events.js'
import { NodemailerService } from '../../../shared/infrastructure/email/nodemailer.service.js'
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/application/app.error.js'
import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'

export class ClassesController extends BaseController {
  private async assertCanManageAnnouncement(user: { id: string; role: string }, classId?: string | null, creatorId?: string | null) {
    if (user.role.toUpperCase() === 'ADMIN' || creatorId === user.id) return
    const assignment = classId && user.role.toUpperCase() === 'LECTURER'
      ? await prisma.instructorClass.findFirst({ where: { UserId: user.id, ClassId: classId }, select: { UserId: true } })
      : null
    if (!assignment) throw new ForbiddenError('Bạn chỉ được quản lý thông báo của lớp mình phụ trách')
  }
  constructor(
    private readonly listClassesUseCase: ListClassesUseCase,
    private readonly createClassUseCase: CreateClassUseCase,
    private readonly getClassStudentsUseCase: GetClassStudentsUseCase,
    private readonly enrollStudentUseCase: EnrollStudentUseCase,
    private readonly updateClassNoteUseCase: UpdateClassNoteUseCase,
    private readonly updateClassUseCase: UpdateClassUseCase,
    private readonly deleteClassUseCase: DeleteClassUseCase,
    private readonly getClassCodesBySubjectUseCase: GetClassCodesBySubjectUseCase,
    private readonly logger: ILogger
  ) {
    super()
  }

  async list(req: Request, res: Response): Promise<void> {
    this.logger.info(`Fetching classes for user ${req.user!.id}`)
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const cacheKey = `classes_list_${req.user!.id}_${req.user!.role}_${page}_${limit}`
    const cached = memoryCache.get(cacheKey)
    if (cached) {
      this.ok(res, cached, MESSAGES.CLASS_LIST_SUCCESS)
      return
    }
    const result = await this.listClassesUseCase.execute({ user: req.user!, page, limit })
    memoryCache.set(cacheKey, result, 60)
    this.ok(res, result, MESSAGES.CLASS_LIST_SUCCESS)
  }

  async create(req: Request, res: Response): Promise<void> {
    this.logger.info(`Creating new class`)
    memoryCache.invalidatePrefix('classes_')
    const dto = CreateClassRequestDto.from(req.body)
    if (req.user!.role === 'LECTURER') {
      dto.data.lecturerId = req.user!.id
    }
    const result = await this.createClassUseCase.execute(dto)
    this.created(res, result, MESSAGES.CLASS_CREATE_SUCCESS)
  }

  async getById(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Fetching class ${classId}`)
    const cacheKey = `class_detail_${classId}_${req.user?.role}`
    const cached = memoryCache.get(cacheKey)
    if (cached) {
      this.ok(res, cached, MESSAGES.SUCCESS)
      return
    }
    const raw = await prisma.class.findUnique({
      where: { Id: classId },
      include: {
        InstructorClass: { include: { User: true } },
        Subject: true,
        Semester: true,
        _count: { select: { StudentClass: true } }
      }
    })
    if (!raw) {
      throw new NotFoundError('Lớp học không tồn tại')
    }
    const { ClassMapper } = await import('../infrastructure/mappers/class.mapper.js')
    const { ClassResponseDto } = await import('../application/dtos/class.dto.js')
    const domainClass = ClassMapper.toDomain(raw)
    const isInstructorOrAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'LECTURER'
    const result = ClassResponseDto.from(domainClass, isInstructorOrAdmin)
    memoryCache.set(cacheKey, result, 25)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async getStudents(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Fetching students for class ${classId}`)
    const cacheKey = `class_students_${classId}`
    const cached = memoryCache.get(cacheKey)
    if (cached) {
      this.ok(res, cached, MESSAGES.SUCCESS)
      return
    }
    const result = await this.getClassStudentsUseCase.execute(classId)
    memoryCache.set(cacheKey, result, 20)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async enroll(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Enrolling student to class ${classId}`)
    memoryCache.invalidatePrefix('classes_')
    memoryCache.del(`class_students_${classId}`)
    memoryCache.del(`class_detail_${classId}`)
    const dto = EnrollStudentRequestDto.from(req.body)
    const result = await this.enrollStudentUseCase.execute({ classId, dto, user: req.user! })
    this.created(res, result, MESSAGES.SUCCESS)
  }

  async updateNote(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Updating note for class ${classId}`)
    memoryCache.invalidatePrefix('classes_')
    const dto = UpdateClassNoteDto.from(req.body)
    const result = await this.updateClassNoteUseCase.execute({ classId, dto, user: req.user! })
    this.ok(res, result, MESSAGES.CLASS_NOTE_UPDATED)
  }

  async update(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Updating class ${classId}`)
    memoryCache.invalidatePrefix('classes_')
    const dto = UpdateClassRequestDto.from(req.body)
    const result = await this.updateClassUseCase.execute({ classId, dto })
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async delete(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`Deleting class ${classId}`)
    memoryCache.invalidatePrefix('classes_')
    await this.deleteClassUseCase.execute(classId)
    this.ok(res, null, MESSAGES.SUCCESS)
  }

  async listClassCodes(req: Request, res: Response): Promise<void> {
    const semesterCode = req.query.semesterCode as string | undefined
    const subjectCode = req.query.subjectCode as string | undefined

    const cacheKey = `class_codes_${semesterCode || 'all'}_${subjectCode || 'all'}`
    const cached = memoryCache.get(cacheKey)
    if (cached) {
      this.ok(res, cached, MESSAGES.SUCCESS)
      return
    }

    this.logger.info(`Fetching class codes for semester=${semesterCode}, subject=${subjectCode}`)

    const where: any = {}

    if (semesterCode) {
      const semester = await prisma.semester.findFirst({ where: { Code: semesterCode } })
      if (semester) where.SemesterId = semester.Id
    }

    if (subjectCode) {
      const subject = await prisma.subject.findFirst({ where: { SubjectCode: subjectCode } })
      if (subject) where.SubjectId = subject.Id
    }

    const classes = await (prisma as any).class.findMany({
      where,
      select: {
        Id: true,
        ClassCode: true,
        _count: { select: { StudentClass: true } }
      },
      orderBy: { ClassCode: 'asc' }
    })

    // Deduplicate by ClassCode — keep first occurrence (DB may have multiple records with same code)
    const seenCodes = new Set<string>()
    const result = classes
      .filter((c: any) => {
        if (!c.ClassCode || seenCodes.has(c.ClassCode)) return false
        seenCodes.add(c.ClassCode)
        return true
      })
      .map((c: any) => ({
        classId: c.Id,
        classCode: c.ClassCode,
        studentCount: c._count?.StudentClass || 0
      }))

    memoryCache.set(cacheKey, result, 90)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  async listSubjectsBySemester(req: Request, res: Response): Promise<void> {
    const semesterCode = req.query.semesterCode as string | undefined

    this.logger.info(`Fetching subjects for semester=${semesterCode}`)

    const where: any = {}
    if (semesterCode) {
      const semester = await prisma.semester.findFirst({ where: { Code: semesterCode } })
      if (semester) where.SemesterId = semester.Id
    }

    const classes = await (prisma as any).class.findMany({
      where,
      select: { Subject: { select: { Id: true, SubjectCode: true, SubjectName: true } } },
      distinct: ['SubjectId']
    })

    const subjects = classes
      .map((c: any) => c.Subject)
      .filter((s: any) => s !== null)

    this.ok(res, subjects, MESSAGES.SUCCESS)
  }

  async getClassCodesBySubject(req: Request, res: Response): Promise<void> {
    const subjectId = req.params.subjectId as string
    if (!subjectId) {
      throw new Error('SubjectId is required')
    }
    this.logger.info(`Fetching class codes for subject ${subjectId}`)
    const result = await this.getClassCodesBySubjectUseCase.execute(subjectId)
    this.ok(res, result, MESSAGES.SUCCESS)
  }

  private async resolveTargetRefIds(classId: string): Promise<{ targetRefIds: string[], classCode: string, subjectCode: string, cls: any, subject: any }> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = uuidRegex.test(classId)
    const targetRefIds: string[] = [classId]

    let cls: any = null
    let subject: any = null
    let relatedClasses: any[] = []

    try {
      const classOrConditions: any[] = [{ ClassCode: classId }]
      if (isUuid) {
        classOrConditions.push({ Id: classId }, { SubjectId: classId }, { ExamClass: { some: { ExamId: classId } } })
      }

      cls = await prisma.class.findFirst({
        where: { OR: classOrConditions },
        include: {
          Subject: true,
          StudentClass: {
            include: {
              User: {
                select: { Id: true, Email: true, FullName: true }
              }
            }
          }
        }
      })
    } catch (e) {
      this.logger.warn(`[resolveTargetRefIds] Error querying class for ${classId}: ${e}`)
    }

    try {
      const subjectOrConditions: any[] = [{ SubjectCode: classId }]
      if (isUuid) {
        subjectOrConditions.push({ Id: classId })
      }

      subject = await prisma.subject.findFirst({
        where: { OR: subjectOrConditions }
      })
    } catch (e) {
      this.logger.warn(`[resolveTargetRefIds] Error querying subject for ${classId}: ${e}`)
    }

    if (cls?.Id && !targetRefIds.includes(cls.Id)) targetRefIds.push(cls.Id)
    if (cls?.SubjectId && !targetRefIds.includes(cls.SubjectId)) targetRefIds.push(cls.SubjectId)
    if (cls?.ClassCode && !targetRefIds.includes(cls.ClassCode)) targetRefIds.push(cls.ClassCode)
    if (cls?.Subject?.SubjectCode && !targetRefIds.includes(cls.Subject.SubjectCode)) targetRefIds.push(cls.Subject.SubjectCode)

    if (subject?.Id && !targetRefIds.includes(subject.Id)) targetRefIds.push(subject.Id)
    if (subject?.SubjectCode && !targetRefIds.includes(subject.SubjectCode)) targetRefIds.push(subject.SubjectCode)

    try {
      const relatedOrConditions: any[] = [{ ClassCode: classId }]
      if (isUuid) {
        relatedOrConditions.push({ Id: classId }, { SubjectId: classId })
      }
      if (cls?.SubjectId) {
        relatedOrConditions.push({ SubjectId: cls.SubjectId })
      }
      if (subject?.Id) {
        relatedOrConditions.push({ SubjectId: subject.Id })
      }

      relatedClasses = await prisma.class.findMany({
        where: { OR: relatedOrConditions }
      })
      for (const rc of relatedClasses) {
        if (rc.Id && !targetRefIds.includes(rc.Id)) targetRefIds.push(rc.Id)
        if (rc.SubjectId && !targetRefIds.includes(rc.SubjectId)) targetRefIds.push(rc.SubjectId)
        if (rc.ClassCode && !targetRefIds.includes(rc.ClassCode)) targetRefIds.push(rc.ClassCode)
      }
    } catch (e) {
      this.logger.warn(`[resolveTargetRefIds] Error querying related classes for ${classId}: ${e}`)
    }

    const classCode = cls?.ClassCode || subject?.SubjectCode || relatedClasses[0]?.ClassCode || ''
    const subjectCode = cls?.Subject?.SubjectCode || subject?.SubjectCode || ''

    return { targetRefIds, classCode, subjectCode, cls, subject }
  }

  async listAnnouncements(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    this.logger.info(`[listAnnouncements] classId=${classId}`)

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = uuidRegex.test(classId)

    // Step 1: Try to find the Class record
    let cls: any = null
    try {
      const classOrConditions: any[] = [{ ClassCode: classId }]
      if (isUuid) {
        classOrConditions.push({ Id: classId }, { SubjectId: classId }, { ExamClass: { some: { ExamId: classId } } })
      }
      cls = await prisma.class.findFirst({
        where: { OR: classOrConditions },
        include: { Subject: true }
      })
    } catch (e) {
      this.logger.warn(`[listAnnouncements] Error querying class for ${classId}: ${e}`)
    }

    // Step 2: Build targetRefIds — ONLY include valid UUIDs!
    // IMPORTANT: ReferenceId is SQL Server UniqueIdentifier (UUID-only).
    const refIdSet = new Set<string>()
    const addUuid = (v: string | null | undefined) => { if (v && uuidRegex.test(v)) refIdSet.add(v) }
    if (isUuid) addUuid(classId)
    addUuid(cls?.Id)
    addUuid(cls?.SubjectId)
    addUuid(cls?.Subject?.Id)
    const targetRefIds = Array.from(refIdSet)

    this.logger.info(`[listAnnouncements] targetRefIds=${JSON.stringify(targetRefIds)}`)

    // Step 3: Query notifications — match ReferenceId exactly as stored
    let rows: any[] = []
    if (targetRefIds.length > 0) {
      rows = await prisma.notification.findMany({
        where: {
          ReferenceId: { in: targetRefIds },
          Type: { in: ['CLASS_ANNOUNCEMENT', 'CLASS', 'Announcement', 'ANNOUNCEMENT'] }
        },
        include: {
          User: {
            select: {
              Id: true,
              FullName: true,
              Email: true,
              Avatar: true
            }
          }
        },
        orderBy: { CreatedAt: 'desc' },
        take: 50
      })
    }

    this.logger.info(`[listAnnouncements] found ${rows.length} rows`)

    const announcements = rows.map(r => ({
      id: r.Id,
      title: r.Title || 'Thông báo lớp học',
      content: r.Message,
      createdAt: r.CreatedAt,
      lecturer: {
        id: r.User?.Id || r.CreatedBy,
        name: r.User?.FullName || 'Giảng viên',
        email: r.User?.Email || '',
        avatar: r.User?.Avatar || null
      }
    }))

    this.ok(res, announcements, MESSAGES.SUCCESS)
  }

  async createAnnouncement(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    const userId = req.user!.id
    const { title, content } = req.body

    if (!content || !content.trim()) {
      throw new ValidationError('Nội dung thông báo không được để trống')
    }

    const { targetRefIds, classCode, subjectCode, cls, subject } = await this.resolveTargetRefIds(classId)

    const notifTitle = title?.trim() || `Thông báo lớp ${classCode || 'học'}`
    await this.assertCanManageAnnouncement(req.user!, cls?.Id)

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validReferenceId = cls?.Id || (uuidRegex.test(classId) ? classId : null)

    const notif = await prisma.notification.create({
      data: {
        Title: notifTitle,
        Message: content.trim(),
        Type: 'CLASS_ANNOUNCEMENT',
        ReferenceId: validReferenceId,
        ReferenceType: 'CLASS',
        CreatedBy: userId,
        CreatedAt: new Date()
      },
      include: {
        User: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
            Avatar: true
          }
        }
      }
    })

    // Find student recipients
    let studentUsers = (cls?.StudentClass || []).map((sc: any) => sc.User).filter(Boolean)
    if (studentUsers.length === 0 && !cls && subject?.Id) {
      studentUsers = await prisma.user.findMany({
        where: {
          StudentClass: { some: { Class: { SubjectId: subject.Id } } }
        },
        select: { Id: true, Email: true, FullName: true }
      })
    }

    const studentUserIds = [...new Set(studentUsers.map((u: any) => u!.Id))]
    const validEmails = [...new Set(studentUsers.map((u: any) => u!.Email).filter(Boolean))] as string[]

    if (studentUserIds.length > 0) {
      try {
        await prisma.notificationRecipient.createMany({
          data: studentUserIds.map((sId: any) => ({
            NotificationId: notif.Id,
            UserId: sId,
            IsRead: false
          }))
        })
        publishNotification(studentUserIds as string[], notif)
      } catch (recipErr) {
        this.logger.warn(`[createAnnouncement] Failed creating recipients: ${recipErr}`)
      }
    }

    const lecturerName = notif.User?.FullName || (req.user as any)?.name || 'Giảng viên'
    const subjectName = cls?.Subject?.SubjectName || subject?.SubjectName || ''
    const subjectLabel = subjectCode && subjectName ? `${subjectName} (${subjectCode})` : (subjectCode || subjectName || 'môn học')

    const announcementDto = {
      id: notif.Id,
      title: notif.Title,
      content: notif.Message,
      createdAt: notif.CreatedAt,
      classId: classId,
      classCode: classCode,
      subjectCode: subjectCode,
      lecturer: {
        id: notif.User?.Id || userId,
        name: lecturerName,
        email: notif.User?.Email || (req.user as any)?.email || '',
        avatar: notif.User?.Avatar || null
      }
    }

    // 1. Broadcast Realtime SSE event across all associated identifiers
    try {
      for (const refId of targetRefIds) {
        classEvents.emit(`class_announcement:${refId}`, announcementDto)
      }
    } catch (broadcastErr) {
      this.logger.warn(`[createAnnouncement] Broadcast event error: ${broadcastErr}`)
    }

    // 2. Send email notification to all students in this class
    if (validEmails.length > 0) {
      const webUrl = (process.env.FRONTEND_URL || 'https://feaita.edubridge.edu.vn').replace(/\/$/, '')
      const emailSubject = `[AITA] Thông báo mới lớp ${classCode} - Môn ${subjectCode || subjectName}`
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="color: #ea580c; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AITA Platform</h2>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Hệ thống Hỗ trợ Đào tạo & Chấm điểm Tự động</p>
          </div>

          <p style="font-size: 15px; color: #334155; margin-top: 0;">Xin chào các bạn sinh viên lớp <strong>${classCode}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Giảng viên <strong>${lecturerName}</strong> vừa đăng một thông báo mới trên bảng tin lớp học:</p>

          <div style="background-color: #fff7ed; padding: 18px 20px; border-radius: 12px; border-left: 5px solid #ea580c; margin: 20px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #c2410c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
              Lớp: ${classCode} • Môn: ${subjectLabel}
            </div>
            <div style="font-size: 15px; color: #1e293b; line-height: 1.6; white-space: pre-wrap; font-weight: 500;">${content.trim()}</div>
          </div>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${webUrl}/student/classes/${classId}" style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
              👉 Xem bảng tin lớp học trên AITA
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
            Email này được gửi tự động từ hệ thống AITA Platform. Vui lòng không trả lời trực tiếp email này.
          </p>
        </div>
      `

      try {
        const emailService = new NodemailerService()
        emailService.sendEmail(validEmails, emailSubject, emailHtml).catch(err => {
          console.error(`[ClassesController] Lỗi gửi email thông báo:`, err)
        })
      } catch (emailErr) {
        console.error(`[ClassesController] Lỗi email service:`, emailErr)
      }
    }

    this.created(res, announcementDto, 'Đã đăng thông báo thành công')
  }

  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    const announcementId = req.params.announcementId as string
    const userId = req.user!.id
    const userRole = (req.user!.role || '').toUpperCase()
    const { title, content } = req.body

    if (!content || !content.trim()) {
      throw new ValidationError('Nội dung thông báo không được để trống')
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(announcementId)) {
      throw new NotFoundError('Thông báo không tồn tại')
    }

    const notif = await prisma.notification.findUnique({
      where: { Id: announcementId },
      include: {
        User: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
            Avatar: true
          }
        }
      }
    })

    if (!notif) {
      throw new NotFoundError('Thông báo không tồn tại')
    }

    const isOwner = notif.CreatedBy && userId && notif.CreatedBy.toLowerCase() === userId.toLowerCase()
    const isPrivileged = userRole === 'ADMIN'

    if (!isPrivileged && !isOwner) {
      await this.assertCanManageAnnouncement(req.user!, notif.ReferenceId, notif.CreatedBy)
    }

    const updated = await prisma.notification.update({
      where: { Id: announcementId },
      data: {
        Title: title?.trim() || notif.Title,
        Message: content.trim(),
      },
      include: {
        User: {
          select: {
            Id: true,
            FullName: true,
            Email: true,
            Avatar: true
          }
        }
      }
    })

    const { targetRefIds, classCode, subjectCode, cls, subject } = await this.resolveTargetRefIds(notif.ReferenceId || classId)

    // 1. Find student recipients for system notifications & email
    let studentUsers = (cls?.StudentClass || []).map((sc: any) => sc.User).filter(Boolean)
    if (studentUsers.length === 0 && !cls && subject?.Id) {
      studentUsers = await prisma.user.findMany({
        where: {
          StudentClass: { some: { Class: { SubjectId: subject.Id } } }
        },
        select: { Id: true, Email: true, FullName: true }
      })
    }

    const studentUserIds = [...new Set(studentUsers.map((u: any) => u!.Id))]
    const validEmails = [...new Set(studentUsers.map((u: any) => u!.Email).filter(Boolean))] as string[]

    // 2. Update/Create system notification recipients (mark as unread so badge shows)
    if (studentUserIds.length > 0) {
      try {
        await prisma.notificationRecipient.updateMany({
          where: { NotificationId: announcementId, UserId: { in: studentUserIds as string[] } },
          data: { IsRead: false, ReadAt: null }
        })

        const existingRecipients = await prisma.notificationRecipient.findMany({
          where: { NotificationId: announcementId },
          select: { UserId: true }
        })
        const existingUserIds = new Set(existingRecipients.map((r: any) => r.UserId))
        const missingUserIds = studentUserIds.filter((sId: any) => !existingUserIds.has(sId))

        if (missingUserIds.length > 0) {
          await prisma.notificationRecipient.createMany({
            data: missingUserIds.map((sId: any) => ({
              NotificationId: announcementId,
              UserId: sId,
              IsRead: false
            }))
          })
        }
        publishNotification(studentUserIds as string[], updated, true)
      } catch (recipErr) {
        this.logger.warn(`[updateAnnouncement] Failed updating notification recipients: ${recipErr}`)
      }
    }

    const lecturerName = updated.User?.FullName || (req.user as any)?.fullName || (req.user as any)?.name || 'Giảng viên'
    const subjectName = cls?.Subject?.SubjectName || subject?.SubjectName || ''
    const subjectLabel = subjectCode && subjectName ? `${subjectName} (${subjectCode})` : (subjectCode || subjectName || 'môn học')

    const announcementDto = {
      id: updated.Id,
      title: updated.Title,
      content: updated.Message,
      createdAt: updated.CreatedAt,
      classId: classId,
      classCode: classCode,
      subjectCode: subjectCode,
      lecturer: {
        id: updated.User?.Id || userId,
        name: lecturerName,
        email: updated.User?.Email || (req.user as any)?.email || '',
        avatar: updated.User?.Avatar || null
      }
    }

    // 3. Broadcast Realtime SSE event across all associated identifiers
    try {
      for (const refId of targetRefIds) {
        classEvents.emit(`class_announcement_updated:${refId}`, announcementDto)
      }
    } catch (e) {
      this.logger.warn(`[updateAnnouncement] Failed to broadcast event: ${e}`)
      classEvents.emit(`class_announcement_updated:${classId}`, announcementDto)
    }

    // 4. Send email notification via Gmail/Nodemailer to all students
    if (validEmails.length > 0) {
      const webUrl = (process.env.FRONTEND_URL || 'https://feaita.edubridge.edu.vn').replace(/\/$/, '')
      const emailSubject = `[AITA] [Cập nhật] Thông báo lớp ${classCode} - Môn ${subjectCode || subjectName}`
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="color: #ea580c; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">AITA Platform</h2>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">Hệ thống Hỗ trợ Đào tạo & Chấm điểm Tự động</p>
          </div>

          <p style="font-size: 15px; color: #334155; margin-top: 0;">Xin chào các bạn sinh viên lớp <strong>${classCode}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Giảng viên <strong>${lecturerName}</strong> vừa <strong>chỉnh sửa và cập nhật</strong> thông báo trên bảng tin lớp học:</p>

          <div style="background-color: #fff7ed; padding: 18px 20px; border-radius: 12px; border-left: 5px solid #ea580c; margin: 20px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #c2410c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
              [CẬP NHẬT] Lớp: ${classCode} • Môn: ${subjectLabel}
            </div>
            <div style="font-size: 15px; color: #1e293b; line-height: 1.6; white-space: pre-wrap; font-weight: 500;">${content.trim()}</div>
          </div>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${webUrl}/student/classes/${classId}" style="display: inline-block; background-color: #ea580c; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
              👉 Xem bảng tin lớp học trên AITA
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
            Email này được gửi tự động từ hệ thống AITA Platform khi giảng viên cập nhật thông báo. Vui lòng không trả lời trực tiếp email này.
          </p>
        </div>
      `

      try {
        const emailService = new NodemailerService()
        emailService.sendEmail(validEmails, emailSubject, emailHtml).catch(err => {
          console.error(`[ClassesController] Lỗi gửi email cập nhật thông báo:`, err)
        })
      } catch (emailErr) {
        console.error(`[ClassesController] Lỗi email service:`, emailErr)
      }
    }

    this.ok(res, announcementDto, 'Đã cập nhật thông báo thành công')
  }

  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string
    const announcementId = req.params.announcementId as string
    const userId = req.user!.id
    const userRole = (req.user!.role || '').toUpperCase()

    this.logger.info(`[deleteAnnouncement] classId=${classId}, announcementId=${announcementId}, userId=${userId}, userRole=${userRole}`)

    if (!announcementId) {
      this.ok(res, null, MESSAGES.SUCCESS)
      return
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(announcementId)) {
      this.ok(res, null, MESSAGES.SUCCESS)
      return
    }

    const notif = await prisma.notification.findUnique({
      where: { Id: announcementId }
    })

    if (!notif) {
      this.ok(res, null, MESSAGES.SUCCESS)
      return
    }

    // Role check: ADMIN and LECTURER managing this class or the creator can delete
    const isOwner = notif.CreatedBy && userId && notif.CreatedBy.toLowerCase() === userId.toLowerCase()
    const isPrivileged = userRole === 'ADMIN'

    if (!isPrivileged && !isOwner) {
      await this.assertCanManageAnnouncement(req.user!, notif.ReferenceId, notif.CreatedBy)
    }

    const recipients = await prisma.notificationRecipient.findMany({ where: { NotificationId: announcementId }, select: { UserId: true } })
    await prisma.$transaction([
      prisma.notificationRecipient.deleteMany({ where: { NotificationId: announcementId } }),
      prisma.notification.delete({ where: { Id: announcementId } }),
    ])
    for (const recipient of recipients) {
      if (recipient.UserId) sseService.push(recipient.UserId, { type: 'NOTIFICATION_DELETED', payload: { notificationId: announcementId } })
    }

    // 3. Emit realtime event
    try {
      const { targetRefIds } = await this.resolveTargetRefIds(classId)
      for (const refId of targetRefIds) {
        classEvents.emit(`class_announcement_deleted:${refId}`, { announcementId })
      }
    } catch (e) {
      this.logger.warn(`[deleteAnnouncement] Failed to broadcast deletion event: ${e}`)
      classEvents.emit(`class_announcement_deleted:${classId}`, { announcementId })
    }

    this.ok(res, null, 'Đã xoá thông báo thành công')
  }

  async streamAnnouncements(req: Request, res: Response): Promise<void> {
    const classId = req.params.id as string

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', classId })}\n\n`)

    const onNewAnnouncement = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'NEW_ANNOUNCEMENT', data })}\n\n`)
      } catch (e) { }
    }

    const onUpdateAnnouncement = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'UPDATE_ANNOUNCEMENT', data })}\n\n`)
      } catch (e) { }
    }

    const onDeleteAnnouncement = (data: any) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'DELETE_ANNOUNCEMENT', data })}\n\n`)
      } catch (e) { }
    }

    classEvents.on(`class_announcement:${classId}`, onNewAnnouncement)
    classEvents.on(`class_announcement_updated:${classId}`, onUpdateAnnouncement)
    classEvents.on(`class_announcement_deleted:${classId}`, onDeleteAnnouncement)

    // Keepalive ping every 25 seconds
    const keepAliveTimer = setInterval(() => {
      try {
        res.write(`: keepalive\n\n`)
      } catch (e) {
        clearInterval(keepAliveTimer)
      }
    }, 25000)

    req.on('close', () => {
      clearInterval(keepAliveTimer)
      classEvents.removeListener(`class_announcement:${classId}`, onNewAnnouncement)
      classEvents.removeListener(`class_announcement_updated:${classId}`, onUpdateAnnouncement)
      classEvents.removeListener(`class_announcement_deleted:${classId}`, onDeleteAnnouncement)
    })
  }
}
