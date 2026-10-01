import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import { AppError } from '../../../../shared/application/app.error.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'
import { getAvatarFromRow, normalizeExcelHeader, resolveCloudinaryAvatarUrl } from '../../../../shared/utils/avatar-extractor.util.js'
import { validateRealEmail } from '../../../../shared/utils/email-validator.util.js'

const prisma = new PrismaClient()

type ImportLecturerRow = Record<string, unknown>

const HEADER_ALIASES: Record<string, string[]> = {
    code: ['mã', 'ma', 'mã giảng viên', 'instructor code', 'lecturer code', 'mssv/gv', 'mã gv', 'ma gv', 'gv', 'giảng viên', 'giang vien'],
    fullName: ['họ và tên', 'ho va ten', 'full name', 'fullname', 'tên', 'name', 'họ tên', 'ho ten'],
    email: ['email', 'gmail', 'email address'],
    subjects: ['môn dạy', 'mon day', 'subjects', 'môn', 'mon'],
    classes: ['lớp dạy', 'lop day', 'classes', 'lớp', 'lop'],
    avatar: ['avatar', 'ảnh đại diện', 'anh dai dien', 'hình ảnh', 'hinh anh', 'ảnh', 'anh', 'hình', 'hinh', 'avatar url', 'avatar_url', 'link avatar', 'link_avatar', 'link anh', 'link ảnh', 'link hinh', 'link hình', 'url anh', 'url ảnh', 'image', 'picture', 'photo', 'profile picture', 'profile_picture', 'cloudinary', 'link cloudinary', 'ảnh cá nhân', 'anh ca nhan', 'hình cá nhân', 'hinh ca nhan']
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

export class PreviewImportLecturersExcelUseCase {
    async execute(input: { fileBuffer: Buffer; fileName: string }) {
        const { fileBuffer, fileName } = input

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

        // 1. SEASON DETECTION: Extract and validate season from filename
        let detectedSeasonInfo
        try {
            detectedSeasonInfo = detectSeasonFromFilename(fileName)
        } catch (err: any) {
            const errorMsg = err instanceof SeasonDetectorError
                ? err.message
                : 'Không thể xác định mùa học từ tên file'
            throw new AppError('INVALID_SEASON', errorMsg, 400)
        }

        // 2. VALIDATE SEASON EXISTS
        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        if (targetSemesters.length === 0) {
            const errorMsg = `Mùa '${detectedSeasonInfo.formatted}' được phát hiện từ tên file không tồn tại trong hệ thống. Vui lòng tạo kỳ học cho mùa này trước khi import, hoặc đổi tên file sang đúng mùa học hiện có (ví dụ: Spring2026_lecturers.xlsx).`
            throw new AppError('SEASON_NOT_FOUND', errorMsg, 404)
        }

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

        const targetSemesterIds = targetSemesters.map(s => s.Id)

        // Maps kiểm tra trùng lặp tài khoản
        const existingUsers = await prisma.user.findMany({
            select: { LecturerCode: true, StudentCode: true, FullName: true, Email: true }
        })

        const dbLecturerCodeMap = new Map<string, { fullName: string; email?: string }>()
        const dbEmailMap = new Map<string, { fullName: string; code?: string }>()

        for (const u of existingUsers) {
            if (u.LecturerCode) dbLecturerCodeMap.set(u.LecturerCode.trim().toUpperCase(), { fullName: u.FullName || '', email: u.Email || '' })
            if (u.Email) dbEmailMap.set(u.Email.trim().toLowerCase(), { fullName: u.FullName || '', code: u.LecturerCode || u.StudentCode || '' })
        }

        const fileLecturerCodeMap = new Map<string, { row: number; fullName: string }>()
        const fileEmailMap = new Map<string, { row: number; fullName: string }>()

        // Maps kiểm tra xung đột phân công (Chung môn & Chung lớp)
        const dbAssignments = await prisma.instructorClass.findMany({
            where: {
                Class: {
                    SemesterId: { in: targetSemesterIds }
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

        const previewRows = []
        let hasErrors = false

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowIndex = i + 2

            const isRowEmpty = Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '')
            if (isRowEmpty) {
                hasErrors = true
                previewRows.push({
                    index: rowIndex,
                    code: '',
                    fullName: '',
                    email: '',
                    subjects: '',
                    classes: '',
                    avatar: '',
                    isValid: false,
                    errors: ['Hàng này đang để trống hoàn toàn. Vui lòng điền thông tin hoặc xóa dòng trống này.']
                })
                continue
            }

            const code = getField(row, 'code')
            const fullName = getField(row, 'fullName')
            const email = getField(row, 'email')
            const subjectsStr = getField(row, 'subjects') || ''
            const classesStr = getField(row, 'classes') || ''
            const rawAvatar = getAvatarFromRow(row) || ''
            const avatar = await resolveCloudinaryAvatarUrl(rawAvatar) || ''

            const errors: string[] = []

            if (!code) errors.push('Thiếu mã giảng viên (MSSV/GV)')
            if (!fullName) errors.push('Thiếu họ và tên')
            if (!email) errors.push('Thiếu email')
            if (!subjectsStr) errors.push('Thiếu môn dạy')
            if (!classesStr) errors.push('Thiếu lớp dạy')

            // Kiểm tra trùng lặp mã giảng viên
            if (code) {
                const normCode = code.trim().toUpperCase()
                const normFullName = (fullName || '').trim().toLowerCase()
                const prevInFile = fileLecturerCodeMap.get(normCode)

                if (prevInFile) {
                    if (normFullName && prevInFile.fullName.trim().toLowerCase() === normFullName) {
                        errors.push(`Trùng lặp: Giảng viên '${fullName}' (Mã: ${code}) bị trùng lặp với dòng ${prevInFile.row}`)
                    } else {
                        errors.push(`Trùng mã: Mã '${code}' bị trùng với giảng viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}`)
                    }
                } else {
                    fileLecturerCodeMap.set(normCode, { row: rowIndex, fullName: fullName || '' })
                }

                const existingInDb = dbLecturerCodeMap.get(normCode)
                if (existingInDb) {
                    if (normFullName && existingInDb.fullName.trim().toLowerCase() === normFullName) {
                        // Đã có trong DB cùng mã và tên
                    } else {
                        errors.push(`Trùng mã: Mã '${code}' đã được cấp cho giảng viên '${existingInDb.fullName}' trong hệ thống`)
                    }
                }
            }

            // Kiểm tra trùng lặp email
            if (email) {
                const normEmail = email.trim().toLowerCase()
                if (normEmail) {
                    const prevInFile = fileEmailMap.get(normEmail)
                    if (prevInFile) {
                        errors.push(`Trùng Email: Email '${email}' bị trùng với giảng viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}`)
                    } else {
                        fileEmailMap.set(normEmail, { row: rowIndex, fullName: fullName || '' })
                    }

                    const existingInDb = dbEmailMap.get(normEmail)
                    if (existingInDb && code && existingInDb.code && existingInDb.code.toUpperCase() !== code.trim().toUpperCase()) {
                        errors.push(`Trùng Email: Email '${email}' đã được đăng ký cho tài khoản '${existingInDb.fullName}' trong hệ thống`)
                    }
                }

                const emailValidation = await validateRealEmail(email)
                if (!emailValidation.isValid) {
                    errors.push(`Email không hợp lệ hoặc không có thật (${emailValidation.reason})`)
                }
            }

            // Validate matching pairs và kiểm tra xung đột phân công chung lớp chung môn
            const subjects = subjectsStr.split(/[,;]|\s+và\s+|\n|\s+/).map(s => s.trim()).filter(Boolean)
            const classes = classesStr.split(/[,;]|\s+và\s+|\n|\s+/).map(s => s.trim()).filter(Boolean)

            if (subjects.length > 0 && classes.length === 0) {
                errors.push('Có môn dạy nhưng không có lớp dạy nào')
            }

            if (code && subjects.length > 0 && classes.length > 0) {
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
                                errors.push(`Trùng lặp: Giảng viên đã được phân công môn '${s}' lớp '${c}' ở dòng ${prevAssigned.row}`)
                            } else {
                                errors.push(`Xung đột phân công: Môn '${s}' của lớp '${c}' đã được phân công cho giảng viên '${prevAssigned.lecturerName}' (Mã: ${prevAssigned.lecturerCode}) ở dòng ${prevAssigned.row}`)
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
                            errors.push(`Xung đột phân công: Môn '${s}' của lớp '${c}' hiện đã được phân công cho giảng viên '${existingInDb.lecturerName}' (Mã: ${existingInDb.lecturerCode}) trên hệ thống`)
                        }
                    }
                }
            }

            if (errors.length > 0) hasErrors = true

            previewRows.push({
                index: rowIndex,
                code: code || '',
                fullName: fullName || '',
                email: email || '',
                subjects: subjects.join(', ') || '',
                classes: classes.join(', ') || '',
                avatar: avatar,
                isValid: errors.length === 0,
                errors: errors
            })
        }

        return {
            detectedSeason: detectedSeasonInfo.formatted,
            totalRows: previewRows.length,
            hasErrors,
            rows: previewRows
        }
    }
}
