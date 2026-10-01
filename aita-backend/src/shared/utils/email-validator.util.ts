import net from 'node:net'
import dns from 'node:dns/promises'

// Cache kết quả kiểm tra từng email cụ thể (hộp thư) để không phải bắt tay SMTP nhiều lần
const mailboxCheckCache = new Map<string, { isValid: boolean; reason?: string }>()

// Cache danh sách máy chủ MX của từng domain
const domainMxCache = new Map<string, { isValid: boolean; mxHost?: string; reason?: string }>()

// Danh sách các domain email tạm thời / rác / giả lập thường gặp
const DISPOSABLE_OR_DUMMY_DOMAINS = new Set([
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'fake.com',
    'tempmail.com',
    '10minutemail.com',
    'mailinator.com',
    'guerrillamail.com',
    'sharklasers.com',
    'yopmail.com',
    'trashmail.com',
    'dispostable.com',
    'getairmail.com',
    'throwawaymail.com',
    'maildrop.cc',
    'temp-mail.org',
    'crazymailing.com'
])

export interface EmailValidationResult {
    isValid: boolean
    reason?: string
}

/**
 * Kiểm tra xác thực hộp thư thực tế qua giao thức SMTP (gửi RCPT TO tới máy chủ thư).
 * Trả về kết quả xem hòm thư (ví dụ: Google Mail) có thực sự tồn tại hay bị khóa/không tồn tại.
 */
async function verifySmtpMailbox(email: string, mxHost: string, domain: string): Promise<EmailValidationResult> {
    return new Promise((resolve) => {
        let resolved = false
        let client: net.Socket | null = null

        const finish = (result: EmailValidationResult) => {
            if (!resolved) {
                resolved = true
                if (client) {
                    try { client.write('QUIT\r\n') } catch (_) {}
                    try { client.destroy() } catch (_) {}
                }
                resolve(result)
            }
        }

        try {
            client = net.createConnection(25, mxHost)
            client.setTimeout(4000)
            client.setEncoding('utf8')

            let step = 0

            client.on('data', (chunk: Buffer | string) => {
                const line = chunk.toString().trim()
                const code = line.substring(0, 3)

                if (step === 0 && code === '220') {
                    step = 1
                    client?.write('HELO aita.edu.vn\r\n')
                } else if (step === 1 && code === '250') {
                    step = 2
                    client?.write('MAIL FROM:<check@aita.edu.vn>\r\n')
                } else if (step === 2 && code === '250') {
                    step = 3
                    client?.write(`RCPT TO:<${email}>\r\n`)
                } else if (step === 3) {
                    if (code === '250') {
                        // Máy chủ chấp nhận người nhận: Hộp thư tồn tại và hoạt động!
                        finish({ isValid: true })
                    } else if (code.startsWith('5')) {
                        // Máy chủ từ chối: Hộp thư không tồn tại hoặc bị khóa
                        let reasonDetail = `Tài khoản email không tồn tại trên máy chủ ${domain}`
                        if (line.includes('DisabledUser') || line.includes('inactive')) {
                            reasonDetail = `Tài khoản email '${email}' đã bị vô hiệu hóa hoặc không còn hoạt động trên máy chủ thư`
                        } else if (line.includes('NoSuchUser') || line.includes('does not exist')) {
                            reasonDetail = `Tài khoản email '${email}' không tồn tại trên máy chủ thư (${domain})`
                        }
                        finish({
                            isValid: false,
                            reason: reasonDetail
                        })
                    } else {
                        // Các mã tạm thời (greylisting 450/451...), chấp nhận hợp lệ để không chặn oan
                        finish({ isValid: true })
                    }
                }
            })

            client.on('error', () => {
                // Nếu cổng 25 bị chặn bởi ISP/tường lửa, bỏ qua bước SMTP để không cản trở
                finish({ isValid: true })
            })

            client.on('timeout', () => {
                finish({ isValid: true })
            })
        } catch {
            finish({ isValid: true })
        }
    })
}

/**
 * Kiểm tra toàn diện email thật:
 * 1. Cú pháp RFC
 * 2. Bộ lọc Blacklist domain rác/tạm thời
 * 3. Kiểm tra máy chủ nhận thư (DNS MX Record)
 * 4. Bắt tay trực tiếp máy chủ thư để kiểm tra sự tồn tại của hòm thư (SMTP Mailbox Verification)
 */
export async function validateRealEmail(email: string): Promise<EmailValidationResult> {
    if (!email || typeof email !== 'string') {
        return { isValid: false, reason: 'Email không được để trống' }
    }

    const trimmed = email.trim().toLowerCase()

    // 1. Kiểm tra định dạng cơ bản theo chuẩn RFC
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!emailRegex.test(trimmed)) {
        return { isValid: false, reason: `Email '${email}' sai định dạng cú pháp` }
    }

    const parts = trimmed.split('@')
    if (parts.length !== 2) {
        return { isValid: false, reason: `Email '${email}' chứa nhiều hơn một ký tự '@'` }
    }

    const [userPart, domainPart] = parts

    if (!userPart || userPart.length > 64) {
        return { isValid: false, reason: `Tên người dùng trong email '${email}' vượt quá 64 ký tự` }
    }

    if (!domainPart || domainPart.length > 255 || !domainPart.includes('.')) {
        return { isValid: false, reason: `Tên miền '${domainPart}' trong email không hợp lệ` }
    }

    // 2. Chặn các tên miền email tạm thời / rác
    if (DISPOSABLE_OR_DUMMY_DOMAINS.has(domainPart)) {
        return {
            isValid: false,
            reason: `Tên miền '${domainPart}' là email ảo/tạm thời (disposable mail). Hệ thống yêu cầu dùng email thật của tổ chức hoặc cá nhân.`
        }
    }

    // Kiểm tra cache hòm thư đã từng check
    if (mailboxCheckCache.has(trimmed)) {
        return mailboxCheckCache.get(trimmed)!
    }

    // 3. Tra cứu máy chủ thư (DNS MX)
    let mxHost: string | undefined
    if (domainMxCache.has(domainPart)) {
        const cachedDomain = domainMxCache.get(domainPart)!
        if (!cachedDomain.isValid) {
            return { isValid: false, reason: cachedDomain.reason }
        }
        mxHost = cachedDomain.mxHost
    } else {
        try {
            const mxRecords = await dns.resolveMx(domainPart)
            if (!mxRecords || mxRecords.length === 0) {
                const failReason = `Tên miền '${domainPart}' không có máy chủ nhận email (Không có bản ghi DNS MX). Email này không thể nhận thư.`
                domainMxCache.set(domainPart, { isValid: false, reason: failReason })
                return { isValid: false, reason: failReason }
            }

            mxRecords.sort((a, b) => a.priority - b.priority)
            mxHost = mxRecords[0].exchange
            domainMxCache.set(domainPart, { isValid: true, mxHost })
        } catch (err: any) {
            let failReason = `Tên miền '${domainPart}' không tồn tại hoặc không tìm thấy máy chủ thư trên mạng Internet.`
            if (err.code === 'ENOTFOUND' || err.code === 'NXDOMAIN') {
                failReason = `Tên miền '${domainPart}' không tồn tại trên Internet (Email ảo hoặc sai chính tả).`
            } else if (err.code === 'ENODATA') {
                failReason = `Tên miền '${domainPart}' không được cấu hình máy chủ nhận thư điện tử (Thiếu bản ghi MX).`
            }
            domainMxCache.set(domainPart, { isValid: false, reason: failReason })
            return { isValid: false, reason: failReason }
        }
    }

    // 4. Bắt tay SMTP trực tiếp để kiểm tra hòm thư có tồn tại trên máy chủ không
    let result: EmailValidationResult = { isValid: true }
    if (mxHost) {
        result = await verifySmtpMailbox(trimmed, mxHost, domainPart)
    }

    mailboxCheckCache.set(trimmed, result)
    return result
}
