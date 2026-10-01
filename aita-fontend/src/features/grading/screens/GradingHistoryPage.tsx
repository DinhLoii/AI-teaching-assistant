'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/feedback'
import { gradingApi } from '@/lib/api/modules/grading'
import { formatDate } from '@/lib/utils'
import { errorMessage } from '@/lib/api/errors'
import {
  History,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  Award,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function GradingHistoryPage() {
  const { t } = useLanguage()
  const router = useRouter()

  const [history, setHistory] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [scoreRange, setScoreRange] = React.useState('all')
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const loadHistory = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await gradingApi.getHistory(
        undefined,
        page,
        15,
        search || undefined,
        statusFilter !== 'all' ? statusFilter : undefined,
        scoreRange !== 'all' ? scoreRange : undefined
      )
      setHistory(res?.history || [])
      setTotalPages(res?.meta?.totalPages || 1)
    } catch (err) {
      console.error('Failed to load grading history:', err)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, scoreRange])

  React.useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi lịch sử chấm này không?')) return
    setDeletingId(id)
    try {
      await gradingApi.deleteHistory(id)
      await loadHistory()
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      roleLabel="Lecturer"
      requiredRole="lecturer"
      title="Lịch sử chấm bài"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Banner */}
        <div className="rounded-3xl p-6 bg-gradient-to-r from-orange-50 via-amber-50/60 to-blue-50/70 dark:bg-gradient-to-r dark:from-orange-950/40 dark:via-slate-900/90 dark:to-blue-950/30 border border-orange-200/80 dark:border-orange-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="orange">Audit & History</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">Ghi vết toàn bộ phiên chấm</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Lịch sử các phiên chấm điểm Rubric AI
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="w-full md:max-w-sm">
            <Input
              type="text"
              placeholder="Tìm theo sinh viên, MSSV, bài thi..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="failed">Thất bại / Lỗi</option>
              <option value="processing">Đang chấm</option>
            </select>

            <select
              value={scoreRange}
              onChange={(e) => {
                setScoreRange(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500"
            >
              <option value="all">Tất cả khoảng điểm</option>
              <option value="high">Điểm cao (≥ 8.0)</option>
              <option value="medium">Đạt yêu cầu (5.0 - 7.9)</option>
              <option value="low">Chưa đạt (&lt; 5.0)</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Sinh viên & MSSV</th>
                  <th className="p-4">Bài tập / Môn học</th>
                  <th className="p-4">Thời gian thực hiện</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Điểm số</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      Đang tải lịch sử chấm điểm...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      Không tìm thấy bản ghi lịch sử nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  history.map((row) => {
                    const isSucc = row.status === 'completed' || row.state === 'completed' || row.score !== undefined
                    const isFail = row.status === 'failed' || row.state === 'failed'
                    const subId = row.submissionId || row.id

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {row.studentName || row.student || 'Sinh viên'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {row.studentCode || row.studentId || 'HE170000'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {row.assignmentTitle || row.assignment || 'Bài tập lập trình'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {row.subjectCode || 'Môn học'}
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(row.createdAt || row.submittedAt)}
                        </td>
                        <td className="p-4">
                          <Badge variant={isSucc ? 'success' : isFail ? 'danger' : 'warning'}>
                            {row.status || row.state || 'Processing'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {row.score !== undefined && row.score !== null ? (
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                              {Number(row.score).toFixed(1)}
                              <span className="text-xs text-slate-400 font-normal"> / 10</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {subId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/lecturer/grading/result/${subId}`)}
                                className="text-xs py-1 px-2.5 gap-1 border-slate-200 dark:border-slate-800"
                              >
                                <ExternalLink className="w-3 h-3 text-blue-500" />
                                <span>Xem kết quả</span>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(row.id)}
                              disabled={deletingId === row.id}
                              className="text-xs py-1 px-2 text-slate-400 hover:text-rose-500"
                              title="Xóa bản ghi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <Pagination
              page={page}
              hasNext={page < totalPages}
              loading={loading}
              onChange={(newPage) => setPage(newPage)}
            />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
