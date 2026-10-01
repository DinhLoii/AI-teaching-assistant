import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import { AppError } from '../../../../shared/application/app.error.js'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'
import { getAvatarFromRow, normalizeExcelHeader, resolveCloudinaryAvatarUrl } from '../../../../shared/utils/avatar-extractor.util.js'
import { validateRealEmail } from '../../../../shared/utils/email-validator.util.js'

const prisma = new PrismaClient()

type ImportStudentRow = Record<string, unknown>

const HEADER_ALIASES: Record<string, string[]> = {
    mssv: ['mssv', 'student id', 'studentid', 'student code', 'mssv/gv', 'ma sinh vien', 'mã sinh viên', 'ma sv', 'mã sv'],
    fullName: ['họ và tên', 'ho va ten', 'full name', 'fullname', 'họ tên', 'ho ten', 'tên', 'name'],
    email: ['email', 'gmail', 'email address'],
    phone: ['số điện thoại', 'so dien thoai', 'phone number', 'phone', 'sđt', 'sdt'],
    semester: ['kỳ học', 'kì học', 'ky hoc', 'ki hoc', 'semester', 'kỳ', 'kì', 'ky', 'ki', 'mùa', 'mua'],
    classCode: ['lớp học', 'lop hoc', 'class', 'lớp', 'lop', 'mã lớp', 'ma lop', 'class code'],
    password: ['mật khẩu tạm thời', 'mat khau tam thoi', 'mật khẩu', 'mat khau', 'password', 'temp password'],
    avatar: ['avatar', 'ảnh đại diện', 'anh dai dien', 'hình ảnh', 'hinh anh', 'ảnh', 'anh', 'hình', 'hinh', 'avatar url', 'avatar_url', 'link avatar', 'link_avatar', 'link anh', 'link ảnh', 'link hinh', 'link hình', 'url anh', 'url ảnh', 'image', 'picture', 'photo', 'profile picture', 'profile_picture', 'cloudinary', 'link cloudinary', 'ảnh cá nhân', 'anh ca nhan', 'hình cá nhân', 'hinh ca nhan']
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

export class PreviewImportStudentsExcelUseCase {
    async execute(input: { fileBuffer: Buffer; fileName: string }) {
        const { fileBuffer, fileName } = input

        const normalizedName = fileName.toLowerCase()
        if (!normalizedName.includes('student') && !normalizedName.includes('học sinh') && !normalizedName.includes('hoc_sinh') && !normalizedName.includes('hs') && !normalizedName.includes('sinh viên') && !normalizedName.includes('sinh_vien') && !normalizedName.includes('sv')) {
            throw new AppError('INVALID_FILE_NAME', 'Tên file không hợp lệ. Vui lòng đặt tên file có chứa từ khoá "student", "sinh viên", "học sinh" hoặc "sv" (ví dụ: Student_Spring2026.xlsx)', 400)
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
            const errorMsg = `Mùa '${detectedSeasonInfo.formatted}' được phát hiện từ tên file không tồn tại trong hệ thống. Vui lòng tạo kỳ học cho mùa này trước khi import, hoặc đổi tên file sang đúng mùa học hiện có (ví dụ: Spring2026_students.xlsx).`
            throw new AppError('SEASON_NOT_FOUND', errorMsg, 404)
        }

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

        const existingUsers = await prisma.user.findMany({
            select: { StudentCode: true, LecturerCode: true, FullName: true, Email: true }
        })

        const dbStudentCodeMap = new Map<string, { fullName: string; email?: string }>()
        const dbEmailMap = new Map<string, { fullName: string; studentCode?: string }>()

        for (const u of existingUsers) {
            if (u.StudentCode) dbStudentCodeMap.set(u.StudentCode.trim().toUpperCase(), { fullName: u.FullName || '', email: u.Email || '' })
            if (u.Email) dbEmailMap.set(u.Email.trim().toLowerCase(), { fullName: u.FullName || '', studentCode: u.StudentCode || u.LecturerCode || '' })
        }

        const fileStudentCodeMap = new Map<string, { row: number; fullName: string }>()
        const fileEmailMap = new Map<string, { row: number; fullName: string }>()

        const previewRows = []
        let hasErrors = false

        const semesters = targetSemesters

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowIndex = i + 2

            const isRowEmpty = Object.values(row).every(v => v === undefined || v === null || String(v).trim() === '')
            if (isRowEmpty) {
                hasErrors = true
                previewRows.push({
                    index: rowIndex,
                    mssv: '',
                    fullName: '',
                    email: '',
                    phone: '',
                    semester: '',
                    className: '',
                    avatar: '',
                    isValid: false,
                    errors: ['Hàng này đang để trống hoàn toàn. Vui lòng điền thông tin hoặc xóa dòng trống này.']
                })
                continue
            }

            const mssv = getField(row, 'mssv')
            const fullName = getField(row, 'fullName')
            const email = getField(row, 'email')
            const phone = getField(row, 'phone')
            const semesterCode = getField(row, 'semester')
            const classCode = getField(row, 'classCode')
            const password = getField(row, 'password') || ''
            const rawAvatar = getAvatarFromRow(row) || ''
            const avatar = await resolveCloudinaryAvatarUrl(rawAvatar) || ''

            const errors: string[] = []

            const missing: string[] = []
            if (!mssv) missing.push('MSSV (hoặc MSSV/GV)')
            if (!fullName) missing.push('Họ và tên')
            if (!email) missing.push('Email')
            if (!semesterCode) missing.push('Kỳ học')
            if (!classCode) missing.push('Lớp học')

            if (missing.length > 0) {
                errors.push(`Chỗ này đang để trống: ${missing.join(', ')}. Bắt buộc phải điền đầy đủ dữ liệu theo hàng.`)
            }

            // Kiểm tra trùng lặp mã sinh viên (MSSV) và họ tên
            if (mssv) {
                const normMssv = mssv.trim().toUpperCase()
                const normFullName = (fullName || '').trim().toLowerCase()
                const prevInFile = fileStudentCodeMap.get(normMssv)

                if (prevInFile) {
                    if (normFullName && prevInFile.fullName.trim().toLowerCase() === normFullName) {
                        errors.push(`Trùng lặp: Sinh viên '${fullName}' (MSSV: ${mssv}) bị trùng lặp với dòng ${prevInFile.row}`)
                    } else {
                        errors.push(`Trùng mã: MSSV '${mssv}' bị trùng với sinh viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}`)
                    }
                } else {
                    fileStudentCodeMap.set(normMssv, { row: rowIndex, fullName: fullName || '' })
                }

                const existingInDb = dbStudentCodeMap.get(normMssv)
                if (existingInDb) {
                    if (normFullName && existingInDb.fullName.trim().toLowerCase() === normFullName) {
                        // Sinh viên đã tồn tại trong hệ thống (cùng tên, cùng mã)
                    } else {
                        errors.push(`Trùng mã: MSSV '${mssv}' đã được cấp cho sinh viên '${existingInDb.fullName}' trong hệ thống`)
                    }
                }
            }

            // Kiểm tra trùng lặp email
            if (email) {
                const normEmail = email.trim().toLowerCase()
                if (normEmail) {
                    const prevInFile = fileEmailMap.get(normEmail)
                    if (prevInFile) {
                        errors.push(`Trùng Email: Email '${email}' bị trùng với sinh viên '${prevInFile.fullName}' ở dòng ${prevInFile.row}`)
                    } else {
                        fileEmailMap.set(normEmail, { row: rowIndex, fullName: fullName || '' })
                    }

                    const existingInDb = dbEmailMap.get(normEmail)
                    if (existingInDb && mssv && existingInDb.studentCode && existingInDb.studentCode.toUpperCase() !== mssv.trim().toUpperCase()) {
                        errors.push(`Trùng Email: Email '${email}' đã được đăng ký cho tài khoản '${existingInDb.fullName}' trong hệ thống`)
                    }
                }

                const emailValidation = await validateRealEmail(email)
                if (!emailValidation.isValid) {
                    errors.push(`Email không hợp lệ hoặc không có thật (${emailValidation.reason})`)
                }
            }

            let resolvedSemesterCode = semesterCode
            // Validate semester exists within the detected season only
            if (semesterCode) {
                const semesterNumberMatch = semesterCode.match(/\d+/)
                const semesterNumber = semesterNumberMatch ? parseInt(semesterNumberMatch[0], 10) : null

                const existingSemester = semesters.find(s => {
                    if (s.Code === semesterCode) return true
                    if (s.Code?.toLowerCase() === semesterCode.toLowerCase()) return true
                    const sNumMatch = s.Code?.match(/\d+/)
                    const sNum = sNumMatch ? parseInt(sNumMatch[0], 10) : null
                    return sNum !== null && sNum === semesterNumber
                })

                if (existingSemester && existingSemester.Code) {
                    resolvedSemesterCode = existingSemester.Code
                } else {
                    errors.push(`Kỳ học "${semesterCode}" không tồn tại trong mùa ${detectedSeasonInfo.formatted}`)
                }
            }

            if (errors.length > 0) hasErrors = true

            previewRows.push({
                index: rowIndex,
                mssv: mssv || '',
                fullName: fullName || '',
                email: email || '',
                phone: phone || '',
                semester: resolvedSemesterCode || '',
                className: classCode || '',
                password: password,
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
