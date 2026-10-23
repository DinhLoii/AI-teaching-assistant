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
import { Input } from '@/components/ui/input'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { gradingApi } from '@/lib/api/modules/grading'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { formatDate } from '@/lib/utils'
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
  MessageSquare,
  Award,
  Send,
  Eye,
  Check,
} from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

function GradingHubContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryAssignmentId = searchParams.get('assignmentId')

  const [assignments, setAssignments] = React.useState<any[]>([])
  const [submissions, setSubmissions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [strategy, setStrategy] = React.useState<'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE'>('CONTINUOUS_QUEUE')
  const [updatingStrategy, setUpdatingStrategy] = React.useState(false)

  // Single Quick Upload Modal
  const [quickUploadModal, setQuickUploadModal] = React.useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState('')
  const [uploadFile, setUploadFile] = React.useState<File | null>(null)
  const [uploadingSingle, setUploadingSingle] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  // Appeal Review Modal state
  const [reviewAppealModal, setReviewAppealModal] = React.useState<any | null>(null)
  const [appealScore, setAppealScore] = React.useState<number | string>('')
  const [appealFeedback, setAppealFeedback] = React.useState('')
  const [submittingAppealReview, setSubmittingAppealReview] = React.useState(false)
  const [appealSuccess, setAppealSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    Promise.all([
      assignmentsApi.getAssignments().catch(() => []),
      submissionsApi.getSubmissions({ view: 'summary' }).catch(() => []),
    ])
      .then(([assignRes, subsRes]) => {
        setAssignments(assignRes || [])
        setSubmissions(subsRes || [])
        if (assignRes && assignRes.length > 0) {
          const matched = queryAssignmentId ? assignRes.find((a: any) => a.id === queryAssignmentId) : null
          const target = matched || assignRes[0]
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

  // Filter submissions that have an active student appeal/feedback
  const appealSubmissions = submissions.filter(
    (s: any) => Boolean(s.studentFeedback && s.studentFeedback.trim() !== '')
  )

  const handleOpenAppealReview = (sub: any) => {
    setReviewAppealModal(sub)
    setAppealScore(sub.score ?? sub.finalScore ?? 10)
    setAppealFeedback(sub.instructorFeedback || '')
    setAppealSuccess(null)
  }

  const handleSaveAppealReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewAppealModal?.id) return

    setSubmittingAppealReview(true)
    setAppealSuccess(null)
    try {
      const newScoreNum = Number(appealScore)
      await submissionsApi.gradeSubmission(reviewAppealModal.id, {
        finalScore: newScoreNum,
        score: newScoreNum,
        feedback: appealFeedback,
        isPublished: true,
      })

      setAppealSuccess('Đã cập nhật điểm và phản hồi phúc khảo cho sinh viên thành công!')
      // Update local submissions list
      setSubmissions((prev) =>
        prev.map((s: any) =>
          s.id === reviewAppealModal.id
            ? { ...s, finalScore: newScoreNum, score: newScoreNum, instructorFeedback: appealFeedback }
            : s
        )
      )

      setTimeout(() => {
        setReviewAppealModal(null)
        setAppealSuccess(null)
      }, 1500)
    } catch (err) {
      alert(errorMessage(err))
    } finally {
      setSubmittingAppealReview(false)
    }
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      roleLabel="Lecturer"
      requiredRole="lecturer"
      title="Trung tâm chấm bài (Grading Hub)"
    >
      <div className="space-y-6 w-full pb-12">
        {/* Hero Banner */}
        <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-blue-500/10 border border-orange-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase bg-[#FA7014] text-white tracking-wider">
                Grading Center
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                AI Rubric Engine v3.5
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Trung tâm Quản trị & Thực thi Chấm điểm AI
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Khởi tạo phiên chấm tự động, kiểm tra hàng loạt tệp ZIP mã nguồn, giám sát hàng đợi chấm song song và xử lý khiếu nại phúc khảo điểm của sinh viên.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setQuickUploadModal(true)}
              className="text-xs gap-1.5 cursor-pointer font-bold"
            >
              <Zap className="w-4 h-4" />
              <span>Chấm nhanh 1 bài</span>
            </Button>

            <Link href="/lecturer/grading/history">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 cursor-pointer font-medium"
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
          <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/25">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Chấm bài hàng loạt (Batch ZIP)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tải lên nhiều tệp ZIP nộp bài của sinh viên cùng lúc để hệ thống xếp vào hàng đợi xử lý song song trong Docker Sandbox.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link href={selectedAssignmentId ? `/lecturer/grading/assignments/${selectedAssignmentId}/submit` : '/lecturer/assignments'}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 font-bold cursor-pointer rounded-xl border-orange-200/80 text-orange-700 dark:text-orange-300 hover:bg-orange-50/70">
                  <span>Mở bảng chấm hàng loạt</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 2: Strategy Control */}
          <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/25">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Chiến lược chấm điểm
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Thiết lập quy trình chấm: Chấm ngay khi sinh viên nộp (Queue) hoặc gom bài chấm toàn bộ sau deadline (Batch).
                </p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleUpdateStrategy('CONTINUOUS_QUEUE')}
                  disabled={updatingStrategy}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    strategy === 'CONTINUOUS_QUEUE'
                      ? 'border-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'border-orange-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-orange-50/60 dark:hover:bg-slate-800'
                  }`}
                >
                  Liên tục (Queue)
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStrategy('BATCH_POST_DEADLINE')}
                  disabled={updatingStrategy}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    strategy === 'BATCH_POST_DEADLINE'
                      ? 'border-transparent bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'border-orange-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-orange-50/60 dark:hover:bg-slate-800'
                  }`}
                >
                  Sau hạn nộp (Batch)
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Plagiarism & Audit */}
          <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/25">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Phát hiện mã nguồn trùng lặp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Quét thuật toán phát hiện gian lận (Plagiarism Detection) giữa các bài làm của sinh viên theo ngưỡng tương đồng.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Link href={selectedAssignmentId ? `/lecturer/assignments/${selectedAssignmentId}?tab=plagiarism` : '/lecturer/assignments'}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 font-bold cursor-pointer rounded-xl border-orange-200/80 text-orange-700 dark:text-orange-300 hover:bg-orange-50/70">
                  <span>Kiểm tra đạo văn</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── STUDENT APPEALS & INQUIRIES MANAGEMENT TABLE ── */}
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div className="p-5 border-b border-orange-100/90 dark:border-orange-900/30 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-orange-50/50 dark:from-slate-900 dark:to-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100/80 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Đơn Phúc khảo & Khiếu nại Điểm từ Sinh viên ({appealSubmissions.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Xem lý do giải trình của sinh viên, xem xét lại barem Rubric và điều chỉnh điểm số
                </p>
              </div>
            </div>

            {appealSubmissions.length > 0 && (
              <Badge variant="outline" className="text-xs text-orange-700 border-orange-300 bg-orange-50 dark:bg-orange-950/40 font-bold">
                {appealSubmissions.length} đơn cần phản hồi
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto">
            {appealSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không có đơn phúc khảo nào cần xử lý. Tất cả sinh viên đã đồng thuận với kết quả chấm.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-orange-100/90 dark:border-slate-800 bg-orange-50/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="p-4 pl-6">Sinh viên</th>
                    <th className="p-4">Bài tập</th>
                    <th className="p-4">Điểm hiện tại</th>
                    <th className="p-4 max-w-xs">Lý do phúc khảo</th>
                    <th className="p-4">Trạng thái phản hồi</th>
                    <th className="p-4 pr-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orange-100/50 dark:divide-slate-800">
                  {appealSubmissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/15 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {sub.studentName || sub.studentId}
                        </div>
                        <div className="font-mono text-[11px] text-orange-600 dark:text-orange-400 font-bold">
                          {sub.studentCode || ''}
                        </div>
                      </td>

                      <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                        {sub.assignmentTitle || sub.assignment || 'Assignment'}
                      </td>

                      <td className="p-4">
                        <span className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400">
                          {sub.score ?? sub.finalScore ?? 0}/10
                        </span>
                      </td>

                      <td className="p-4 max-w-xs">
                        <div className="line-clamp-2 text-slate-700 dark:text-slate-300 italic bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-200/50">
                          &ldquo;{sub.studentFeedback}&rdquo;
                        </div>
                      </td>

                      <td className="p-4">
                        {sub.instructorFeedback ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã phản hồi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <Clock className="w-3.5 h-3.5" />
                            Chờ xem xét
                          </span>
                        )}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenAppealReview(sub)}
                          className="text-xs py-1 px-3 gap-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 text-white cursor-pointer font-bold rounded-xl shadow-xs"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Xử lý phúc khảo</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Assignments Quick Table */}
        <Card className="overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
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
              <Button variant="ghost" size="sm" className="text-xs text-orange-600 dark:text-orange-400 font-semibold gap-1 cursor-pointer">
                <span>Xem tất cả bài</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
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
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {assign.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          {assign.subjectCode || 'Môn học'}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
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
                            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 gap-1 cursor-pointer">
                              <span>Workspace</span>
                            </Button>
                          </Link>
                          <Link href={`/lecturer/grading/assignments/${assign.id}/submit`}>
                            <Button variant="primary" size="sm" className="text-xs py-1 px-2.5 gap-1 cursor-pointer font-bold">
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

        {/* ── REVIEW APPEAL MODAL ── */}
        <Modal
          isOpen={Boolean(reviewAppealModal)}
          onClose={() => setReviewAppealModal(null)}
          title="Xử lý Đơn Phúc khảo Điểm"
          description={`Sinh viên: ${reviewAppealModal?.studentName || reviewAppealModal?.studentId || ''} • Bài tập: ${reviewAppealModal?.assignmentTitle || 'Assignment'}`}
        >
          {reviewAppealModal && (
            <form onSubmit={handleSaveAppealReview} className="space-y-4 text-xs">
              {appealSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl font-medium border border-emerald-200">
                  {appealSuccess}
                </div>
              )}

              {/* Student Appeal Note */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300">
                  Lý do phúc khảo của sinh viên:
                </span>
                <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  &ldquo;{reviewAppealModal.studentFeedback}&rdquo;
                </p>
              </div>

              {/* New Score Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Điểm số sau khi phúc khảo (Thang điểm 10)</span>
                  <span className="text-slate-400 font-normal">
                    Điểm gốc: <strong className="text-orange-600">{reviewAppealModal.score ?? reviewAppealModal.finalScore ?? 0}</strong>
                  </span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={10}
                  required
                  value={appealScore}
                  onChange={(e) => setAppealScore(e.target.value)}
                  className="font-mono text-sm font-bold"
                />
              </div>

              {/* Teacher Feedback / Resolution */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Phản hồi giải trình từ Giảng viên (Hiển thị tới sinh viên)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ghi rõ lý do điều chỉnh hoặc giữ nguyên điểm để sinh viên nắm rõ..."
                  value={appealFeedback}
                  onChange={(e) => setAppealFeedback(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#FA7014]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setReviewAppealModal(null)}
                  className="text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={submittingAppealReview}
                  className="text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Xác nhận & Cập nhật điểm</span>
                </Button>
              </div>
            </form>
          )}
        </Modal>

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
                {assignments.map((a) => (
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
