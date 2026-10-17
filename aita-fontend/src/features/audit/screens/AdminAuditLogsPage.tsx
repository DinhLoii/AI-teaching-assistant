'use client'

import { RefreshAction } from '@/components/actions/RefreshAction'

import * as React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice } from '@/components/ui/feedback'
import { auditApi, type AuditEntry } from '@/lib/api/modules/audit'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import {
  FileText,
  ShieldCheck,
  Bot,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Code2,
  Sparkles,
  Cpu,
  Layers,
} from 'lucide-react'

export default function AdminAuditLogsPage() {
  const { isAuthenticated, role } = useAuth()
  const { t } = useLanguage()

  const [mode, setMode] = React.useState<'system' | 'ai'>('system')
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'success' | 'failure'>('all')
  const [rows, setRows] = React.useState<AuditEntry[] | null>(null)
  const [hasNext, setHasNext] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedLog, setSelectedLog] = React.useState<AuditEntry | null>(null)

  const loadLogs = React.useCallback(async (background = false) => {
    if (!isAuthenticated || role !== 'admin') return
    if (!background) setLoading(true)
    setError(null)
    try {
      const fetchPage = mode === 'system' ? auditApi.getAuditLogs : auditApi.getAIAuditLogs
      const [currentData, nextData] = await Promise.all([
        fetchPage(page, 15),
        fetchPage(page + 1, 15),
      ])
      setRows(currentData || [])
      setHasNext((nextData || []).length > 0)
    } catch (cause) {
      if (background) throw cause
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, role, mode, page])

  React.useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  // Filter rows by search and status
  const filteredRows = React.useMemo(() => {
    if (!rows) return []
    return rows.filter((row) => {
      const q = search.toLowerCase().trim()
      const actionMatches = (row.action || row.actionType || row.modelUsed || '').toLowerCase().includes(q)
      const userMatches = (row.userId || '').toLowerCase().includes(q)
      const entityMatches = (row.entityName || row.entityId || '').toLowerCase().includes(q)

      const matchesSearch = !q || actionMatches || userMatches || entityMatches

      if (!matchesSearch) return false

      if (statusFilter === 'success') {
        return row.isSuccess !== false && !row.errorMessage
      }
      if (statusFilter === 'failure') {
        return row.isSuccess === false || Boolean(row.errorMessage)
      }

      return true
    })
  }, [rows, search, statusFilter])

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.audit.title', 'Nhật ký Kiểm toán & An ninh')}
      headerSubtitle={t('admin.audit.subtitle', 'Theo dõi toàn diện các thao tác nhạy cảm của người dùng và lịch sử tiêu thụ Token AI')}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── TOP TABS & CONTROLS ── */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="inline-flex p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setMode('system')
                setPage(1)
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'system'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Nhật ký Hệ thống</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('ai')
                setPage(1)
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'ai'
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Lịch sử AI & Token</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Tìm thao tác, user ID, đối tượng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs rounded-xl border-orange-100 dark:border-slate-800 focus:border-orange-400 text-slate-900 dark:text-white bg-white/90 dark:bg-slate-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs rounded-xl border border-orange-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-orange-400 shadow-2xs"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="success">Thành công</option>
              <option value="failure">Có lỗi / Thất bại</option>
            </select>

            <RefreshAction onRefresh={() => loadLogs(true)} disabled={loading} cachePaths={["/audit"]} />
          </div>
        </div>

        {error && <ErrorNotice message={error} onRetry={() => void loadLogs()} />}

        {/* ── LOGS DATA TABLE ── */}
        <div className="bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-orange-900/30 rounded-2xl overflow-hidden shadow-xs">
          {loading && !rows ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Đang tải danh sách sự kiện kiểm toán...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Không tìm thấy sự kiện kiểm toán nào
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Thử thay đổi từ khóa tìm kiếm hoặc chuyển đổi phân hệ kiểm toán.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-orange-100/90 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/50 dark:bg-slate-950/60 text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-200 tracking-wider">
                    <th className="py-3.5 px-5">Thời gian</th>
                    <th className="py-3.5 px-4">{mode === 'system' ? 'Hành động' : 'Tác vụ AI'}</th>
                    <th className="py-3.5 px-4">Người thực hiện</th>
                    {mode === 'system' ? (
                      <th className="py-3.5 px-4">Đối tượng tác động</th>
                    ) : (
                      <>
                        <th className="py-3.5 px-4">Mô hình (Model)</th>
                        <th className="py-3.5 px-4 text-right">Tokens tiêu thụ</th>
                      </>
                    )}
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row) => {
                    const isFailure = row.isSuccess === false || Boolean(row.errorMessage)
                    const totalTokens = (row.promptTokens || 0) + (row.completionTokens || 0)

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Time */}
                        <td className="py-3.5 px-5 text-slate-500 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '—'}
                            </span>
                          </div>
                        </td>

                        {/* Action / Event */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <span className="line-clamp-1">
                            {row.action || row.actionType || row.modelUsed || 'Lượt thực thi'}
                          </span>
                        </td>

                        {/* User / Actor */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {row.userId || <span className="text-slate-400">Hệ thống</span>}
                        </td>

                        {/* Entity (System Mode) or Model + Tokens (AI Mode) */}
                        {mode === 'system' ? (
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {row.entityName ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800">
                                  {row.entityName}
                                </Badge>
                                <span className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                                  {row.entityId}
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        ) : (
                          <>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-[#FA7014]">
                                {row.modelUsed || 'Gemini 1.5'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono">
                              {totalTokens > 0 ? (
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {totalTokens.toLocaleString()}
                                  <span className="text-[10px] text-slate-400 block font-normal">
                                    in: {row.promptTokens ?? 0} / out: {row.completionTokens ?? 0}
                                  </span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </>
                        )}

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {isFailure ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              Lỗi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Thành công
                            </span>
                          )}
                        </td>

                        {/* Action: Detail */}
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(row)}
                            className="text-xs gap-1 cursor-pointer h-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 font-bold rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── PAGINATION CONTROLS ── */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50/60 dark:bg-slate-900/60">
            <span>
              Trang <strong className="text-slate-900 dark:text-white font-mono">{page}</strong>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1 text-xs cursor-pointer rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-900 dark:text-slate-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trang trước</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1 text-xs cursor-pointer rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-900 dark:text-slate-100"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── LOG INSPECTOR MODAL ── */}
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title="Chi tiết Bản ghi Kiểm toán"
          description={`Mã sự kiện: ${selectedLog?.id || ''}`}
        >
          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold">Hành động:</span>
                  <strong className="text-slate-900 dark:text-white font-mono text-xs">
                    {selectedLog.action || selectedLog.actionType || selectedLog.modelUsed}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold">Thời gian:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString('vi-VN') : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold">Người thực hiện:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedLog.userId || 'Hệ thống'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] font-semibold">Đối tượng tác động:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedLog.entityName ? `${selectedLog.entityName} (${selectedLog.entityId})` : '—'}
                  </span>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span>Lỗi phát sinh:</span>
                  </div>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap">{selectedLog.errorMessage}</pre>
                </div>
              )}

              {/* JSON Metadata Payload */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-[#FA7014]" />
                  <span>Dữ liệu Bản ghi (Raw Payload):</span>
                </span>
                <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                  <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)} className="text-xs rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 font-bold text-slate-900 dark:text-slate-100">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}
