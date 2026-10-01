import { prisma } from '../../../../database/prisma.js'
import bcrypt from 'bcryptjs'
import * as xlsx from 'xlsx'
import crypto from 'crypto'
import { CloudinaryService } from '../../../../shared/infrastructure/services/cloudinary.service.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'

import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { AppError } from '../../../../shared/application/app.error.js'
import { getAvatarFromRow, normalizeExcelHeader, resolveCloudinaryAvatarUrl } from '../../../../shared/utils/avatar-extractor.util.js'
import { validateRealEmail } from '../../../../shared/utils/email-validator.util.js'

type ImportStudentRow = Record<string, unknown>

// Chấp nhận cả header tiếng Việt lẫn tiếng Anh (file của Admin có thể xuất từ template khác nhau).
// So khớp không phân biệt hoa thường và bỏ khoảng trắng thừa.
const HEADER_ALIASES: Record<string, string[]> = {
    mssv: ['mssv', 'student id', 'studentid', 'student code', 'mssv/gv', 'ma sinh vien', 'mã sinh viên', 'ma sv', 'mã sv'],
    fullName: ['họ và tên', 'ho va ten', 'full name', 'fullname', 'họ tên', 'ho ten', 'tên', 'name'],
    email: ['email', 'gmail', 'email address'],
    phone: ['số điện thoại', 'so dien thoai', 'phone number', 'phone', 'sđt', 'sdt'],
    semester: ['kỳ học', 'kì học', 'ky hoc', 'ki hoc', 'semester', 'kỳ', 'kì', 'ky', 'ki'],
    classCode: ['lớp học', 'lop hoc', 'class', 'lớp', 'lop', 'mã lớp', 'ma lop', 'class code'],
    outOfSemesterSubjects: ['môn khác kỳ hiện tại (nợ/học vượt)', 'môn khác kì hiện tại (nợ/học vượt)', 'mon khac ky hien tai', 'out of semester subjects', 'nợ/học vượt', 'khác kỳ', 'khác kì'],
    passedSubjects: ['môn đã học vượt thành công', 'mon da hoc vuot thanh cong', 'passed subjects', 'học vượt thành công', 'đã học'],
    // Cột nợ môn — dùng riêng biệt, lookup KHÔNG bị giới hạn theo mùa hiện tại
    retakeSubjects: ['nợ môn', 'no mon', 'môn nợ', 'mon no', 'retake subjects', 'retake', 'subject debt', 'nợ', 'debt subjects', 'môn học nợ', 'mon hoc no', 'môn học lại', 'mon hoc lai'],
    retakeClasses: ['lớp nợ môn', 'lop no mon', 'lớp nợ', 'lop no', 'lớp học lại', 'lop hoc lai', 'retake classes', 'retake class'],
    avatar: ['avatar', 'ảnh đại diện', 'anh dai dien', 'hình ảnh', 'hinh anh', 'ảnh', 'anh', 'hình', 'hinh', 'avatar url', 'avatar_url', 'link avatar', 'link_avatar', 'link anh', 'link ảnh', 'link hinh', 'link hình', 'link hinh anh', 'link hình ảnh', 'url anh', 'url ảnh', 'image', 'picture', 'photo', 'profile picture', 'profile_picture', 'cloudinary', 'link cloudinary', 'ảnh cá nhân', 'anh ca nhan', 'hình cá nhân', 'hinh ca nhan'],
}

function getField(row: ImportStudentRow, key: keyof typeof HEADER_ALIASES): string | undefined {
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

export class ImportStudentsExcelUseCase {
    constructor(private readonly emailService: IEmailService) { }

    async execute(input: { fileBuffer: Buffer; fileName: string; fileUrl: string; importedByUserId: string }) {
        const { fileBuffer, fileName, fileUrl, importedByUserId } = input

        const normalizedName = fileName.toLowerCase()
        if (!normalizedName.includes('student') && !normalizedName.includes('học sinh') && !normalizedName.includes('hoc_sinh') && !normalizedName.includes('hs') && !normalizedName.includes('sinh viên') && !normalizedName.includes('sinh_vien') && !normalizedName.includes('sv')) {
            throw new AppError('INVALID_FILE_NAME', 'Tên file không hợp lệ. Vui lòng đặt tên file có chứa từ khoá "student", "sinh viên", "học sinh" hoặc "sv" (ví dụ: Student_Spring2026.xlsx)', 400)
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        // 1. SEASON DETECTION: Extract season from filename before any processing
        let detectedSeasonInfo
        try {
            detectedSeasonInfo = detectSeasonFromFilename(fileName)
        } catch (err: any) {
            const errorMsg = err instanceof SeasonDetectorError
                ? err.message
                : 'Không thể xác định mùa học từ tên file'
            throw new AppError('INVALID_SEASON', errorMsg, 400)
        }

        // 2. FIND TARGET SEMESTER: Get semesters for detected season.
        // Uses matchesSeason() which handles all DB storage formats:
        // 'Fall', 'Fall2026', 'Fall 2026', 'fall-2026', '2026Fall', etc.
        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        if (targetSemesters.length === 0) {
            // ── AUTO-CREATE SEASON ──────────────────────────────────────────────
            // Season is not in the system yet. Create it automatically with 9
            // semesters (Kỳ 1 → Kỳ 9) and auto-link the default subjects based on
            // each subject's `Semester` attribute (same logic as SemesterRepository.createSeason).
            console.log(`[Import] Season '${detectedSeasonInfo.formatted}' not found. Auto-creating season + semesters + subjects...`)
            const { randomUUID } = await import('crypto')
            const seasonLabel = detectedSeasonInfo.formatted  // e.g. "Spring 2026"

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

                    // Auto-link subjects whose Semester == i
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

        // 3. Create ImportBatch record
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
            // 4. Parse Excel file
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            if (!sheetName) {
                throw new AppError('INVALID_FILE', 'File Excel không có dữ liệu', 400)
            }

            const sheet = workbook.Sheets[sheetName]
            const rows: ImportStudentRow[] = xlsx.utils.sheet_to_json(sheet, { blankrows: true })

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
                throw new AppError('INVALID_FILE', 'File Excel rỗng: File không chứa dữ liệu sinh viên hoặc toàn bộ các dòng đều bị bỏ trống. Vui lòng kiểm tra lại file trước khi import.', 400)
            }

            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: { TotalRows: rows.length }
            })

            const studentRole = await prisma.role.findUnique({ where: { RoleName: 'STUDENT' } })
            if (!studentRole) {
                throw new AppError('SYSTEM_ERROR', 'Chưa cấu hình role STUDENT trong hệ thống', 500)
            }

            // Tracking for sync
            const processedClasses: Array<{ semesterCode?: string; classCode: string; subjectCode?: string; userId: string; isRetake?: boolean }> = []

            // Map kiểm tra trùng lặp với cơ sở dữ liệu
            const existingDbUsers = await prisma.user.findMany({
                select: { StudentCode: true, LecturerCode: true, FullName: true, Email: true }
            })

            const dbStudentCodeMap = new Map<string, { fullName: string; email?: string }>()
            const dbEmailMap = new Map<string, { fullName: string; studentCode?: string }>()

            for (const u of existingDbUsers) {
                if (u.StudentCode) dbStudentCodeMap.set(u.StudentCode.trim().toUpperCase(), { fullName: u.FullName || '', email: u.Email || '' })
                if (u.Email) dbEmailMap.set(u.Email.trim().toLowerCase(), { fullName: u.FullName || '', studentCode: u.StudentCode || u.LecturerCode || '' })
            }

            const fileStudentCodeMap = new Map<string, { row: number; fullName: string }>()
            const fileEmailMap = new Map<string, { row: number; fullName: string }>()

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

                const mssv = getField(row, 'mssv')
                const fullName = getField(row, 'fullName')
                const email = getField(row, 'email')
                let semesterCode = getField(row, 'semester')
                const classCode = getField(row, 'classCode')

                const missing: string[] = []
                if (!mssv) missing.push('MSSV (hoặc MSSV/GV)')
                if (!fullName) missing.push('Họ và tên')
                if (!email) missing.push('Email')
                if (!semesterCode) missing.push('Kỳ học')
                if (!classCode) missing.push('Lớp học')

                if (missing.length > 0) {
                    validationErrors.push({
                        row: rowIndex,
                        message: `Chỗ này đang để trống: ${missing.join(', ')}. Bắt buộc phải điền đầy đủ dữ liệu theo hàng.`
                    })
                } else {
                    // Kiểm tra trùng lặp mã sinh viên (MSSV) và họ tên
                    if (mssv) {
                        const normMssv = mssv.trim().toUpperCase()
                        const normFullName = (fullName || '').trim().toLowerCase()
                        const prevInFile = fileStudentCodeMap.get(normMssv)

                        if (prevInFile) {
                            if (normFullName && prevInFile.fullName.trim().toLowerCase() === normFullName) {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng lặp: Sinh viên '${fullName}' (MSSV: ${mssv}) bị trùng lặp với dòng ${prevInFile.row}.`
                                })
                            } else {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng mã: MSSV '${mssv}' bị trùng với sinh viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}.`
                                })
                            }
                        } else {
                            fileStudentCodeMap.set(normMssv, { row: rowIndex, fullName: fullName || '' })
                        }

                        const existingInDb = dbStudentCodeMap.get(normMssv)
                        if (existingInDb) {
                            if (normFullName && existingInDb.fullName.trim().toLowerCase() === normFullName) {
                                // Sinh viên đã có trong hệ thống
                            } else {
                                validationErrors.push({
                                    row: rowIndex,
                                    message: `Trùng mã: MSSV '${mssv}' đã được cấp cho sinh viên '${existingInDb.fullName}' trong hệ thống.`
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
                                    message: `Trùng Email: Email '${email}' bị trùng với sinh viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}.`
                                })
                            } else {
                                fileEmailMap.set(normEmail, { row: rowIndex, fullName: fullName || '' })
                            }

                            const existingInDb = dbEmailMap.get(normEmail)
                            if (existingInDb && mssv && existingInDb.studentCode && existingInDb.studentCode.toUpperCase() !== mssv.trim().toUpperCase()) {
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

                    if (semesterCode) {
                        const semesterNumberMatch = semesterCode.match(/\d+/)
                        const semesterNumber = semesterNumberMatch ? parseInt(semesterNumberMatch[0], 10) : null

                        const existingSemester = targetSemesters.find(s => {
                            if (s.Code === semesterCode) return true
                            if (s.Code?.toLowerCase() === semesterCode!.toLowerCase()) return true
                            const sNumMatch = s.Code?.match(/\d+/)
                            const sNum = sNumMatch ? parseInt(sNumMatch[0], 10) : null
                            return sNum !== null && sNum === semesterNumber
                        })

                        if (!existingSemester && !semesterNumberMatch) {
                            validationErrors.push({
                                row: rowIndex,
                                message: `Kỳ học '${semesterCode}' không tồn tại trong mùa ${detectedSeasonInfo.formatted}.`
                            })
                        }
                    }
                }
            }

            if (validationErrors.length > 0) {
                const sampleList = validationErrors.slice(0, 10).map(e => `• Dòng ${e.row}: ${e.message}`).join('\n')
                const extraMsg = validationErrors.length > 10 ? `\n... và còn ${validationErrors.length - 10} dòng lỗi khác.` : ''

                const hasEmptyOrMissing = validationErrors.some(e => e.message.includes('để trống') || e.message.includes('Thiếu'))
                const hasDuplicate = validationErrors.some(e => e.message.includes('Trùng'))
                const hasInvalidEmail = validationErrors.some(e => e.message.includes('email thật') || e.message.includes('không hợp lệ'))

                let summaryHeader = ''
                if (hasDuplicate && !hasEmptyOrMissing && !hasInvalidEmail) {
                    summaryHeader = `Hệ thống phát hiện ${validationErrors.length} dòng bị trùng lặp dữ liệu (trùng tên và mã, trùng mã hoặc trùng email). Quy định doanh nghiệp yêu cầu thông tin định danh của mỗi tài khoản phải là duy nhất. Vui lòng kiểm tra và chỉnh sửa lại file Excel trước khi import.`
                } else if (hasInvalidEmail && !hasEmptyOrMissing && !hasDuplicate) {
                    summaryHeader = `Hệ thống phát hiện ${validationErrors.length} dòng có Email không hợp lệ (email ảo, không tồn tại hoặc đã bị vô hiệu hóa trên máy chủ thư). Quy định doanh nghiệp yêu cầu tất cả email phải là email thật và đang hoạt động để gửi thông báo tài khoản. Vui lòng kiểm tra và sửa lại email đúng.`
                } else if (hasEmptyOrMissing && !hasInvalidEmail && !hasDuplicate) {
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
            // GIAI ĐOẠN 2: THỰC HIỆN IMPORT VÀO DB (KHI 100% HỢP LỆ)
            // ══════════════════════════════════════════════════════════════════
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]
                const rowIndex = i + 2 // +2 because 0-index and header row

                try {
                    const isRowEmpty = Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '')
                    if (isRowEmpty) {
                        throw new Error('Dòng trống không có dữ liệu (Vui lòng xóa dòng trống hoặc điền đầy đủ thông tin)')
                    }

                    const mssv = getField(row, 'mssv')
                    const fullName = getField(row, 'fullName')
                    const email = getField(row, 'email')
                    const phone = getField(row, 'phone')
                    let semesterCode = getField(row, 'semester')
                    const classCode = getField(row, 'classCode')
                    const outOfSemesterStr = getField(row, 'outOfSemesterSubjects') || ''
                    const passedStr = getField(row, 'passedSubjects') || ''
                    // Cột nợ môn riêng: lookup không giới hạn mùa
                    const retakeStr = getField(row, 'retakeSubjects') || ''
                    const retakeClassStr = getField(row, 'retakeClasses') || ''
                    const avatarUrlRaw = getField(row, 'avatar') || ''

                    if (!mssv || !fullName || !email || !semesterCode || !classCode) {
                        const missing = []
                        if (!mssv) missing.push('MSSV')
                        if (!fullName) missing.push('Họ và tên')
                        if (!email) missing.push('Email')
                        if (!semesterCode) missing.push('Kỳ học')
                        if (!classCode) missing.push('Lớp học')
                        throw new Error(`Thiếu thông tin bắt buộc (${missing.join(', ')})`)
                    }

                    // Fuzzy-match semesterCode against ONLY the target season's semesters
                    // This prevents "Kỳ 1" from matching a semester in a different season
                    const semesterNumberMatch = semesterCode.match(/\d+/)
                    const semesterNumber = semesterNumberMatch ? parseInt(semesterNumberMatch[0], 10) : null

                    const existingSemester = targetSemesters.find(s => {
                        if (s.Code === semesterCode) return true
                        if (s.Code?.toLowerCase() === semesterCode!.toLowerCase()) return true
                        const sNumMatch = s.Code?.match(/\d+/)
                        const sNum = sNumMatch ? parseInt(sNumMatch[0], 10) : null
                        return sNum !== null && sNum === semesterNumber
                    })

                    if (existingSemester && existingSemester.Code) {
                        semesterCode = existingSemester.Code
                    } else if (semesterNumberMatch) {
                        semesterCode = `Kỳ ${semesterNumberMatch[0]}`
                    }


                    // 1. Check duplicate MSSV or Email
                    let user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { Email: email },
                                { StudentCode: mssv }
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
                                StudentCode: mssv,
                                FullName: fullName,
                                Email: email,
                                Phone: phone,
                                Avatar: secureAvatarUrl,
                                PasswordHash: passwordHash,
                                Status: 'Active',
                                RequirePasswordChange: true,
                                UserRole: {
                                    create: {
                                        RoleId: studentRole.Id,
                                        AssignedAt: new Date()
                                    }
                                }
                            }
                        })
                    } else {
                        // Cập nhật Avatar và thông tin nếu user đã tồn tại
                        const dataToUpdate: any = {}
                        if (secureAvatarUrl) dataToUpdate.Avatar = secureAvatarUrl
                        if (mssv && user.StudentCode !== mssv) dataToUpdate.StudentCode = mssv
                        if (fullName && user.FullName !== fullName) dataToUpdate.FullName = fullName
                        if (phone && user.Phone !== phone) dataToUpdate.Phone = phone

                        if (Object.keys(dataToUpdate).length > 0) {
                            user = await prisma.user.update({
                                where: { Id: user.Id },
                                data: dataToUpdate
                            });
                        }
                    }

                    // Store pending enrollments
                    const pendingEnrollments: any[] = []

                    // Main class
                    pendingEnrollments.push({
                        UserId: user.Id,
                        SemesterCode: semesterCode,
                        Season: detectedSeasonInfo.formatted,
                        ClassCode: classCode,
                        SubjectCode: null,
                    })

                    // Extra classes (học vượt / ngoài kỳ) — format: SubjectCode-ClassCode
                    const extraClassesStrs = [
                        ...outOfSemesterStr.split(/[,;]|\s+và\s+|\n|\s+/).map((s: string) => s.trim()).filter(Boolean),
                        ...passedStr.split(/[,;]|\s+và\s+|\n|\s+/).map((s: string) => s.trim()).filter(Boolean)
                    ]

                    for (const extraStr of extraClassesStrs) {
                        const parts = extraStr.split('-')
                        if (parts.length >= 2) {
                            const subjectCode = parts[0].trim()
                            const clsCode = parts.slice(1).join('-').trim()
                            pendingEnrollments.push({
                                UserId: user.Id,
                                SemesterCode: null,
                                Season: detectedSeasonInfo.formatted,
                                ClassCode: clsCode,
                                SubjectCode: subjectCode,
                            })
                        }
                    }

                    // Nợ môn — hỗ trợ 2 format, mở rộng nhận khoảng trắng và ánh xạ song song Lớp Học Lại
                    const retakeStrs = retakeStr.split(/[,;]|\s+và\s+|\n|\s+/).map((s: string) => s.trim()).filter(Boolean)
                    const retakeClassStrs = retakeClassStr.split(/[,;]|\s+và\s+|\n|\s+/).map((s: string) => s.trim()).filter(Boolean)

                    for (let j = 0; j < retakeStrs.length; j++) {
                        const retakeEntry = retakeStrs[j];
                        let subjectCode = retakeEntry;
                        let clsCode = null;

                        if (retakeEntry.includes('-')) {
                            // Support legacy hyphen format (e.g., PRO232-SE17C01)
                            const parts = retakeEntry.split('-')
                            subjectCode = parts[0].trim()
                            clsCode = parts.length >= 2 ? parts.slice(1).join('-').trim() : null
                        } else {
                            // Ánh xạ linh hoạt 1-1, hoặc dùng lớp đầu tiên nếu khai báo ít lớp hơn môn.
                            // GIỮ NULL NẾU KHÔNG CÓ LỚP NỢ ĐỂ KHÔNG PHÁ VỠ HÀNH VI TỰ DÒ (Format 2).
                            const explicitlyProvidedClass = retakeClassStrs[j] || retakeClassStrs[0];
                            clsCode = explicitlyProvidedClass || null;
                        }

                        pendingEnrollments.push({
                            UserId: user.Id,
                            SemesterCode: null,
                            Season: detectedSeasonInfo.formatted,
                            // ClassCode null = auto-find dựa trên Subject.Semester
                            ClassCode: clsCode ?? '__RETAKE_AUTO__',
                            SubjectCode: subjectCode,
                            // Đánh dấu là retake để lookup không giới hạn mùa
                            IsRetake: true,
                            RetakeClassCode: clsCode,
                        })
                    }

                    // Tracking for sync
                    if (semesterCode && classCode) {
                        processedClasses.push({
                            semesterCode: semesterCode,
                            classCode: classCode,
                            userId: user.Id
                        })
                    }

                    for (const extraStr of extraClassesStrs) {
                        const parts = extraStr.split('-')
                        if (parts.length >= 2) {
                            const subjectCode = parts[0].trim()
                            const clsCode = parts.slice(1).join('-').trim()
                            processedClasses.push({
                                subjectCode: subjectCode,
                                classCode: clsCode,
                                userId: user.Id
                            })
                        }
                    }
                    // Track retake classes để sync deletion KHÔNG nhầm xóa
                    for (let j = 0; j < retakeStrs.length; j++) {
                        const retakeEntry = retakeStrs[j];
                        let subjectCode = retakeEntry;
                        let clsCode = null;

                        if (retakeEntry.includes('-')) {
                            const parts = retakeEntry.split('-')
                            subjectCode = parts[0].trim()
                            clsCode = parts.length >= 2 ? parts.slice(1).join('-').trim() : null
                        } else {
                            clsCode = retakeClassStrs[j] || retakeClassStrs[0] || null;
                        }

                        if (clsCode) {
                            processedClasses.push({
                                subjectCode,
                                classCode: clsCode,
                                userId: user.Id,
                                isRetake: true,
                            })
                        }
                    }

                    // Create pending enrollments in DB (avoid exact duplicates)
                    for (const pe of pendingEnrollments) {
                        const existingPe = await (prisma as any).pendingEnrollment.findFirst({
                            where: {
                                UserId: pe.UserId,
                                SemesterCode: pe.SemesterCode,
                                Season: pe.Season,
                                ClassCode: pe.ClassCode,
                                SubjectCode: pe.SubjectCode
                            }
                        })
                        if (!existingPe) {
                            // Strip in-memory-only flags (IsRetake, RetakeClassCode) that
                            // are NOT columns in the PendingEnrollment table before persisting.
                            const { IsRetake, RetakeClassCode, ...dbFields } = pe as any
                            await (prisma as any).pendingEnrollment.create({
                                data: dbFields
                            })
                        }
                    }

                    // Try to enroll immediately if classes exist
                    const classesToEnroll: string[] = []

                    // Precompute IDs of semesters belonging ONLY to the detected season.
                    // This is the single source of truth used everywhere below to prevent
                    // cross-season enrollment (e.g. a Fall2026 import must never touch Spring2026 classes).
                    const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

                    // ── Main class lookup & auto-creation ────────────────────────────────
                    // Match semester by Code scoped to the detected season.
                    const semester = targetSemesters.find(s => s.Code === semesterCode) ?? null

                    if (semester) {
                        const semNumMatch = semester.Code?.match(/\d+/)
                        const semNum = semNumMatch ? parseInt(semNumMatch[0], 10) : null

                        // Find subjects linked to this semester via SemesterSubject or Subject.Semester
                        const semSubjs = await (prisma as any).semesterSubject.findMany({
                            where: { SemesterId: semester.Id },
                            select: { SubjectId: true }
                        })
                        let subjectIds = semSubjs.map((ss: any) => ss.SubjectId)

                        if (semNum !== null) {
                            const directSubjects = await prisma.subject.findMany({
                                where: { Semester: semNum },
                                select: { Id: true }
                            })
                            const directSubjectIds = directSubjects.map(s => s.Id)
                            subjectIds = Array.from(new Set([...subjectIds, ...directSubjectIds]))
                        }

                        for (const subId of subjectIds) {
                            let cls = await prisma.class.findFirst({
                                where: {
                                    SemesterId: semester.Id,
                                    SubjectId: subId,
                                    ClassCode: classCode
                                },
                                select: { Id: true }
                            })

                            if (!cls) {
                                cls = await prisma.class.create({
                                    data: {
                                        ClassCode: classCode,
                                        SubjectId: subId,
                                        SemesterId: semester.Id,
                                        Status: 'Active'
                                    },
                                    select: { Id: true }
                                })
                            }

                            classesToEnroll.push(cls.Id)
                        }

                        // Also find any existing classes that might already exist for this classCode in this semester
                        const existingClasses = await prisma.class.findMany({
                            where: {
                                SemesterId: semester.Id,
                                ClassCode: classCode
                            },
                            select: { Id: true }
                        })
                        classesToEnroll.push(...existingClasses.map(c => c.Id))
                    }

                    // ── Extra classes lookup (học vượt / ngoài kỳ) ──────────────────────
                    // Vẫn giới hạn targetSemesterIds cho extraClasses bình thường
                    // vì chúng thuộc cùng mùa (cross-season prevention).
                    for (const pe of pendingEnrollments) {
                        // Bỏ qua các entry retake — sẽ xử lý riêng bên dưới
                        if ((pe as any).IsRetake) continue
                        if (!pe.SubjectCode || !pe.ClassCode) continue

                        let cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: pe.ClassCode,
                                Subject: { SubjectCode: pe.SubjectCode },
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            },
                            select: { Id: true }
                        })

                        if (!cls) {
                            const targetSubj = await prisma.subject.findUnique({
                                where: { SubjectCode: pe.SubjectCode }
                            })

                            if (targetSubj) {
                                let targetSemId: string | undefined = undefined;

                                if (targetSubj.Semester !== null && targetSubj.Semester !== undefined) {
                                    const expectedCode = `Kỳ ${targetSubj.Semester}`;
                                    const matchedSem = targetSemesters.find(s => s.Code === expectedCode || s.Code === `Semester ${targetSubj.Semester}` || s.Code?.match(/\d+/)?.[0] === String(targetSubj.Semester));
                                    if (matchedSem) {
                                        targetSemId = matchedSem.Id;
                                    }
                                }

                                if (!targetSemId) {
                                    const semSubj = await (prisma as any).semesterSubject.findFirst({
                                        where: {
                                            SubjectId: targetSubj.Id,
                                            SemesterId: { in: Array.from(targetSemesterIds) }
                                        }
                                    })
                                    targetSemId = semSubj?.SemesterId;
                                }

                                if (targetSemId) {
                                    await (prisma as any).semesterSubject.create({
                                        data: {
                                            SemesterId: targetSemId,
                                            SubjectId: targetSubj.Id
                                        },
                                        skipDuplicates: true
                                    }).catch(() => { })

                                    cls = await prisma.class.create({
                                        data: {
                                            ClassCode: pe.ClassCode,
                                            SubjectId: targetSubj.Id,
                                            SemesterId: targetSemId,
                                            Status: 'Active'
                                        }
                                    })
                                }
                            }
                        }

                        if (cls) classesToEnroll.push(cls.Id)
                    }

                    // ── Nợ môn lookup — 3 BƯỚC THEO THUẬT TOÁN BẠN YÊU CẦU ─────────────────────
                    for (const pe of pendingEnrollments) {
                        if (!(pe as any).IsRetake || !pe.SubjectCode) continue

                        // Bước 1: Tìm kiếm môn học trên hệ thống (xem thử nó có bằng nhau không)
                        const retakeSubj = await prisma.subject.findUnique({
                            where: { SubjectCode: pe.SubjectCode }
                        })

                        if (!retakeSubj) {
                            console.warn(`[Import][Retake] Không tìm thấy môn gốc '${pe.SubjectCode}' — bỏ qua`)
                            continue
                        }

                        const retakeClassCode = (pe as any).RetakeClassCode as string | null
                        const targetClassCodeToFind = retakeClassCode || classCode // Format 1 dùng lớp khai báo, Format 2 dùng lớp chính

                        // Bước 2: Tìm kiếm lớp trên hệ thống dựa vào ClassCode và SubjectId.
                        // KHÔNG giới hạn theo KỲ (môn nợ thuộc kỳ trước), nhưng BẮT BUỘC giới hạn
                        // theo MÙA đang import. Trước đây query này không lọc SemesterId nên nó
                        // vớ luôn lớp của mùa khác: import cùng một file vào 2 mùa thì mùa nào
                        // import trước sẽ tạo lớp nợ môn, mùa import sau dùng ké lớp đó và không
                        // tạo lớp nào -> số lớp giữa 2 mùa lệch nhau dù nội dung file y hệt.
                        let cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: targetClassCodeToFind,
                                SubjectId: retakeSubj.Id,
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            },
                            select: { Id: true, SemesterId: true }
                        })

                        if (cls) {
                            classesToEnroll.push(cls.Id)
                            if (!retakeClassCode) console.log(`[Import][Retake-Auto] Tìm thấy class cho môn '${pe.SubjectCode}': ${cls.Id}`)
                        } else if (retakeClassCode) {
                            // Bước 3: Nếu khai báo (Format 1) mà không có lớp trên hệ thống, tự động đi kiếm kì nào chứa môn đó để tạo.
                            // Chỉ tìm trong các kỳ thuộc MÙA đang import — không có fallback sang mùa khác,
                            // vì tạo lớp trong mùa khác sẽ làm sai số lớp của cả hai mùa.
                            let semSubj = await (prisma as any).semesterSubject.findFirst({
                                where: {
                                    SubjectId: retakeSubj.Id,
                                    SemesterId: { in: Array.from(targetSemesterIds) }
                                }
                            })

                            let targetSemId = semSubj?.SemesterId;
                            if (!targetSemId && retakeSubj.Semester !== null && retakeSubj.Semester !== undefined) {
                                const expectedCode = `Kỳ ${retakeSubj.Semester}`;
                                const matchedSem = targetSemesters.find(s => s.Code === expectedCode || s.Code === `Semester ${retakeSubj.Semester}` || s.Code?.match(/\d+/)?.[0] === String(retakeSubj.Semester));
                                if (matchedSem) {
                                    targetSemId = matchedSem.Id;
                                }
                            }

                            if (!targetSemId) {
                                console.warn(`[Import][Retake] Mùa '${detectedSeasonInfo.formatted}' không có kỳ nào chứa môn '${pe.SubjectCode}' — bỏ qua`)
                                continue
                            }

                            await (prisma as any).semesterSubject.create({
                                data: {
                                    SemesterId: targetSemId,
                                    SubjectId: retakeSubj.Id
                                },
                                skipDuplicates: true
                            }).catch(() => { })

                            cls = await prisma.class.create({
                                data: {
                                    ClassCode: retakeClassCode,
                                    SubjectId: retakeSubj.Id,
                                    SemesterId: targetSemId,
                                    Status: 'Active'
                                }
                            })
                            classesToEnroll.push(cls.Id)
                            console.log(`[Import][Retake] Auto-created class '${retakeClassCode}' cho môn nợ '${pe.SubjectCode}' trong kỳ ${targetSemId}`)
                        } else {
                            // Format 2 không tìm thấy thì bỏ qua
                            console.warn(`[Import][Retake-Auto] Không tìm thấy class cho môn '${pe.SubjectCode}' với classCode '${classCode}' — bỏ qua`)
                        }
                    }

                    // Enroll user to classes and update pending enrollment status
                    const uniqueClassesToEnroll = [...new Set(classesToEnroll)]
                    const subjectsList: string[] = []
                    const enrolledClassDetails: string[] = []

                    for (const classId of uniqueClassesToEnroll) {
                        const cls = await prisma.class.findUnique({
                            where: { Id: classId },
                            include: {
                                Subject: true,
                                Semester: true,
                                InstructorClass: {
                                    include: { User: true }
                                }
                            }
                        })
                        if (cls) {
                            if (cls.SubjectId && cls.SemesterId) {
                                // Remove duplicate enrollments for same subject+semester,
                                // but ONLY within the detected season's semesters.
                                // Never touch enrollments in other seasons (Spring, Winter, etc.)
                                if (targetSemesterIds.has(cls.SemesterId)) {
                                    const oldClasses = await prisma.studentClass.findMany({
                                        where: {
                                            UserId: user.Id,
                                            Class: {
                                                SubjectId: cls.SubjectId,
                                                SemesterId: cls.SemesterId,
                                                Id: { not: classId }
                                            }
                                        }
                                    });
                                    for (const old of oldClasses) {
                                        await prisma.studentClass.delete({
                                            where: { UserId_ClassId: { UserId: user.Id, ClassId: old.ClassId } }
                                        });
                                        await prisma.submission.updateMany({
                                            where: { StudentId: user.Id, ClassId: old.ClassId },
                                            data: { ClassId: classId }
                                        });
                                    }
                                }
                            }

                            const existingEnrollment = await prisma.studentClass.findUnique({
                                where: { UserId_ClassId: { UserId: user.Id, ClassId: classId } }
                            })
                            if (!existingEnrollment) {
                                await prisma.studentClass.create({
                                    data: { UserId: user.Id, ClassId: classId, EnrolledAt: new Date() }
                                })
                            }
                            if (cls.Subject) {
                                subjectsList.push(cls.Subject.SubjectCode as string)
                            }

                            // Extract instructors
                            let instructorStr = 'Đang cập nhật'
                            if (cls.InstructorClass && cls.InstructorClass.length > 0) {
                                instructorStr = cls.InstructorClass.map(ic => `${ic.User.FullName} (${ic.User.Email})`).join(', ')
                            }

                            const subjectStr = cls.Subject ? `${cls.Subject.SubjectCode}` : 'Chưa rõ môn'
                            enrolledClassDetails.push(`<li><strong>Môn ${subjectStr} (Lớp: ${cls.ClassCode || classCode}):</strong> Giảng viên: ${instructorStr}</li>`)

                            // Mark related pending enrollments as Enrolled
                            const peQuery: any = {
                                UserId: user.Id,
                                ClassCode: cls.ClassCode,
                            }
                            if (cls.Semester?.Code) {
                                peQuery.SemesterCode = cls.Semester.Code
                            }
                            await (prisma as any).pendingEnrollment.updateMany({
                                where: peQuery,
                                data: { Status: 'Enrolled' }
                            })

                            const peQuery2: any = {
                                UserId: user.Id,
                                ClassCode: cls.ClassCode,
                            }
                            if (cls.Subject?.SubjectCode) {
                                peQuery2.SubjectCode = cls.Subject.SubjectCode
                            }
                            await (prisma as any).pendingEnrollment.updateMany({
                                where: peQuery2,
                                data: { Status: 'Enrolled' }
                            })
                        }
                    }

                    // 6. Send Email Notifications
                    const webUrl = (process.env.FRONTEND_URL || 'https://feaita.edubridge.edu.vn').replace(/\/$/, '')

                    // 6.1. Send Account Creation Email if new user
                    if (rawPassword) {
                        await this.emailService.sendEmail(
                            email,
                            'Thông tin tài khoản hệ thống AITA',
                            `
                                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                                    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
                                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.5px;">Chào mừng đến với AITA</h1>
                                        <p style="color: #ffedd5; margin: 8px 0 0 0; font-size: 15px;">Hệ thống Quản lý & Hỗ trợ Giảng dạy Thông minh</p>
                                    </div>
                                    <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                                        <p style="font-size: 16px; margin-top: 0;">Chào Sinh viên <strong style="color: #0f172a;">${fullName}</strong>,</p>
                                        <p>Tài khoản của bạn đã được khởi tạo thành công. Dưới đây là thông tin đăng nhập của bạn:</p>
                                        
                                        <div style="background: #fff7ed; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #fed7aa;">
                                            <table style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa; color: #9a3412; width: 140px;">Mã Sinh viên:</td>
                                                    <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa; font-weight: 600; color: #9a3412;">${mssv}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa; color: #9a3412;">Email:</td>
                                                    <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa; font-weight: 600; color: #9a3412;">${email}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 12px 0 4px 0; color: #9a3412;">Mật khẩu tạm thời:</td>
                                                    <td style="padding: 12px 0 4px 0;">
                                                        <span style="background: #ea580c; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${rawPassword}</span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>

                                        <div style="text-align: center; margin: 28px 0;">
                                            <a href="${webUrl}/login" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35); letter-spacing: 0.3px;">
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
                        )
                    }

                    // 6.2. Send Class Enrollment Email
                    const classEnrollmentContent = `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 30px 20px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Xếp Lớp Học Phần</h1>
                                <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 15px;">Hệ thống AITA</p>
                            </div>
                            <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                                <p style="font-size: 16px; margin-top: 0;">Chào Sinh viên <strong style="color: #0f172a;">${fullName}</strong>,</p>
                                <p>Bạn vừa được phân bổ vào danh sách lớp học mới. Dưới đây là thông tin chi tiết:</p>
                                
                                <div style="background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #bae6fd;">
                                    <div style="margin-bottom: 12px; border-bottom: 1px solid #bae6fd; padding-bottom: 12px;">
                                        <p style="margin: 0 0 4px 0; color: #0369a1;"><strong>Kỳ học:</strong> ${semesterCode}</p>
                                        <p style="margin: 0; color: #0369a1;"><strong>Lớp định danh:</strong> ${classCode}</p>
                                    </div>
                                    <p style="margin: 0 0 8px 0; color: #0c4a6e; font-weight: 600;">Chi tiết các môn đã xếp lớp:</p>
                                    <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; line-height: 1.8;">
                                        ${enrolledClassDetails.length > 0 ? enrolledClassDetails.join('\n') : '<li>Đang chờ giảng viên tạo lớp, vui lòng theo dõi thêm.</li>'}
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
                    )

                    successCount++
                } catch (err: any) {
                    errorCount++
                    errors.push(`Dòng ${rowIndex} (${getField(row, 'email') || 'Không rõ'}): ${err.message}`)
                }
            }

            // --- SYNC DELETION LOGIC ---
            // Only touches classes that belong to the detected season (targetSemesterIds).
            // Classes from other seasons (e.g. Spring) are never modified.
            try {
                const classRosters = new Map<string, Set<string>>()
                const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

                for (const pc of processedClasses) {
                    const clsIds: string[] = []
                    if (pc.semesterCode && pc.classCode) {
                        // Scope semester lookup to the detected season.
                        // Use findMany to track ALL subject-classes for this semester+classCode,
                        // not just one. This prevents sync-deletion from removing main-class
                        // students (e.g. Tín in Kỳ 1 SE18C02) from shared retake classes
                        // (e.g. PRF192-SE18C02) where a retake student is also enrolled.
                        const semester = targetSemesters.find(s => s.Code === pc.semesterCode) ?? null
                        if (semester) {
                            const classes = await prisma.class.findMany({
                                where: { SemesterId: semester.Id, ClassCode: pc.classCode },
                                select: { Id: true }
                            })
                            clsIds.push(...classes.map(c => c.Id))
                        }
                    } else if (pc.subjectCode && pc.classCode) {
                        // Tìm đúng lớp đã enroll cho Retake / Extra dựa trên logic đồng bộ
                        const targetSubj = await prisma.subject.findUnique({
                            where: { SubjectCode: pc.subjectCode }
                        })
                        if (targetSubj) {
                            let lookupSemesterId: string | undefined = undefined;

                            if (!pc.isRetake) {
                                // Môn extra bình thường: tìm kỳ trong target mùa hiện tại
                                const semSubj = await (prisma as any).semesterSubject.findFirst({
                                    where: {
                                        SubjectId: targetSubj.Id,
                                        SemesterId: { in: Array.from(targetSemesterIds) }
                                    }
                                })
                                lookupSemesterId = semSubj ? semSubj.SemesterId : undefined;
                            }

                            const clsParams: any = {
                                ClassCode: pc.classCode,
                                SubjectId: targetSubj.Id,
                            }
                            if (lookupSemesterId) {
                                clsParams.SemesterId = lookupSemesterId
                            } else {
                                // Lớp nợ môn: không khoá theo 1 kỳ cụ thể, nhưng vẫn phải nằm trong
                                // mùa đang import — nếu không, sync-deletion sẽ đá nhầm sinh viên
                                // ra khỏi lớp của mùa khác.
                                clsParams.SemesterId = { in: Array.from(targetSemesterIds) }
                            }

                            const cls = await prisma.class.findFirst({
                                where: clsParams
                            })
                            if (cls) clsIds.push(cls.Id)
                        }
                    }

                    for (const clsId of clsIds) {
                        if (!classRosters.has(clsId)) {
                            classRosters.set(clsId, new Set())
                        }
                        classRosters.get(clsId)!.add(pc.userId)
                    }
                }

                for (const [classId, validUserIds] of classRosters.entries()) {
                    const currentStudents = await prisma.studentClass.findMany({
                        where: { ClassId: classId },
                        select: { UserId: true }
                    })

                    const studentsToRemove = currentStudents
                        .filter(cs => !validUserIds.has(cs.UserId))
                        .map(cs => cs.UserId)

                    if (studentsToRemove.length > 0) {
                        await prisma.studentClass.deleteMany({
                            where: { ClassId: classId, UserId: { in: studentsToRemove } }
                        })

                        const cls = await prisma.class.findUnique({
                            where: { Id: classId },
                            include: { Semester: true, Subject: true }
                        })
                        if (cls) {
                            const orConditions: any[] = []
                            if (cls.Semester?.Code) orConditions.push({ SemesterCode: cls.Semester.Code })
                            if (cls.Subject?.SubjectCode) orConditions.push({ SubjectCode: cls.Subject.SubjectCode })

                            await (prisma as any).pendingEnrollment.updateMany({
                                where: {
                                    UserId: { in: studentsToRemove },
                                    ClassCode: cls.ClassCode,
                                    OR: orConditions.length > 0 ? orConditions : undefined
                                },
                                data: { Status: 'Cancelled' }
                            })
                        }
                    }
                }
            } catch (syncErr) {
                console.error('Failed to sync deletions:', syncErr)
            }

            // Update batch final status
            let errorDetailsStr = JSON.stringify(errors)
            if (errorDetailsStr.length > 3900) {
                // Keep safe even if schema is NVarChar(Max), in case of SQL Driver limits.
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

            return {
                batchId: finalBatch.Id,
                detectedSeason: detectedSeasonInfo.formatted,
                totalProcessed: rows.length,
                successCount,
                errorCount,
                errors
            }
        } catch (err: any) {
            // Only mark batch as failed if it was created successfully
            if (batch?.Id) {
                let errorDetailsStr = err.message || 'Unknown error'
                if (errorDetailsStr.length > 3900) {
                    errorDetailsStr = errorDetailsStr.substring(0, 3900) + '... (truncated)'
                }
                await prisma.importBatch.update({
                    where: { Id: batch.Id },
                    data: {
                        Status: 'FAILED',
                        ErrorDetails: errorDetailsStr
                    }
                }).catch(() => { }) // Silently fail if batch update fails
            }
            throw err
        }
    }
}
