'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { classesApi } from '@/lib/api/modules/classes'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import {
  ArrowLeft, BookOpen, Clock, FileText, CheckCircle2, Users, FileEdit,
  GraduationCap, XCircle, Megaphone, Plus, Pencil, Trash2, Loader2, Bell, Download
} from 'lucide-react'

type TabId = 'assignments' | 'roster' | 'announcements'

export default function LecturerClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = (params?.id as string) || ''
  const { t } = useLanguage()

  const [classData, setClassData] = React.useState<any>(null)
  const [students, setStudents] = React.useState<any[]>([])
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [announcements, setAnnouncements] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [rosterLoading, setRosterLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<TabId>('assignments')

  // Announcement form state
  const [annModal, setAnnModal] = React.useState(false)
  const [annEditId, setAnnEditId] = React.useState<string | null>(null)
  const [annForm, setAnnForm] = React.useState({ title: '', content: '' })
  const [annSaving, setAnnSaving] = React.useState(false)

  const loadAnnouncements = React.useCallback(async () => {
    try {
      const res = await classesApi.getClassAnnouncements(classId)
      setAnnouncements(Array.isArray(res) ? res : [])
    } catch { setAnnouncements([]) }
  }, [classId])

  React.useEffect(() => {
    if (!classId) return
    let cancelled = false
    setLoading(true)
    setRosterLoading(true)
    const assignmentsRequest = assignmentsApi.getAssignments({ classId }).then(rows => rows.filter((a: any) =>
      a.classId === classId || a.class?.id === classId ||
      (Array.isArray(a.classIds) && a.classIds.includes(classId)) ||
      (Array.isArray(a.classes) && a.classes.some((c: any) => typeof c === 'string' ? c === classId : c?.id === classId))
    )).catch(() => [])
    void Promise.all([
      classesApi.getClassDetail(classId).catch(() => null),
      assignmentsRequest,
    ]).then(([currentClass, rows]) => {
      if (cancelled) return
      setClassData(currentClass)
      setAssignments(rows)
    }).finally(() => { if (!cancelled) setLoading(false) })
    void classesApi.getClassAnnouncements(classId).then(rows => {
      if (!cancelled) setAnnouncements(Array.isArray(rows) ? rows : [])
    }).catch(() => {})
    void Promise.all([
      classesApi.getClassStudents(classId).catch(() => []),
      submissionsApi.getSubmissions({ classId, view: 'summary' }).catch(() => []),
      assignmentsRequest,
    ]).then(([studentsData, submissions, filteredAssignments]) => {
      if (cancelled) return
      const submissionIndex = new Map<string, any>()
      for (const sub of submissions) {
        const id = sub.assignmentId || sub.examId
        if (!id) continue
        const key = `${id}:${String(sub.studentId).toLowerCase()}`
        if (!submissionIndex.has(key)) submissionIndex.set(key, sub)
      }
      const rawStudents = Array.isArray(studentsData) ? studentsData : []
      const studentsWithGrades = rawStudents.map((s: any) => {
        const studentSubs: Record<string, any> = {}
        let totalScore = 0, submitCount = 0
        filteredAssignments.forEach((a: any) => {
          const sCode = String(s.studentId || s.studentCode || '').toLowerCase()
          const sUserId = String(s.id || s.userId || '').toLowerCase()
          const mySub = submissionIndex.get(`${a.id}:${sCode}`) || submissionIndex.get(`${a.id}:${sUserId}`)
          studentSubs[a.id] = mySub
          if (mySub) {
            submitCount++
            totalScore += Number(mySub.score ?? mySub.finalScore ?? mySub.totalScore ?? 0)
          }
        })
        return { ...s, submissions: studentSubs, submitCount, avgScore: submitCount > 0 ? (totalScore / submitCount).toFixed(1) : '-' }
      })
      setStudents(studentsWithGrades)
    }).finally(() => { if (!cancelled) setRosterLoading(false) })
    return () => { cancelled = true }
  }, [classId])

  const handleExportGradebookCSV = () => {
    if (!students || students.length === 0) {
      alert('Không có dữ liệu sinh viên để xuất bảng điểm.')
      return
    }
    const headers = ['Mã SV', 'Họ và tên', 'Số bài nộp', 'Điểm trung bình', ...assignments.map((a: any) => `"${(a.title || 'Bài tập').replace(/"/g, '""')}"`)]
    const rows = students.map((s: any) => {
      const row = [
        s.studentId || s.studentCode || '',
        `"${(s.name || s.fullName || '').replace(/"/g, '""')}"`,
        `${s.submitCount}/${assignments.length}`,
        s.avgScore ?? '',
      ]
      assignments.forEach((a: any) => {
        const sub = s.submissions?.[a.id]
        const score = sub ? (sub.score ?? sub.finalScore ?? sub.totalScore ?? 'Đã nộp') : 'Chưa nộp'
        row.push(score)
      })
      return row.join(',')
    })
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Bang_Diem_${classData?.classCode || classId}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function saveAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!annForm.content.trim()) return
    setAnnSaving(true)
    try {
      if (annEditId) {
        await classesApi.updateClassAnnouncement(classId, annEditId, annForm.content, annForm.title)
      } else {
        await classesApi.postClassAnnouncement(classId, annForm.content, annForm.title)
      }
      setAnnModal(false)
      setAnnForm({ title: '', content: '' })
      setAnnEditId(null)
      await loadAnnouncements()
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi lưu thông báo.')
    } finally { setAnnSaving(false) }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Xóa thông báo này?')) return
    try {
      await classesApi.deleteClassAnnouncement(classId, id)
      await loadAnnouncements()
    } catch (err: any) { alert(err?.message || 'Lỗi.') }
  }

  const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'assignments', label: 'Bài tập', icon: FileText, count: assignments.length },
    { id: 'roster', label: 'Danh sách sinh viên', icon: Users, count: students.length },
    { id: 'announcements', label: 'Thông báo lớp', icon: Megaphone, count: announcements.length },
  ]

  if (loading) {
    return (
      <DashboardLayout navItems={LECTURER_NAV} title="AITA Lecturer" roleLabel="Giảng viên" requiredRole="lecturer">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
          <p className="text-sm text-slate-500">Đang tải thông tin lớp học...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!classData) {
    return (
      <DashboardLayout navItems={LECTURER_NAV} title="AITA Lecturer" roleLabel="Giảng viên" requiredRole="lecturer">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-slate-500">Không tìm thấy lớp học.</p>
          <Button variant="outline" onClick={() => router.push('/lecturer/classes')}>Quay lại</Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel="Giảng viên"
      requiredRole="lecturer"
      headerTitle={`${classData.classCode || 'Lớp học'} · ${classData.subject?.code || ''}`}
      headerSubtitle={classData.subject?.name || 'Chi tiết lớp học'}
    >
      <div className="space-y-6 w-full pb-12">
        {/* Top nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/lecturer/classes')} className="gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white -ml-3">
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách lớp
          </Button>
          <Badge variant="orange" className="font-mono">{classData.semester?.season} {classData.semester?.code}</Badge>
        </div>

        {/* Hero card */}
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 p-6 sm:p-8 text-white shadow-xl shadow-orange-200/40 dark:shadow-orange-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-white/20 text-xs font-bold font-mono">{classData.classCode}</span>
                <span className="px-3 py-1 rounded-lg bg-white/15 text-xs font-bold">{classData.subject?.code}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{classData.subject?.name || 'Lớp học'}</h1>
            </div>
            <div className="flex gap-6 text-white/90">
              <div className="text-center">
                <p className="text-2xl font-extrabold">{students.length}</p>
                <p className="text-xs opacity-80">Sinh viên</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">{assignments.length}</p>
                <p className="text-xs opacity-80">Bài tập</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold">{announcements.length}</p>
                <p className="text-xs opacity-80">Thông báo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab: Assignments */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Danh sách bài tập</h3>
              <Link href={`/lecturer/grading/assignments?classId=${classId}`}>
                <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                  <Plus className="w-4 h-4" /> Tạo bài tập
                </Button>
              </Link>
            </div>

            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
                <FileText className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-400">Lớp học chưa có bài tập nào.</p>
                <Link href={`/lecturer/grading/assignments?classId=${classId}`}>
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    <Plus className="w-4 h-4" /> Tạo bài tập đầu tiên
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((a: any) => {
                  const isOverdue = a.due ? new Date(a.due) < new Date() : false
                  return (
                    <div key={a.id} className="group p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 hover:border-orange-500/40 hover:shadow-lg transition-all space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant={a.status === 'published' ? 'success' : 'default'} className="text-[10px]">
                          {a.status === 'published' ? 'Đã giao' : 'Bản nháp'}
                        </Badge>
                        {a.type && <span className="text-[10px] text-slate-400 font-mono">{a.type}</span>}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-orange-500 transition-colors">{a.title}</h4>
                      <div className={`text-xs flex items-center gap-1.5 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{a.due ? new Date(a.due).toLocaleDateString('vi-VN') : 'Không có hạn'}</span>
                        {isOverdue && <span className="font-semibold">· Đã quá hạn</span>}
                      </div>
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Điểm tối đa: <strong className="text-orange-500">{a.maxScore || 10}</strong></span>
                        <Link href={`/lecturer/assignments/${a.id}`}>
                          <Button size="sm" variant="primary" className="text-xs gap-1.5 h-8">
                            <FileEdit className="w-3.5 h-3.5" /> Workspace
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Roster */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sinh viên & Tiến độ ({students.length})</h3>
              {!rosterLoading && students.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportGradebookCSV}
                  className="gap-1.5 text-xs self-start sm:self-auto cursor-pointer font-semibold border-slate-200 dark:border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất bảng điểm Excel (CSV)</span>
                </Button>
              )}
            </div>

            {rosterLoading ? (
              <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải danh sách sinh viên và điểm…</p>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
                <GraduationCap className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-400">Lớp học chưa có sinh viên.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[220px]">Sinh viên</th>
                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Tiến độ</th>
                        <th className="px-5 py-4 font-bold text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">ĐTB</th>
                        {assignments.map((a: any) => (
                          <th key={a.id} className="px-4 py-4 font-bold text-slate-600 dark:text-slate-300 min-w-[140px] text-center">
                            <span className="block truncate max-w-[140px] text-xs" title={a.title}>{a.title}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s: any) => (
                        <tr key={s.id || s.studentId} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-4 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shrink-0 text-white font-bold text-xs">
                                {(s.name || s.fullName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{s.name || s.fullName}</p>
                                <p className="text-xs text-slate-400 font-mono">{s.studentId || s.studentCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <Badge variant={s.submitCount === assignments.length && assignments.length > 0 ? 'success' : 'default'} className="text-[10px]">
                              {s.submitCount}/{assignments.length}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{s.avgScore}</td>
                          {assignments.map((a: any) => {
                            const sub = s.submissions?.[a.id]
                            if (!sub) return (
                              <td key={a.id} className="px-4 py-4 text-center">
                                <div className="flex flex-col items-center text-slate-300 dark:text-slate-600">
                                  <XCircle className="w-4 h-4" />
                                  <span className="text-[9px] mt-0.5">Chưa nộp</span>
                                </div>
                              </td>
                            )
                            const score = sub.score ?? sub.finalScore ?? sub.totalScore
                            const isGraded = score !== null && score !== undefined
                            const isPublished = sub.isPublished || sub.reviewStatus === 'PUBLISHED'
                            return (
                              <td key={a.id} className="px-4 py-4 text-center">
                                {isGraded ? (
                                  <div className="flex flex-col items-center">
                                    <span className={`text-sm font-bold ${isPublished ? 'text-green-600' : 'text-orange-500'}`}>
                                      {score}<span className="text-[10px] font-normal text-slate-400">/{a.maxScore || 10}</span>
                                    </span>
                                    {sub.submittedAt && <span className="text-[9px] text-slate-400">{new Date(sub.submittedAt).toLocaleDateString('vi-VN')}</span>}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center text-blue-500">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[9px] mt-0.5">Đã nộp</span>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Announcements */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thông báo lớp ({announcements.length})</h3>
              <Button variant="primary" size="sm" className="gap-1.5 text-xs" onClick={() => { setAnnEditId(null); setAnnForm({ title: '', content: '' }); setAnnModal(true) }}>
                <Plus className="w-4 h-4" /> Đăng thông báo
              </Button>
            </div>

            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
                <Bell className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-400">Chưa có thông báo nào cho lớp này.</p>
                <Button variant="primary" size="sm" className="gap-1.5 text-xs" onClick={() => { setAnnEditId(null); setAnnForm({ title: '', content: '' }); setAnnModal(true) }}>
                  <Plus className="w-4 h-4" /> Đăng thông báo đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann: any) => (
                  <div key={ann.id} className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Megaphone className="w-4 h-4 text-orange-500 shrink-0" />
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{ann.title || 'Thông báo'}</h4>
                          <span className="text-xs text-slate-400 shrink-0">{ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('vi-VN') : ''}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setAnnEditId(ann.id); setAnnForm({ title: ann.title || '', content: ann.content || '' }); setAnnModal(true) }}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAnnouncement(ann.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Announcement Modal */}
      <Modal isOpen={annModal} onClose={() => !annSaving && setAnnModal(false)} title={annEditId ? 'Chỉnh sửa thông báo' : 'Đăng thông báo lớp'}>
        <form onSubmit={saveAnnouncement} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Tiêu đề (tùy chọn)</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Tiêu đề thông báo..."
              value={annForm.title}
              onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Nội dung *</label>
            <textarea
              required
              rows={5}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Nhập nội dung thông báo cho sinh viên..."
              value={annForm.content}
              onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setAnnModal(false)}>Hủy</Button>
            <Button variant="primary" size="sm" type="submit" isLoading={annSaving}>
              {annEditId ? 'Lưu thay đổi' : 'Đăng thông báo'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
