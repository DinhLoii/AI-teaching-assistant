import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { IHashService } from '../../../../shared/application/ports/i-hash-service.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { CreateUserDto, UserResponseDto } from '../dtos/user.dto.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { User, type UserRoleType } from '../../../auth/domain/entities/user.entity.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class CreateUserUseCase implements IUseCase<CreateUserDto, UserResponseDto> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly uow: IUnitOfWork,
        private readonly hashService: IHashService,
        private readonly logger: ILogger,
        private readonly emailService?: IEmailService
    ) { }

    async execute(dto: CreateUserDto): Promise<UserResponseDto> {
        this.logger.info(`Creating user with email: ${dto.email}`)
        
        const existing = await this.userRepo.findByEmail(dto.email)
        if (existing) {
            this.logger.warn(`Failed to create user. Email already exists: ${dto.email}`)
            throw new ConflictError(MESSAGES.USER_EMAIL_EXISTS)
        }

        const passwordHash = await this.hashService.hash(dto.password)
        const role = dto.role as UserRoleType

        const createdUserDto = await this.uow.runInTransaction(async (txUow) => {
            const txUserRepo = txUow.resolve<IUserRepository>(TOKENS.UserRepository)

            const user = User.create(
                randomUUID(),
                dto.email.toLowerCase(),
                dto.fullName,
                passwordHash,
                role
            )
            if (dto.avatar) {
                user.avatar = dto.avatar
            }
            if (dto.studentCode) {
                user.studentCode = dto.studentCode.trim()
            }
            if (dto.lecturerCode) {
                user.lecturerCode = dto.lecturerCode.trim()
            }
            if (dto.phone) {
                user.phone = dto.phone.trim()
            }

            await txUserRepo.create(user)

            const roleInfo = await txUserRepo.findRoleByName(role)
            if (roleInfo) {
                await txUserRepo.assignRole(user.id, roleInfo.id)
            } else {
                this.logger.warn(`Role not found in DB: ${role}`)
            }

            // If classIds provided, assign to classes within the transaction
            if (dto.classIds && dto.classIds.length > 0) {
                const txPrisma: any = (txUow as any).getClient?.() || (await import('../../../../database/prisma.js')).prisma
                if (role === 'LECTURER') {
                    for (const classId of dto.classIds) {
                        try {
                            const classExists = await txPrisma.class.findUnique({ where: { Id: classId } })
                            if (!classExists) continue

                            const existing = await txPrisma.instructorClass.findUnique({
                                where: { UserId_ClassId: { UserId: user.id, ClassId: classId } }
                            })
                            if (!existing) {
                                await txPrisma.instructorClass.create({
                                    data: { UserId: user.id, ClassId: classId, EnrolledAt: new Date() }
                                })
                            }
                        } catch (err) {
                            this.logger.warn(`Failed to assign class ${classId} to lecturer ${user.id}: ${err instanceof Error ? err.message : String(err)}`)
                        }
                    }
                } else if (role === 'STUDENT') {
                    for (const classId of dto.classIds) {
                        try {
                            const classExists = await txPrisma.class.findUnique({ where: { Id: classId } })
                            if (!classExists) continue

                            const existing = await txPrisma.studentClass.findUnique({
                                where: { UserId_ClassId: { UserId: user.id, ClassId: classId } }
                            })
                            if (!existing) {
                                await txPrisma.studentClass.create({
                                    data: { UserId: user.id, ClassId: classId, EnrolledAt: new Date() }
                                })
                            }
                        } catch (err) {
                            this.logger.warn(`Failed to enroll student ${user.id} in class ${classId}: ${err instanceof Error ? err.message : String(err)}`)
                        }
                    }
                }
            }

            this.logger.info(`Successfully created user: ${user.id}`)
            return UserResponseDto.from(user)
        })

        // Gửi email thông báo bất đồng bộ sau khi tạo tài khoản thành công
        this.sendNotificationEmails(dto, role).catch(err => {
            this.logger.warn(`Lỗi gửi email thông báo khi tạo tài khoản thủ công (${dto.email}): ${err instanceof Error ? err.message : String(err)}`)
        })

        return createdUserDto
    }

    private async sendNotificationEmails(dto: CreateUserDto, role: UserRoleType): Promise<void> {
        if (!this.emailService) return

        const webUrl = (process.env.FRONTEND_URL || 'https://feaita.edubridge.edu.vn').replace(/\/$/, '')
        const email = dto.email.trim().toLowerCase()
        const fullName = dto.fullName.trim()
        const code = (role === 'LECTURER' ? dto.lecturerCode : dto.studentCode) || ''
        const isLecturer = role === 'LECTURER'

        // 1. Email thông tin tài khoản
        const accountHeaderColor = isLecturer ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
        const accountBtnColor = isLecturer ? 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
        const accountShadowColor = isLecturer ? 'rgba(79, 70, 229, 0.35)' : 'rgba(234, 88, 12, 0.35)'
        const salutation = isLecturer ? `Kính gửi Giảng viên <strong style="color: #0f172a;">${fullName}</strong>,` : `Chào Sinh viên <strong style="color: #0f172a;">${fullName}</strong>,`
        const codeLabel = isLecturer ? 'Mã Giảng viên' : 'Mã Sinh viên'
        const badgeBg = isLecturer ? '#f8fafc' : '#fff7ed'
        const badgeBorder = isLecturer ? '#e2e8f0' : '#fed7aa'
        const textColor = isLecturer ? '#64748b' : '#9a3412'
        const pwdBadgeBg = isLecturer ? '#e0e7ff' : '#ea580c'
        const pwdBadgeColor = isLecturer ? '#4338ca' : '#ffffff'

        const accountEmailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                <div style="background: ${accountHeaderColor}; padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px;">Chào mừng đến với AITA</h1>
                    <p style="color: #ffedd5; margin: 8px 0 0 0; font-size: 15px;">Hệ thống Quản lý & Hỗ trợ Giảng dạy Thông minh</p>
                </div>
                <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                    <p style="font-size: 16px; margin-top: 0;">${salutation}</p>
                    <p>Tài khoản của bạn đã được khởi tạo thành công trên hệ thống AITA. Dưới đây là thông tin đăng nhập:</p>
                    
                    <div style="background: ${badgeBg}; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid ${badgeBorder};">
                        <table style="width: 100%; border-collapse: collapse;">
                            ${code ? `
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid ${badgeBorder}; color: ${textColor}; width: 140px;">${codeLabel}:</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid ${badgeBorder}; font-weight: 600; color: #0f172a;">${code}</td>
                            </tr>` : ''}
                            <tr>
                                <td style="padding: 8px 0; border-bottom: 1px solid ${badgeBorder}; color: ${textColor}; width: 140px;">Email đăng nhập:</td>
                                <td style="padding: 8px 0; border-bottom: 1px solid ${badgeBorder}; font-weight: 600; color: #0f172a;">${email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0 4px 0; color: ${textColor};">Mật khẩu tạm thời:</td>
                                <td style="padding: 12px 0 4px 0;">
                                    <span style="background: ${pwdBadgeBg}; color: ${pwdBadgeColor}; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${dto.password}</span>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin: 28px 0;">
                        <a href="${webUrl}/login" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: ${accountBtnColor}; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px ${accountShadowColor}; letter-spacing: 0.3px;">
                            👉 Đăng nhập vào hệ thống AITA
                        </a>
                    </div>
                    
                    <p style="background: #fef2f2; color: #b91c1c; padding: 12px 16px; border-radius: 6px; font-size: 14px; border-left: 4px solid #ef4444; margin-bottom: 24px;">
                        <strong>⚠️ Lưu ý bảo mật:</strong> Vui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên để bảo vệ tài khoản của bạn.
                    </p>
                    
                    <p style="margin-bottom: 0;">Trân trọng,<br><strong style="color: #0f172a;">Ban quản trị AITA</strong></p>
                </div>
            </div>
        `

        await this.emailService.sendEmail(
            email,
            isLecturer ? 'Thông tin tài khoản hệ thống AITA (Giảng viên)' : 'Thông tin tài khoản hệ thống AITA',
            accountEmailHtml
        ).catch(e => this.logger.warn(`Failed to send account creation email to ${email}: ${e}`))

        // 2. Email thông báo xếp lớp học / Phân công giảng dạy (nếu có chọn lớp)
        if (dto.classIds && dto.classIds.length > 0) {
            const { prisma } = await import('../../../../database/prisma.js')
            const classes = await prisma.class.findMany({
                where: { Id: { in: dto.classIds } },
                include: {
                    Subject: true,
                    Semester: true,
                    InstructorClass: {
                        include: { User: true }
                    }
                }
            })

            if (classes.length > 0) {
                if (role === 'STUDENT') {
                    const enrolledClassDetails = classes.map(cls => {
                        let instructorStr = 'Đang cập nhật'
                        if (cls.InstructorClass && cls.InstructorClass.length > 0) {
                            instructorStr = cls.InstructorClass.map(ic => `${ic.User.FullName} (${ic.User.Email})`).join(', ')
                        }
                        const subjectStr = cls.Subject ? `${cls.Subject.SubjectCode} - ${cls.Subject.SubjectName}` : 'Chưa rõ môn'
                        const semStr = cls.Semester?.Code ? ` (${cls.Semester.Code})` : ''
                        return `<li><strong>Môn ${subjectStr}${semStr} (Lớp: ${cls.ClassCode || '—'}):</strong> Giảng viên: ${instructorStr}</li>`
                    })

                    const classEnrollmentContent = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Xếp Lớp Học Phần</h1>
                                <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 15px;">Hệ thống AITA</p>
                            </div>
                            <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                                <p style="font-size: 16px; margin-top: 0;">Chào Sinh viên <strong style="color: #0f172a;">${fullName}</strong>,</p>
                                <p>Bạn vừa được phân bổ vào danh sách lớp học mới trên hệ thống AITA. Dưới đây là thông tin chi tiết:</p>
                                
                                <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #bae6fd;">
                                    <p style="margin: 0 0 8px 0; color: #0c4a6e; font-weight: 600;">Chi tiết các môn đã xếp lớp:</p>
                                    <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; line-height: 1.8;">
                                        ${enrolledClassDetails.length > 0 ? enrolledClassDetails.join('\n') : '<li>Đang chờ cập nhật thông tin lớp học.</li>'}
                                    </ul>
                                </div>

                                <div style="text-align: center; margin: 28px 0;">
                                    <a href="${webUrl}/student" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35); letter-spacing: 0.3px;">
                                        👉 Truy cập Cổng Sinh Viên AITA
                                    </a>
                                </div>
                                
                                <p>Vui lòng đăng nhập vào hệ thống (Email: <strong style="color: #0f172a;">${email}</strong>) để theo dõi và nộp bài tập.</p>
                                
                                <p style="margin-bottom: 0; margin-top: 30px;">Trân trọng,<br><strong style="color: #0f172a;">Ban quản trị AITA</strong></p>
                            </div>
                        </div>
                    `
                    await this.emailService.sendEmail(
                        email,
                        'Thông báo lớp học hệ thống AITA',
                        classEnrollmentContent
                    ).catch(e => this.logger.warn(`Failed to send class enrollment email to ${email}: ${e}`))
                } else if (role === 'LECTURER') {
                    const classRows = classes.map(c => `
                        <tr>
                            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${c.ClassCode || '—'}</td>
                            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #334155;">${c.Subject?.SubjectCode || ''} - ${c.Subject?.SubjectName || ''}</td>
                            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${c.Semester?.Code || ''}</td>
                        </tr>
                    `).join('')

                    const assignmentEmailHtml = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Phân Công Giảng Dạy</h1>
                                <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 15px;">Hệ thống AITA</p>
                            </div>
                            <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                                <p style="font-size: 16px; margin-top: 0;">Kính gửi Giảng viên <strong style="color: #0f172a;">${fullName}</strong>,</p>
                                <p>Thầy/cô đã được phân công phụ trách các lớp học sau trên hệ thống AITA:</p>
                                
                                <div style="border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; overflow: hidden;">
                                    <table style="width: 100%; border-collapse: collapse; text-align: left; background: #ffffff;">
                                        <thead>
                                            <tr style="background: #f8fafc;">
                                                <th style="padding: 10px 14px; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Lớp Học</th>
                                                <th style="padding: 10px 14px; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Môn Học</th>
                                                <th style="padding: 10px 14px; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Kỳ Học</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${classRows}
                                        </tbody>
                                    </table>
                                </div>

                                <div style="text-align: center; margin: 28px 0;">
                                    <a href="${webUrl}/lecturer" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); letter-spacing: 0.3px;">
                                        👉 Xem lịch phân công trên AITA
                                    </a>
                                </div>
                                
                                <p>Vui lòng đăng nhập vào hệ thống bằng tài khoản <strong style="color: #0f172a;">${email}</strong> để theo dõi chi tiết.</p>
                                
                                <p style="margin-bottom: 0; margin-top: 30px;">Trân trọng,<br><strong style="color: #0f172a;">Ban quản trị AITA</strong></p>
                            </div>
                        </div>
                    `
                    await this.emailService.sendEmail(
                        email,
                        'Phân công giảng dạy hệ thống AITA',
                        assignmentEmailHtml
                    ).catch(e => this.logger.warn(`Failed to send assignment notification email to ${email}: ${e}`))
                }
            }
        }
    }
}
