'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { RefreshAction } from '@/components/actions/RefreshAction'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useNotifications } from '@/providers/notification-provider'
import { useAdminAnalytics } from '../hooks/useAdminAnalytics'
import { RoleDistribution } from '../components/RoleDistribution'

const gradeLabels = ['Xuất sắc (9–10)', 'Giỏi (8–<9)', 'Khá (6.5–<8)', 'Trung bình (5–<6.5)', 'Cần cải thiện (<5)']
const gradeColors = ['#10b981', '#14b8a6', '#f59e0b', '#f97316', '#f43f5e']
const dateLabel = (date: string) => date.split('-').reverse().join('/')
function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  URL.revokeObjectURL(url)
}

export default function AdminReportsPage() {
  const [period, setPeriod] = React.useState<'7d' | '30d' | 'semester' | 'year' | 'custom'>('30d')
  const [start, setStart] = React.useState('')
  const [end, setEnd] = React.useState('')
  const [custom, setCustom] = React.useState({ start: '', end: '' })
  const [chartMode, setChartMode] = React.useState<'area' | 'bar'>('area')
  const { report, loading, refreshing, error, refresh } = useAdminAnalytics(period, period === 'custom' ? custom.start : undefined, period === 'custom' ? custom.end : undefined)
  const { isConnected } = useNotifications()
  const trend = report?.trend || []
  const maximum = Math.ceil(Math.max(4, ...trend.flatMap(item => [item.submissions, item.evaluated])) / 4) * 4
  const xAt = (index: number) => trend.length === 1 ? 495 : 30 + index / (trend.length - 1) * 930
  const hasActivity = trend.some(item => item.submissions || item.evaluated)
  const points = (field: 'submissions' | 'evaluated') => trend.map((item, index) => `${xAt(index)},${220 - item[field] / maximum * 180}`).join(' ')
  const count = report?.grades.count || 0
  const inputStyle = 'h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs'
  const exportCSV = () => {
    if (!report) return
    const rows: (string | number)[][] = [['Phạm vi', report.range.from, report.range.to, report.range.timezone], ['Ngày', 'Bài nộp', 'Hoàn tất chấm'], ...report.trend.map(item => [item.date, item.submissions, item.evaluated]), [], ['Vai trò', 'Số tài khoản'], ...report.roles.map(item => [item.role, item.count]), [], ['Điểm đã công bố, lần nộp mới nhất, thang 10'], ['Điểm trung bình', report.grades.average ?? 'Chưa có'], ...report.grades.bins.map((n, i) => [gradeLabels[i], n])]
    download('\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n'), `AITA-${report.range.from}-${report.range.to}.csv`, 'text/csv;charset=utf-8')
  }
  return <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel="Quản trị viên" requiredRole="admin" headerTitle="Báo cáo & Thống kê" headerSubtitle="Thống kê từ dữ liệu thực tế của hệ thống">
    <div className="space-y-6 pb-8 text-slate-900 dark:text-white">
      <Card className="p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-xl font-bold">Báo cáo & Thống kê</h1><p className="text-xs text-slate-500 mt-1" role="status">{isConnected ? 'Đã kết nối cập nhật tự động' : 'Đang kết nối · tự đồng bộ định kỳ'}{refreshing && report ? ' · Đang cập nhật...' : ''}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={!report} onClick={exportCSV}>Xuất CSV</Button>
            <Button variant="outline" size="sm" disabled={!report} onClick={() => report && download(JSON.stringify(report, null, 2), 'AITA-report.json', 'application/json')}>Xuất JSON</Button>
            <RefreshAction onRefresh={refresh} disabled={loading} busy={refreshing} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label="Khoảng thời gian báo cáo" className={inputStyle} value={period} onChange={event => setPeriod(event.target.value as typeof period)}>
            <option value="7d">7 ngày qua</option><option value="30d">30 ngày qua</option><option value="semester">Học kỳ đang hoạt động</option><option value="year">Từ đầu năm</option><option value="custom">Tùy chọn ngày</option>
          </select>
          {period === 'custom' && <><input type="date" aria-label="Từ ngày" className={inputStyle} value={start} onChange={event => setStart(event.target.value)} /><input type="date" aria-label="Đến ngày" className={inputStyle} value={end} onChange={event => setEnd(event.target.value)} /><Button size="sm" disabled={!start || !end || end < start} onClick={() => setCustom({ start, end })}>Áp dụng</Button></>}
          {report && <span className="text-xs text-slate-500">{dateLabel(report.range.from)} – {dateLabel(report.range.to)} · Giờ Việt Nam (UTC+7)</span>}
        </div>
        {report && <p className="text-xs text-slate-500">Cập nhật lúc {new Date(report.generatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Tài khoản, lớp và bài tập là tổng hiện tại; bài nộp và điểm được lọc theo khoảng ngày.</p>}
      </Card>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}{report && ' Đang giữ số liệu từ lần cập nhật thành công gần nhất.'}</div>}
      {loading && <div role="status" className="p-10 text-center text-slate-500">Đang tải thống kê...</div>}
      {period === 'custom' && !custom.start && <p className="py-10 text-center text-slate-500">Chọn ngày bắt đầu, ngày kết thúc rồi bấm Áp dụng.</p>}
      {report && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[['Tổng tài khoản', report.summary.users], ['Tổng lớp học', report.summary.classes], ['Bài tập đang lưu hành', report.summary.exams], ['Bài nộp trong khoảng ngày', report.summary.submissions]].map(([label, value]) => <Card key={label} className="p-5 rounded-2xl"><p className="text-xs text-slate-500 uppercase font-semibold">{label}</p><strong className="block mt-3 text-3xl tabular-nums">{value}</strong></Card>)}
        </div>
        <Card className="p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Nộp bài & Hoàn tất chấm theo ngày</h2><p className="text-xs text-slate-500 mt-1">Mỗi lần nộp tính một lượt. Hoàn tất chấm tính theo ngày chấm, có thể thuộc bài nộp trước khoảng ngày này.</p></div><div className="flex gap-2"><Button size="sm" variant={chartMode === 'area' ? 'primary' : 'outline'} onClick={() => setChartMode('area')}>Đường</Button><Button size="sm" variant={chartMode === 'bar' ? 'primary' : 'outline'} onClick={() => setChartMode('bar')}>Cột</Button></div></div>
          <div className="flex flex-wrap gap-5 text-xs"><span className="text-indigo-600">● Bài nộp: {report.summary.submissions}</span><span className="text-cyan-600">● Hoàn tất chấm: {report.summary.evaluated}</span></div>
          {!hasActivity ? <p className="py-16 text-center text-slate-500">Chưa có lượt nộp hoặc hoàn tất chấm trong khoảng ngày này.</p> : <div className="overflow-x-auto">
            <svg viewBox="0 0 1000 260" className="w-full min-w-[600px] h-72" role="img" aria-label={`Biểu đồ ${trend.length} ngày, ${report.summary.submissions} lượt nộp và ${report.summary.evaluated} lượt hoàn tất chấm`}>
              {[0, 1, 2, 3, 4].map(step => <g key={step}><line x1="30" x2="980" y1={220 - step * 45} y2={220 - step * 45} stroke="#e2e8f0" strokeDasharray="4 4" /><text x="0" y={224 - step * 45} fontSize="10" fill="#64748b">{Math.round(maximum * step / 4)}</text></g>)}
              {chartMode === 'area' && trend.length > 1 && <><polygon points={`30,220 ${points('submissions')} 960,220`} fill="#6366f1" opacity="0.12" /><polyline points={points('submissions')} fill="none" stroke="#6366f1" strokeWidth="2" /><polyline points={points('evaluated')} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 3" /></>}
              {trend.map((item, i) => { const x = xAt(i); const w = Math.min(15, 400 / trend.length); return <g key={item.date}><title>{dateLabel(item.date)}: {item.submissions} lượt nộp; {item.evaluated} hoàn tất chấm</title>{chartMode === 'bar' ? <><rect x={x - w} y={220 - item.submissions / maximum * 180} width={w} height={item.submissions / maximum * 180} fill="#6366f1" /><rect x={x} y={220 - item.evaluated / maximum * 180} width={w} height={item.evaluated / maximum * 180} fill="#06b6d4" /></> : <circle cx={x} cy={220 - item.submissions / maximum * 180} r="3" fill="#6366f1" />}{(i % Math.ceil(trend.length / 8) === 0 || i === trend.length - 1) && <text x={x} y="248" textAnchor="middle" fontSize="10" fill="#64748b">{dateLabel(item.date).slice(0, 5)}</text>}</g> })}
            </svg>
          </div>}
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5 rounded-2xl space-y-4"><div><h2 className="font-bold">Phổ điểm đã công bố</h2><p className="text-xs text-slate-500 mt-1">Lần nộp mới nhất của mỗi sinh viên/bài tập/lớp, theo ngày nộp. Điểm cuối cùng sau phạt trễ, quy đổi về thang 10.</p></div>
            <p className="text-sm">Điểm trung bình: <strong data-testid="average-score">{report.grades.average === null ? 'Chưa có dữ liệu' : `${report.grades.average.toFixed(2)} / 10`}</strong></p>
            {count === 0 ? <p className="py-8 text-center text-slate-500">Chưa có điểm hợp lệ đã công bố trong khoảng ngày này.</p> : report.grades.bins.map((n, i) => <div key={gradeLabels[i]}><div className="flex justify-between gap-2 text-xs mb-2"><span>{gradeLabels[i]}</span><strong>{n} bài ({(n / count * 100).toFixed(1)}%)</strong></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${n / count * 100}%`, background: gradeColors[i] }} /></div></div>)}
            <p className="text-xs text-slate-500">Đã phân tích: {count} bài · Đạt từ 5/10: {count ? `${(report.grades.passed / count * 100).toFixed(1)}%` : 'Chưa có dữ liệu'}. Bài chưa có điểm hoặc chưa xác định thang điểm không được đưa vào thống kê.</p>
          </Card>
          <Card className="p-5 rounded-2xl"><h2 className="font-bold">Cơ cấu tài khoản hiện tại</h2><p className="text-xs text-slate-500 mt-1">Mỗi tài khoản được tính một lần. Nhiều vai trò: ưu tiên Admin → Giảng viên → Sinh viên.</p><RoleDistribution roles={report.roles} /></Card>
        </div>
        <Card className="p-5 rounded-2xl flex flex-wrap justify-between items-center gap-3"><p className="text-sm">{report.summary.subjects} môn học · {report.summary.assignedClasses}/{report.summary.classes} lớp đã có giảng viên · {report.summary.auditLogs} nhật ký trong khoảng ngày.</p><div className="flex gap-4 text-sm text-orange-600 font-semibold"><Link href="/admin/classes">Quản lý lớp</Link><Link href="/admin/subjects">Môn học</Link></div></Card>
      </>}
    </div>
  </DashboardLayout>
}
