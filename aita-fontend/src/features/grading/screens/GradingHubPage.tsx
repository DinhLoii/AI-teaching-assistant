'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { gradingApi } from '@/lib/api/modules/grading'
import { errorMessage } from '@/lib/api/errors'
import {
  Sparkles,
  UploadCloud,
  FileCheck2,
  Clock,
  History,
  ShieldAlert,
  Zap,
  ArrowRight,
  Settings,
  Layers,
  FileArchive,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

function GradingHubContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryAssignmentId = searchParams.get('assignmentId')

  const [assignments, setAssignments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [strategy, setStrategy] = React.useState<'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE'>('CONTINUOUS_QUEUE')
  const [updatingStrategy, setUpdatingStrategy] = React.useState(false)

  // Single Quick Upload Modal
  const [quickUploadModal, setQuickUploadModal] = React.useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState('')
  const [uploadFile, setUploadFile] = React.useState<File | null>(null)
  const [uploadingSingle, setUploadingSingle] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    assignmentsApi.getAssignments()
      .then(res => {
        setAssignments(res || [])
        if (res && res.length > 0) {
          const matched = queryAssignmentId ? res.find((a: any) => a.id === queryAssignmentId) : null
          const target = matched || res[0]
          setSelectedAssignmentId(target.id)
          if ((target as any).strategy) {
            setStrategy((target as any).strategy)
          }
          if (queryAssignmentId && matched) {
            setQuickUploadModal(true)
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [queryAssignmentId])

  const handleUpdateStrategy = async (newStrategy: 'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE') => {
    setUpdatingStrategy(true)
    try {
      await gradingApi.updateAllGradingStrategies(newStrategy)
      setStrategy(newStrategy)
      alert('Đã cập nhật chiến lược chấm bài toàn hệ thống thành công!')
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setUpdatingStrategy(false)
    }
  }

  const handleSingleQuickUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadError('Vui lòng chọn tệp mã nguồn bài làm (.zip, .rar).')
      return
    }
    if (!uploadFile.name.match(/\.(zip|rar|tar\.gz)$/i)) {
      setUploadError('Định dạng tệp không hợp lệ. Vui lòng chỉ tải lên tệp nén ZIP hoặc RAR.')
      return
    }
    if (uploadFile.size > 100 * 1024 * 1024) {
      setUploadError('Dung lượng tệp vượt quá giới hạn 100MB.')
      return
    }

    setUploadingSingle(true)
    setUploadError(null)
    try {
      const res = await gradingApi.submitProject(uploadFile, selectedAssignmentId || undefined)
      setQuickUploadModal(false)
      if (res?.submissionId) {
        router.push(`/lecturer/grading/live/${res.submissionId}?assignmentId=${selectedAssignmentId}`)
      } else {
        alert('Tải lên thành công! Đang chuyển hướng...')
        router.push(`/lecturer/assignments/${selectedAssignmentId}`)
      }
    } catch (err) {
      setUploadError(errorMessage(err))
    } finally {
      setUploadingSingle(false)
    }
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      roleLabel="Lecturer"
      requiredRole="lecturer"
      title="Trung tâm chấm bài (Grading Hub)"
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Hero Banner */}
        <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-blue-500/10 border border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-orange-500 text-white tracking-wider">
                Grading Center
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                AI Rubric Engine v3.2
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Trung tâm Quản trị & Thực thi Chấm điểm AI
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Khởi tạo phiên chấm tự động, kiểm tra hàng loạt tệp ZIP mã nguồn, giám sát tiến trình kiểm thử trực tiếp và theo dõi lịch sử kết quả.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setQuickUploadModal(true)}
              className="text-xs gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20"
            >
              <Zap className="w-4 h-4" />
              <span>Chấm nhanh 1 bài</span>
            </Button>

            <Link href="/lecturer/grading/history">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>Lịch sử chấm</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Batch Upload */}
          <Card className="p-6 space-y-4 hover:border-orange-500/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Chấm bài hàng loạt (Batch ZIP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tải lên nhiều tệp ZIP nộp bài của sinh viên cùng lúc để hệ thống xếp vào hàng đợi xử lý song song.
              </p>
            </div>
            <div className="pt-2">
              <Link href={selectedAssignmentId ? `/lecturer/grading/assignments/${selectedAssignmentId}/submit` : '/lecturer/assignments'}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 font-semibold">
                  <span>Mở bảng chấm hàng loạt</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 2: Strategy Control */}
          <Card className="p-6 space-y-4 hover:border-blue-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Settings className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Chiến lược chấm điểm
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Thiết lập quy trình chấm: Chấm ngay khi nộp hoặc gom bài chấm toàn bộ sau deadline.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleUpdateStrategy('CONTINUOUS_QUEUE')}
                  disabled={updatingStrategy}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    strategy === 'CONTINUOUS_QUEUE'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Liên tục (Queue)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStrategy('BATCH_POST_DEADLINE')}
                  disabled={updatingStrategy}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                    strategy === 'BATCH_POST_DEADLINE'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Sau hạn nộp (Batch)
                </button>
              </div>
            </div>
          </Card>

          {/* Card 3: Plagiarism & Audit */}
          <Card className="p-6 space-y-4 hover:border-emerald-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Phát hiện mã nguồn trùng lặp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Quét thuật toán phát hiện gian lận (Plagiarism Detection) giữa các bài làm của sinh viên theo ngưỡng tương đồng.
              </p>
            </div>
            <div className="pt-2">
              <Link href={selectedAssignmentId ? `/lecturer/assignments/${selectedAssignmentId}?tab=plagiarism` : '/lecturer/assignments'}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 font-semibold">
                  <span>Kiểm tra đạo văn</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Assignments Quick Table */}
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Danh sách bài tập & Trạng thái chấm
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lựa chọn bài tập để vào Workspace chi tiết hoặc tải bài nộp
              </p>
            </div>
            <Link href="/lecturer/assignments">
              <Button variant="ghost" size="sm" className="text-xs text-orange-600 dark:text-orange-400 font-semibold gap-1">
                <span>Xem tất cả bài</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Môn & Tiêu đề bài tập</th>
                  <th className="p-4">Hạn nộp</th>
                  <th className="p-4">Chính sách trễ hạn</th>
                  <th className="p-4">Chiến lược chấm</th>
                  <th className="p-4 pr-6 text-right">Lối vào chấm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                      Đang tải danh sách bài tập...
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                      Chưa có bài tập nào được tạo.
                    </td>
                  </tr>
                ) : (
                  assignments.slice(0, 8).map((assign) => (
                    <tr key={assign.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {assign.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          {assign.subjectCode || 'Môn học'}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                        {assign.dueAt ? new Date(assign.dueAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                      </td>
                      <td className="p-4 text-xs font-mono">
                        {assign.latePenaltyType === 'FIXED_POINTS'
                          ? `Trừ ${assign.latePenaltyValue}đ`
                          : assign.latePenaltyType === 'PERCENT'
                          ? `Trừ ${assign.latePenaltyValue}%`
                          : 'Không phạt'}
                      </td>
                      <td className="p-4">
                        <Badge variant="blue" className="text-[10px]">
                          {assign.strategy || 'CONTINUOUS_QUEUE'}
                        </Badge>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/lecturer/assignments/${assign.id}`}>
                            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 gap-1">
                              <span>Workspace</span>
                            </Button>
                          </Link>
                          <Link href={`/lecturer/grading/assignments/${assign.id}/submit`}>
                            <Button variant="primary" size="sm" className="text-xs py-1 px-2.5 gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                              <UploadCloud className="w-3 h-3" />
                              <span>Chấm ZIP</span>
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Upload Modal */}
        <Modal
          isOpen={quickUploadModal}
          onClose={() => setQuickUploadModal(false)}
          title="Chấm nhanh bài nộp kiểm thử"
          description="Tải lên tệp nén mã nguồn (.zip) của một sinh viên để đưa vào hệ thống chấm và theo dõi trực tiếp kết quả."
        >
          <form onSubmit={handleSingleQuickUpload} className="space-y-4">
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs">
                {uploadError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chọn bài tập chấm điểm
              </label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
              >
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.subjectCode || 'Môn'}] {a.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tệp mã nguồn bài làm (.ZIP / .RAR, tối đa 100MB)
              </label>
              <input
                type="file"
                accept=".zip,.rar,.tar.gz"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 dark:file:bg-orange-950/30 dark:file:text-orange-400 hover:file:bg-orange-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setQuickUploadModal(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={uploadingSingle}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Bắt đầu chấm ngay
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

export default function GradingHubPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Đang tải...</div>}>
      <GradingHubContent />
    </React.Suspense>
  )
}
