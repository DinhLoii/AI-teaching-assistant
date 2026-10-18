'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice } from '@/components/ui/feedback'
import { classesApi } from '@/lib/api/modules/classes'
import { usersApi } from '@/lib/api/modules/users'
import { errorMessage } from '@/lib/api/errors'
import type { ClassRow, StudentRow, UserRow } from '@/lib/api/contracts'
import { ArrowLeft, Edit3, GraduationCap, Users, UserPlus, BookOpen } from 'lucide-react'

export default function AdminClassDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classId = (params?.id as string) || ''

  const [cls, setCls] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteForm, setNoteForm] = useState('')

  // Enroll Modal
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState('')
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [cohortFilter, setCohortFilter] = useState('all')
  const [majorFilter, setMajorFilter] = useState('all')
  const [searchLoading, setSearchLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    setError(null)
    try {
      const [classRes, studentsRes] = await Promise.all([
        classesApi.getClassDetail(classId),
        classesApi.getClassStudents(classId),
      ])
      setCls(classRes)
      setStudents(Array.isArray(studentsRes) ? studentsRes : [])
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [classId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId || saving) return
    setSaving(true)
    try {
      await classesApi.updateClass(classId, { note: noteForm } as any)
      setNoteModalOpen(false)
      void loadData()
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const openEnrollModal = async () => {
    setEnrollModalOpen(true)
    setSearchLoading(true)
    try {
      const res = await usersApi.getUsers('student', 1, 200)
      setAllStudents(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error(err)
    } finally {
      setSearchLoading(false)
    }
  }

  const filteredEnrollStudents = allStudents.filter(st => {
    const code = (st.studentCode || st.code || '').toUpperCase()
    const name = (st.name || st.fullName || '').toLowerCase()
    const email = (st.email || '').toLowerCase()
    const searchMatch = !enrollForm || name.includes(enrollForm.toLowerCase()) || code.includes(enrollForm.toUpperCase()) || email.includes(enrollForm.toLowerCase())
    if (!searchMatch) return false

    if (cohortFilter !== 'all') {
      const cohortDigits = cohortFilter.replace('K', '')
      if (!code.includes(cohortDigits)) return false
    }

    if (majorFilter !== 'all') {
      if (!code.startsWith(majorFilter)) return false
    }

    return true
  })

  const handleEnroll = async (studentId: string) => {
    if (saving) return
    setSaving(true)
    try {
      await classesApi.enrollStudent(classId, studentId)
      await loadData()
      alert('Đã thêm sinh viên vào lớp thành công!')
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel="Quản trị viên" requiredRole="admin" headerTitle="Chi tiết lớp học" headerSubtitle="Thành viên, ghi chú và thông tin">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Chi tiết lớp học {cls?.code || classId}</h2>
            {cls?.subjectName && <p className="text-xs text-slate-500">{cls.subjectCode ? `${cls.subjectCode} - ` : ''}{cls.subjectName}</p>}
          </div>
        </div>

        <ErrorNotice message={error} onRetry={() => void loadData()} />

        {/* Note Display Card */}
        {cls?.note && (
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm space-y-1 shadow-2xs">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-[#FA7014]" /> Ghi chú hiện hành của lớp:
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{cls.note}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={openEnrollModal} variant="primary">
            <UserPlus className="w-4 h-4 mr-2" /> Thêm sinh viên vào lớp
          </Button>
          <Button variant="outline" className="rounded-xl font-bold border-slate-200 dark:border-slate-800" onClick={() => { setNoteForm(cls?.note || ''); setNoteModalOpen(true); }}>
            <Edit3 className="w-4 h-4 mr-2" /> Cập nhật ghi chú
          </Button>
        </div>

        {/* Roster */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#FA7014]" /> Danh sách sinh viên ({students.length})
            </h3>
          </div>
          {loading ? (
            <p className="p-8 text-center text-slate-500 text-sm">Đang tải danh sách...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider">MSSV</th>
                    <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Họ và tên</th>
                    <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white text-xs">{(st as any).studentCode || (st as any).studentId || 'N/A'}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white text-xs">{st.name}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-xs font-mono">{st.email}</td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500 text-xs">Lớp chưa có sinh viên nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Note Modal */}
      <Modal isOpen={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Cập nhật ghi chú">
        <form onSubmit={handleUpdateNote} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ghi chú lớp học</span>
            <textarea
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900 min-h-[100px] focus:outline-none focus:border-[#FA7014]"
              value={noteForm}
              onChange={e => setNoteForm(e.target.value)}
              placeholder="Nhập ghi chú cho lớp học này..."
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNoteModalOpen(false)} className="rounded-xl font-bold border-slate-200 dark:border-slate-800">Hủy</Button>
            <Button type="submit" variant="primary" isLoading={saving}>Lưu ghi chú</Button>
          </div>
        </form>
      </Modal>

      {/* Enroll Modal */}
      <Modal 
        isOpen={enrollModalOpen} 
        onClose={() => setEnrollModalOpen(false)} 
        title="Thêm sinh viên vào lớp học"
        description="Lọc sinh viên toàn trường theo Khóa và Ngành để thêm vào danh sách lớp"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          {/* Filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:border-[#FA7014]"
              value={cohortFilter}
              onChange={e => setCohortFilter(e.target.value)}
            >
              <option value="all">Tất cả Khóa</option>
              <option value="K17">Khóa K17</option>
              <option value="K18">Khóa K18</option>
              <option value="K19">Khóa K19</option>
            </select>

            <select
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:border-[#FA7014]"
              value={majorFilter}
              onChange={e => setMajorFilter(e.target.value)}
            >
              <option value="all">Tất cả Ngành</option>
              <option value="SE">SE - Kỹ thuật phần mềm</option>
              <option value="IA">IA - An toàn thông tin</option>
              <option value="AI">AI - Trí tuệ nhân tạo</option>
              <option value="IS">IS - Hệ thống thông tin</option>
              <option value="GD">GD - Thiết kế đồ họa</option>
            </select>

            <Input 
              placeholder="Tìm theo MSSV hoặc Tên..." 
              value={enrollForm} 
              onChange={e => setEnrollForm(e.target.value)}
              className="text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800 focus:border-[#FA7014]"
            />
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Tìm thấy {filteredEnrollStudents.length} sinh viên</span>
            <span className="text-[#FA7014] font-bold">Lớp hiện tại: {students.length} SV</span>
          </div>

          <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {searchLoading ? (
              <p className="p-6 text-center text-xs text-slate-400">Đang tải danh sách sinh viên...</p>
            ) : filteredEnrollStudents.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">Không tìm thấy sinh viên nào phù hợp bộ lọc.</p>
            ) : (
              filteredEnrollStudents.map(user => {
                const isAlreadyIn = students.some(s => s.id === user.id || (s as any).studentId === user.id)
                const uCode = (user.studentCode || user.code || '').toUpperCase()

                return (
                  <div key={user.id} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{user.name || user.fullName}</p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {uCode || 'SV'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>

                    {isAlreadyIn ? (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md shrink-0">
                        ✓ Đã trong lớp
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => handleEnroll(user.id)} disabled={saving} variant="primary" className="text-xs shrink-0">
                        Thêm vào lớp
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </Modal>

    </DashboardLayout>
  )
}
