const DAY = 86_400_000
export function localDate(date: Date) { return new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10) }
function parseDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Ngày không hợp lệ.')
    const parsed = new Date(`${value}T00:00:00+07:00`)
    if (!Number.isFinite(parsed.getTime()) || localDate(parsed) !== value) throw new RangeError('Ngày không hợp lệ.')
    return parsed
}
export function reportRange(period: string, now = new Date(), startDate?: string, endDate?: string, semester?: { StartDate: Date | null; EndDate: Date | null } | null) {
    const today = parseDate(localDate(now))
    let start: Date, end = new Date(today.getTime() + DAY)
    if (period === 'custom') {
        start = parseDate(startDate || '')
        end = new Date(parseDate(endDate || '').getTime() + DAY)
    } else if (period === 'semester') {
        if (!semester?.StartDate || !semester.EndDate) throw new RangeError('Chưa cấu hình ngày bắt đầu và kết thúc học kỳ đang hoạt động.')
        start = parseDate(localDate(semester.StartDate))
        end = new Date(Math.min(parseDate(localDate(semester.EndDate)).getTime() + DAY, end.getTime()))
    } else if (period === 'year') start = parseDate(`${localDate(now).slice(0,4)}-01-01`)
    else if (period === '7d' || period === '30d') start = new Date(end.getTime() - (period === '7d' ? 7 : 30) * DAY)
    else throw new RangeError('Khoảng thời gian báo cáo không hợp lệ.')
    if (end <= start || end.getTime() - start.getTime() > 366 * DAY) throw new RangeError('Khoảng thời gian phải hợp lệ và không vượt quá 366 ngày.')
    return { start, end, from: localDate(start), to: localDate(new Date(end.getTime() - DAY)), timezone: 'Asia/Ho_Chi_Minh' }
}
