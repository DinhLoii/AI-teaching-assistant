import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as xlsx from 'xlsx'
import crypto from 'crypto'
import { CloudinaryService } from '../../../../shared/infrastructure/services/cloudinary.service.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'

import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { AppError } from '../../../../shared/application/app.error.js'
import { getAvatarFromRow, normalizeExcelHeader, resolveCloudinaryAvatarUrl } from '../../../../shared/utils/avatar-extractor.util.js'
import { validateRealEmail } from '../../../../shared/utils/email-validator.util.js'

const prisma = new PrismaClient()

type ImportLecturerRow = Record<string, unknown>

const HEADER_ALIASES: Record<string, string[]> = {
    code: ['mã', 'ma', 'mã giảng viên', 'instructor code', 'lecturer code', 'mssv/gv', 'mã gv', 'ma gv', 'gv', 'giảng viên', 'giang vien'],
    fullName: ['họ và tên', 'ho va ten', 'full name', 'fullname', 'tên', 'name', 'họ tên', 'ho ten'],
    email: ['email', 'gmail', 'email address'],
    phone: ['số điện thoại', 'so dien thoai', 'sđt', 'sdt', 'phone', 'phone number'],
    subjects: ['môn dạy', 'mon day', 'subjects', 'môn', 'mon', 'mã môn', 'subject code', 'ma mon', 'mã môn học'],
    classes: ['lớp dạy', 'lop day', 'classes', 'lớp', 'lop', 'mã lớp', 'class code', 'ma lop', 'lớp học'],
    avatar: ['avatar', 'ảnh đại diện', 'anh dai dien', 'hình ảnh', 'hinh anh', 'ảnh', 'anh', 'hình', 'hinh', 'avatar url', 'avatar_url', 'link avatar', 'link_avatar', 'link anh', 'link ảnh', 'url anh', 'url ảnh', 'image', 'picture', 'photo', 'profile picture', 'profile_picture', 'cloudinary', 'link cloudinary', 'ảnh cá nhân', 'anh ca nhan', 'hình cá nhân', 'hinh ca nhan']
}

function getField(row: ImportLecturerRow, key: keyof typeof HEADER_ALIASES): string | undefined {
    if (key === 'avatar') {
        const avatar = getAvatarFromRow(row);
        if (avatar) return avatar;
    }
    const aliases = HEADER_ALIASES[key]
    for (const [header, value] of Object.entries(row)) {
        const normH = normalizeExcelHeader(header);
        const lowerH = header.trim().toLowerCase();
        if (aliases.includes(lowerH) || aliases.some(a => normalizeExcelHeader(a) === normH)) {
            const s = value?.toString().trim()
            if (s && s !== 'undefined' && s !== 'null') return s
        }
    }
    return undefined
}

export class ImportLecturersExcelUseCase {
    constructor(private readonly emailService: IEmailService) { }

    async execute(input: { fileBuffer: Buffer; fileName: string; fileUrl: string; importedByUserId: string }) {
        const { fileBuffer, fileName, fileUrl, importedByUserId } = input

        const normalizedName = fileName.toLowerCase()
        if (!normalizedName.includes('lecturer') && !normalizedName.includes('giảng viên') && !normalizedName.includes('giang_vien') && !normalizedName.includes('gv')) {
            throw new AppError('INVALID_FILE_NAME', 'Tên file không hợp lệ. Vui lòng đặt tên file có chứa từ khoá "lecturer" hoặc "giảng viên" (ví dụ: Lecturer_Spring2026.xlsx)', 400)
        }

        // BẮT BUỘC THEO THỨ TỰ: Học sinh -> Giảng viên -> Phân công
        const studentCount = await prisma.userRole.count({
            where: { Role: { RoleName: 'STUDENT' } }
        })
        if (studentCount === 0) {
            throw new AppError('STUDENT_IMPORT_REQUIRED', 'Vui lòng import danh sách Học sinh (Sinh viên) vào hệ thống trước khi import danh sách Giảng viên.', 400)
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []
        const emailPromises: Promise<any>[] = []

        // 1. SEASON DETECTION
        let detectedSeasonInfo
        try {
            detectedSeasonInfo = detectSeasonFromFilename(fileName)
        } catch (err: any) {
            const errorMsg = err instanceof SeasonDetectorError
                ? err.message
                : 'Không thể xác định mùa học từ tên file'
            throw new AppError('INVALID_SEASON', errorMsg, 400)
        }

        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        if (targetSemesters.length === 0) {
            console.log(`[Import] Season '${detectedSeasonInfo.formatted}' not found. Auto-creating season + semesters + subjects...`)
            const { randomUUID } = await import('crypto')
            const seasonLabel = detectedSeasonInfo.formatted

            await prisma.$transaction(async (tx: any) => {
                for (let i = 1; i <= 9; i++) {
                    const semId = randomUUID()
                    const code = `Kỳ ${i}`

                    await tx.semester.create({
                        data: {
                            Id: semId,
                            Code: code,
                            Season: seasonLabel,
                            IsActive: true,
                            StartDate: null,
                            EndDate: null
                        }
                    })

                    const matchingSubjects = await tx.subject.findMany({
                        where: { Semester: i },
                        select: { Id: true }
                    })
                    if (matchingSubjects.length > 0) {
                        await tx.semesterSubject.createMany({
                            data: matchingSubjects.map((s: any) => ({ SemesterId: semId, SubjectId: s.Id }))
                        })
                    }

                    targetSemesters.push({ Id: semId, Code: code, Season: seasonLabel, IsActive: true, StartDate: null, EndDate: null } as any)
                }
            })
            console.log(`[Import] Auto-created season '${seasonLabel}' with 9 semesters successfully.`)
        }

        const batch = await prisma.importBatch.create({
            data: {
                FileName: fileName,
                FileUrl: fileUrl,
                Status: 'PROCESSING',
                TotalRows: 0,
                SuccessCount: 0,
                ErrorCount: 0,
                ImportedBy: importedByUserId
            }
        })

        try {
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            if (!sheetName) {
                throw new AppError('INVALID_FILE', 'File Excel không có dữ liệu', 400)
            }

            const sheet = workbook.Sheets[sheetName]
            const rows: ImportLecturerRow[] = xlsx.utils.sheet_to_json(sheet, { blankrows: true })

            // Loại bỏ các dòng trống ở cuối file Excel
            while (rows.length > 0) {
                const lastRow = rows[rows.length - 1]
                const isEmpty = Object.values(lastRow).every(v => v === undefined || v === null || String(v).trim() === '')
                if (isEmpty) {
                    rows.pop()
                } else {
                    break
                }
            }

            if (rows.length === 0) {
                throw new AppError('INVALID_FILE', 'File Excel rỗng: File không chứa dữ liệu giảng viên hoặc toàn bộ các dòng đều bị bỏ trống. Vui lòng kiểm tra lại file trước khi import.', 400)
            }

            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: { TotalRows: rows.length }
            })

            const lecturerRole = await prisma.role.findUnique({ where: { RoleName: 'LECTURER' } })
            if (!lecturerRole) {
                throw new AppError('SYSTEM_ERROR', 'Chưa cấu hình role LECTURER trong hệ thống', 500)
            }

            // Tracking for sync
            const processedClasses: Array<{ subjectCode: string; classCode: string; userId: string }> = []
            const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

            // Maps kiểm tra trùng lặp tài khoản với database
            const existingDbUsers = await prisma.user.findMany({
                select: { LecturerCode: true, StudentCode: true, FullName: true, Email: true }
            })

            const dbLecturerCodeMap = new Map<string, { fullName: string; email?: string }>()
            const dbEmailMap = new Map<string, { fullName: string; code?: string }>()

            for (const u of existingDbUsers) {
                if (u.LecturerCode) dbLecturerCodeMap.set(u.LecturerCode.trim().toUpperCase(), { fullName: u.FullName || '', email: u.Email || '' })
                if (u.Email) dbEmailMap.set(u.Email.trim().toLowerCase(), { fullName: u.FullName || '', code: u.LecturerCode || u.StudentCode || '' })
            }

            const fileLecturerCodeMap = new Map<string, { row: number; fullName: string }>()
            const fileEmailMap = new Map<string, { row: number; fullName: string }>()

            // Maps kiểm tra xung đột phân công từ database trong mùa hiện tại
            const dbAssignments = await prisma.instructorClass.findMany({
                where: {
                    Class: {
                        SemesterId: { in: Array.from(targetSemesterIds) }
                    }
                },
                include: {
                    User: { select: { LecturerCode: true, FullName: true, Id: true } },
                    Class: {
                        include: {
                            Subject: { select: { SubjectCode: true } }
                        }
                    }
                }
            })

            const dbTeachingMap = new Map<string, { lecturerCode: string; lecturerName: string }>()
            for (const a of dbAssignments) {
                const sCode = a.Class?.Subject?.SubjectCode?.trim().toUpperCase()
                const cCode = a.Class?.ClassCode?.trim().toUpperCase()
                if (sCode && cCode && a.User?.LecturerCode) {
                    dbTeachingMap.set(`${sCode}__${cCode}`, {
                        lecturerCode: a.User.LecturerCode.trim().toUpperCase(),
                        lecturerName: a.User.FullName || ''
                    })
                }
            }

            const fileTeachingMap = new Map<string, { lecturerCode: string; lecturerName: string; row: number }>()

            // ══════════════════════════════════════════════════════════════════
            // GIAI ĐOẠN 1: PRE-VALIDATION TOÀN BỘ FILE (ALL-OR-NOTHING BUSINESS RULE)
            // Bắt buộc tất cả các hàng phải được điền đầy đủ, không để trống bất kỳ dòng nào.
            // Nếu có lỗi -> Chặn hoàn toàn, KHÔNG ghi vào DB, KHÔNG gửi email!
            // ══════════════════════════════════════════════════════════════════
            const validationErrors: Array<{ row: number; message: string }> = []

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowIndex = i + 2

                const isRowEmpty = Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '')
                if (isRowEmpty) {
                    validationErrors.push({
                        row: rowIndex,
                        message: 'Hàng này đang để trống hoàn toàn. Vui lòng điền thông tin hoặc xóa dòng trống này.'
                    })
                    continue
                }

                const code = getField(row, 'code')
                const fullName = getField(row, 'fullName')
                const email = getField(row, 'email')
                const subjectsStr = getField(row, 'subjects')
                const classesStr = getField(row, 'classes')

                const missing: string[] = []
                if (!code) missing.push('Mã GV (hoặc MSSV/GV)')
                if (!fullName) missing.push('Họ và tên')
                if (!email) missing.push('Email')

                if (missing.length > 0) {
                    validationErrors.push({
                        row: rowIndex,
                        message: `Chỗ này đang để trống: ${missing.join(', ')}. Bắt buộc phải điền đầy đủ dữ liệu theo hàng.`
                    })
                } else {
                    // Kiểm tra trùng lặp mã giảng viên
                    if (code) {
                        const normCode = code.trim().toUpperCase()
                        const normFullName = (fullName || '').trim().toLowerCase()
                        const prevInFile = fileLecturerCodeMap.get(normCode)

                        if (prevInFile) {
                            if (normFullName && prevInFile.fullName.trim().toLowerCase() === normFullName) {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng lặp: Giảng viên '${fullName}' (Mã: ${code}) bị trùng lặp với dòng ${prevInFile.row}.`
                                })
                            } else {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng mã: Mã '${code}' bị trùng với giảng viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}.`
                                })
                            }
                        } else {
                            fileLecturerCodeMap.set(normCode, { row: rowIndex, fullName: fullName || '' })
                        }

                        const existingInDb = dbLecturerCodeMap.get(normCode)
                        if (existingInDb) {
                            if (normFullName && existingInDb.fullName.trim().toLowerCase() === normFullName) {
                                // Giảng viên đã có trong hệ thống
                            } else {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng mã: Mã '${code}' đã được cấp cho giảng viên '${existingInDb.fullName}' trong hệ thống.`
                                })
                            }
                        }
                    }

                    // Kiểm tra trùng lặp email
                    if (email) {
                        const normEmail = email.trim().toLowerCase()
                        if (normEmail) {
                            const prevInFile = fileEmailMap.get(normEmail)
                            if (prevInFile) {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng Email: Email '${email}' bị trùng với giảng viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}.`
                                })
                            } else {
                                fileEmailMap.set(normEmail, { row: rowIndex, fullName: fullName || '' })
                            }

                            const existingInDb = dbEmailMap.get(normEmail)
                            if (existingInDb && code && existingInDb.code && existingInDb.code.toUpperCase() !== code.trim().toUpperCase()) {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng Email: Email '${email}' đã được đăng ký cho tài khoản '${existingInDb.fullName}' trong hệ thống.`
                                })
                            }
                        }

                        const emailValidation = await validateRealEmail(email)
                        if (!emailValidation.isValid) {
                            validationErrors.push({
                                row: rowIndex,
                                message: `Email '${email}' không hợp lệ hoặc không phải email thật (${emailValidation.reason}). Vui lòng nhập email thật.`
                            })
                        }
                    }

                    // Kiểm tra xung đột phân công nếu có cột môn và lớp
                    if (subjectsStr && classesStr && code) {
                        const subjects = subjectsStr.split(/[,;]|\s+và\s+|\n|\s+/).map(s => s.trim()).filter(Boolean)
                        const classes = classesStr.split(/[,;]|\s+và\s+|\n|\s+/).map(s => s.trim()).filter(Boolean)
                        const normCode = code.trim().toUpperCase()
                        const displayLecturerName = fullName || code

                        for (const s of subjects) {
                            const normS = s.toUpperCase()
                            for (const c of classes) {
                                const normC = c.toUpperCase()
                                const key = `${normS}__${normC}`

                                const prevAssigned = fileTeachingMap.get(key)
                                if (prevAssigned) {
                                    if (prevAssigned.lecturerCode === normCode) {
                                        validationErrors.push({
                                            row: rowIndex,
                                            message: `Trùng lặp phân công: Giảng viên '${displayLecturerName}' (Mã: ${code}) đã được phân công môn '${s}' lớp '${c}' ở dòng ${prevAssigned.row}.`
                                        })
                                    } else {
                                        validationErrors.push({
                                            row: rowIndex,
                                            message: `Xung đột phân công: Môn '${s}' của lớp '${c}' đã được phân công cho giảng viên '${prevAssigned.lecturerName}' (Mã: ${prevAssigned.lecturerCode}) ở dòng ${prevAssigned.row}. Giảng viên '${displayLecturerName}' (Mã: ${code}) không thể cùng phụ trách lớp môn này vì mỗi lớp học phần chỉ do một giảng viên phụ trách.`
                                        })
                                    }
                                } else {
                                    fileTeachingMap.set(key, {
                                        lecturerCode: normCode,
                                        lecturerName: displayLecturerName,
                                        row: rowIndex
                                    })
                                }

                                const existingInDb = dbTeachingMap.get(key)
                                if (existingInDb && existingInDb.lecturerCode !== normCode) {
                                    validationErrors.push({
                                        row: rowIndex,
                                        message: `Xung đột phân công: Môn '${s}' của lớp '${c}' hiện đã được phân công cho giảng viên '${existingInDb.lecturerName}' (Mã: ${existingInDb.lecturerCode}) trên hệ thống trong kỳ ${detectedSeasonInfo.formatted}. Giảng viên '${displayLecturerName}' (Mã: ${code}) không thể cùng phụ trách lớp này.`
                                    })
                                }
                            }
                        }
                    }
                }
            }

            if (validationErrors.length > 0) {
                const sampleList = validationErrors.slice(0, 10).map(e => `• Dòng ${e.row}: ${e.message}`).join('\n')
                const extraMsg = validationErrors.length > 10 ? `\n... và còn ${validationErrors.length - 10} dòng lỗi khác.` : ''

                const hasEmptyOrMissing = validationErrors.some(e => e.message.includes('để trống') || e.message.includes('Thiếu'))
                const hasConflict = validationErrors.some(e => e.message.includes('Xung đột'))
                const hasDuplicate = validationErrors.some(e => e.message.includes('Trùng'))
                const hasInvalidEmail = validationErrors.some(e => e.message.includes('email thật') || e.message.includes('không hợp lệ'))

                let summaryHeader = ''
                if (hasConflict) {
                    summaryHeader = `Hệ thống phát hiện ${validationErrors.length} dòng có xung đột phân công giảng dạy (2 giảng viên cùng được phân công chung lớp và chung môn) hoặc dữ liệu không hợp lệ. Quy chế đào tạo quy định mỗi lớp học phần trong kỳ chỉ do 1 giảng viên phụ trách. Vui lòng kiểm tra và phân công lại.`
                } else if (hasDuplicate && !hasEmptyOrMissing && !hasInvalidEmail) {
                    summaryHeader = `Hệ thống phát hiện ${validationErrors.length} dòng bị trùng lặp thông tin định danh (trùng tên và mã, trùng mã hoặc trùng email). Quy định doanh nghiệp yêu cầu thông tin định danh của mỗi giảng viên phải là duy nhất. Vui lòng kiểm tra và chỉnh sửa lại file Excel trước khi import.`
                } else if (hasInvalidEmail && !hasEmptyOrMissing) {
                    summaryHeader = `Hệ thống phát hiện ${validationErrors.length} dòng có Email không hợp lệ (email ảo, không tồn tại hoặc đã bị vô hiệu hóa trên máy chủ thư). Quy định doanh nghiệp yêu cầu tất cả email phải là email thật và đang hoạt động để gửi thông báo tài khoản. Vui lòng kiểm tra và sửa lại email đúng.`
                } else if (hasEmptyOrMissing && !hasInvalidEmail) {
                    summaryHeader = `Hệ thống phát hiện ${validationErrors.length} dòng bị để trống hoặc thiếu dữ liệu bắt buộc. Quy định doanh nghiệp yêu cầu file Excel phải được điền đầy đủ theo từng hàng, không được để trống dòng hoặc ô dữ liệu bắt buộc. Vui lòng kiểm tra và điền đầy đủ thông tin hoặc xóa dòng trống.`
                } else {
                    summaryHeader = `Hệ thống phát hiện ${validationErrors.length} dòng có dữ liệu không hợp lệ (bị để trống, trùng lặp thông tin hoặc email không tồn tại). Quy định doanh nghiệp yêu cầu file Excel phải được điền đầy đủ và chính xác theo từng hàng trước khi import.`
                }

                await prisma.importBatch.update({
                    where: { Id: batch.Id },
                    data: {
                        Status: 'FAILED',
                        ErrorCount: validationErrors.length,
                        ErrorDetails: `Bắt buộc chỉnh sửa lại file Excel trước khi import:\n${sampleList}${extraMsg}`
                    }
                })

                throw new AppError(
                    'VALIDATION_FAILED',
                    `BẮT BUỘC CHỈNH SỬA LẠI FILE EXCEL TRƯỚC KHI IMPORT!\n\n${summaryHeader}\n\nChi tiết các dòng cần chỉnh sửa:\n${sampleList}${extraMsg}`,
                    400
                )
            }

            // ══════════════════════════════════════════════════════════════════
            // GIAI ĐOẠN 2: THỰC HIỆN IMPORT VÀO DB VÀ GỬI EMAIL (KHI 100% HỢP LỆ)
            // ══════════════════════════════════════════════════════════════════
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowIndex = i + 2

                try {
                    const isRowEmpty = Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '')
                    if (isRowEmpty) {
                        throw new Error('Dòng trống không có dữ liệu (Vui lòng xóa dòng trống hoặc điền đầy đủ thông tin)')
                    }

                    const code = getField(row, 'code')
                    const fullName = getField(row, 'fullName')
                    const email = getField(row, 'email')
                    const phone = getField(row, 'phone')
                    const avatarUrlRaw = getField(row, 'avatar') || ''

                    if (!code || !fullName || !email) {
                        const missing = []
                        if (!code) missing.push('Mã GV')
                        if (!fullName) missing.push('Họ và tên')
                        if (!email) missing.push('Email')
                        throw new Error(`Thiếu thông tin bắt buộc (${missing.join(', ')})`)
                    }

                    // Check duplicate User
                    let user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { Email: email },
                                { LecturerCode: code }
                            ]
                        }
                    })

                    let rawPassword = ''
                    let passwordHash = ''

                    // Xử lý avatar URL: Hỗ trợ link Cloudinary Collection, direct URL và re-upload nếu cần
                    let secureAvatarUrl: string | null = await resolveCloudinaryAvatarUrl(avatarUrlRaw);
                    if (secureAvatarUrl && !secureAvatarUrl.includes('cloudinary.com') && CloudinaryService.isConfigured()) {
                        try {
                            const uploadedUrl = await CloudinaryService.uploadImageFromUrl(secureAvatarUrl);
                            if (uploadedUrl) {
                                secureAvatarUrl = uploadedUrl;
                            }
                        } catch (err) {
                            console.warn(`Lỗi upload avatar cho ${email}, sử dụng URL gốc:`, err);
                        }
                    }

                    if (!user) {
                        rawPassword = crypto.randomBytes(4).toString('hex')
                        passwordHash = await bcrypt.hash(rawPassword, 10)
                        user = await prisma.user.create({
                            data: {
                                LecturerCode: code,
                                FullName: fullName,
                                Email: email,
                                Phone: phone,
                                Avatar: secureAvatarUrl,
                                PasswordHash: passwordHash,
                                Status: 'Active',
                                RequirePasswordChange: true,
                                UserRole: {
                                    create: {
                                        RoleId: lecturerRole.Id,
                                        AssignedAt: new Date()
                                    }
                                }
                            }
                        })
                    } else {
                        // Cập nhật avatar nếu có, và đảm bảo role LECTURER
                        const dataToUpdate: any = {}
                        if (secureAvatarUrl) dataToUpdate.Avatar = secureAvatarUrl
                        if (code && user.LecturerCode !== code) dataToUpdate.LecturerCode = code
                        if (fullName && user.FullName !== fullName) dataToUpdate.FullName = fullName
                        if (phone && user.Phone !== phone) dataToUpdate.Phone = phone

                        if (Object.keys(dataToUpdate).length > 0) {
                            user = await prisma.user.update({
                                where: { Id: user.Id },
                                data: dataToUpdate
                            });
                        }

                        const hasRole = await prisma.userRole.findFirst({
                            where: { UserId: user.Id, RoleId: lecturerRole.Id }
                        })
                        if (!hasRole) {
                            await prisma.userRole.create({
                                data: { UserId: user.Id, RoleId: lecturerRole.Id, AssignedAt: new Date() }
                            })
                        }
                    }

                    // Accumulate emails instead of awaiting them inside the loop
                    const webUrl = (process.env.FRONTEND_URL || 'https://feaita.edubridge.edu.vn').replace(/\/$/, '')
                    if (rawPassword) {
                        const accountEmailHtml = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                            <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px;">Chào mừng đến với AITA</h1>
                                <p style="color: #e2e8f0; margin: 8px 0 0 0; font-size: 15px;">Hệ thống Quản lý & Hỗ trợ Giảng dạy Thông minh</p>
                            </div>
                            <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                                <p style="font-size: 16px; margin-top: 0;">Kính gửi Giảng viên <strong style="color: #0f172a;">${fullName}</strong>,</p>
                                <p>Tài khoản của thầy/cô đã được khởi tạo thành công. Dưới đây là thông tin đăng nhập của thầy/cô:</p>
                                
                                <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 140px;">Mã Giảng viên:</td>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${code}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email:</td>
                                            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${email}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 12px 0 4px 0; color: #64748b;">Mật khẩu tạm thời:</td>
                                            <td style="padding: 12px 0 4px 0;">
                                                <span style="background: #e0e7ff; color: #4338ca; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${rawPassword}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <div style="text-align: center; margin: 28px 0;">
                                    <a href="${webUrl}/login" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); letter-spacing: 0.3px;">
                                        👉 Đăng nhập vào hệ thống AITA
                                    </a>
                                </div>
                                
                                <p style="background: #fef2f2; color: #b91c1c; padding: 12px 16px; border-radius: 6px; font-size: 14px; border-left: 4px solid #ef4444; margin-bottom: 24px;">
                                    <strong>⚠️ Lưu ý bảo mật:</strong> Vui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên để bảo vệ tài khoản của thầy/cô.
                                </p>
                                
                                <p style="margin-bottom: 0;">Trân trọng,<br><strong style="color: #0f172a;">Ban quản trị AITA</strong></p>
                            </div>
                        </div>
                        `
                        emailPromises.push(
                            this.emailService.sendEmail(email, 'Thông tin tài khoản hệ thống AITA (Giảng viên)', accountEmailHtml)
                                .catch((e: any) => console.error(`Failed to send account email to ${email}:`, e))
                        )
                    }

                    successCount++
                } catch (err: any) {
                    errorCount++
                    errors.push(`Dòng ${rowIndex} (${getField(row, 'email') || 'Không rõ'}): ${err.message}`)
                }
            }

            // --- SYNC DELETION LOGIC ---
            try {
                const classRosters = new Map<string, Set<string>>()

                // Build a map of valid classes the lecturers *should* be in
                for (const pc of processedClasses) {
                    const targetSubj = await prisma.subject.findUnique({
                        where: { SubjectCode: pc.subjectCode }
                    })
                    if (targetSubj) {
                        const cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: pc.classCode,
                                SubjectId: targetSubj.Id,
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            },
                            select: { Id: true }
                        })
                        if (cls) {
                            if (!classRosters.has(cls.Id)) {
                                classRosters.set(cls.Id, new Set())
                            }
                            classRosters.get(cls.Id)!.add(pc.userId)
                        }
                    }
                }

                // Actually, the sync deletion for lecturers should only remove lecturers 
                // who are in this import file from classes in this season that they are no longer assigned to.
                // Wait, if a teacher is entirely missing from the file, should they be removed?
                // The safest is: for every teacher IN THIS FILE, clear their InstructorClass records
                // for classes IN THIS SEASON that they are NOT mapped to in processedClasses.

                const userIdsInFile = [...new Set(processedClasses.map(p => p.userId))]

                for (const uId of userIdsInFile) {
                    // Find all classes this user is currently instructing in this season
                    const currentClasses = await prisma.instructorClass.findMany({
                        where: {
                            UserId: uId,
                            Class: {
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            }
                        },
                        include: { Class: true }
                    })

                    // The classes they *should* be instructing according to the file
                    const expectedClassIds = new Set<string>()
                    for (const [classId, validUserIds] of classRosters.entries()) {
                        if (validUserIds.has(uId)) {
                            expectedClassIds.add(classId)
                        }
                    }

                    // Remove them from classes they shouldn't be in
                    for (const cc of currentClasses) {
                        if (!expectedClassIds.has(cc.ClassId)) {
                            await prisma.instructorClass.delete({
                                where: { UserId_ClassId: { UserId: uId, ClassId: cc.ClassId } }
                            })
                            console.log(`[Import Lecturer] Gỡ GV ${uId} khỏi lớp ${cc.Class.ClassCode} (ID: ${cc.ClassId}) do không có trong file mới.`)
                        }
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync deletions:', syncErr)
            }

            let errorDetailsStr = JSON.stringify(errors)
            if (errorDetailsStr.length > 3900) {
                errorDetailsStr = errorDetailsStr.substring(0, 3900) + '... (truncated)'
            }
            const finalBatch = await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: {
                    Status: 'COMPLETED',
                    SuccessCount: successCount,
                    ErrorCount: errorCount,
                    ErrorDetails: errorDetailsStr
                }
            })

            // Execute all emails in the background without blocking the API response
            // Execute all emails and wait for them so the frontend shows a loading state
            if (emailPromises.length > 0) {
                const results = await Promise.allSettled(emailPromises)
                console.log(`[Import Lecturer] Đã xử lý gửi ${results.length} email thông báo.`);
            }

            return {
                batchId: finalBatch.Id,
                detectedSeason: detectedSeasonInfo.formatted,
                successCount,
                errorCount,
                errors
            }
        } catch (err: any) {
            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: {
                    Status: 'FAILED',
                    ErrorDetails: err.message
                }
            })
            throw err
        }
    }
}
