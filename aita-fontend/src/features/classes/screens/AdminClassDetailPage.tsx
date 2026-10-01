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
  const [searchUsers, setSearchUsers] = useState<UserRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [classDetail, roster] = await Promise.all([
        classesApi.getClassDetail(classId).catch(() => null),
        classesApi.getClassStudents(classId).catch(() => []),
      ])
      if (classDetail) {
        setCls(classDetail)
        setNoteForm(classDetail.note || '')
      }
      setStudents(roster || [])
      setError(null)
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
    setSaving(true)
    try {
      const updated = await classesApi.updateClassNote(classId, noteForm)
      setNoteModalOpen(false)
      if (updated) {
        setCls(updated)
      } else {
        setCls(prev => prev ? { ...prev, note: noteForm } : null)
      }
      alert('Đã cập nhật ghi chú')
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const handleSearchStudents = async () => {
    if (!enrollForm.trim()) return
    setSearchLoading(true)
    try {
      const results = await usersApi.getUsers('student', 1, 10, enrollForm.trim())
      setSearchUsers(results)
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSearchLoading(false)
    }
  }

  const handleEnroll = async (studentId: string) => {
    if (saving) return
    setSaving(true)
    try {
      await classesApi.enrollStudent(classId, studentId)
      setEnrollModalOpen(false)
      await loadData()
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
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-sm space-y-1">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" /> Ghi chú hiện hành của lớp:
            </span>
            <p className="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{cls.note}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Button onClick={() => setEnrollModalOpen(true)}><UserPlus className="w-4 h-4 mr-2" /> Thêm sinh viên</Button>
          <Button variant="outline" onClick={() => { setNoteForm(cls?.note || ''); setNoteModalOpen(true); }}><Edit3 className="w-4 h-4 mr-2" /> Cập nhật ghi chú</Button>
        </div>

        {/* Roster */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><Users className="w-5 h-5 text-brand-600" /> Danh sách sinh viên ({students.length})</h3>
          </div>
          {loading ? (
            <p className="p-8 text-center text-slate-500">Đang tải danh sách...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-4 font-semibold text-slate-600">MSSV</th>
                    <th className="px-5 py-4 font-semibold text-slate-600">Họ và tên</th>
                    <th className="px-5 py-4 font-semibold text-slate-600">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {students.map(st => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-4 font-mono font-medium">{(st as any).studentCode || (st as any).studentId || 'N/A'}</td>
                      <td className="px-5 py-4 font-semibold">{st.name}</td>
                      <td className="px-5 py-4 text-slate-500">{st.email}</td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500">Lớp chưa có sinh viên nào.</td></tr>
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
            <span>Ghi chú lớp học</span>
            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900 min-h-[100px]"
              value={noteForm}
              onChange={e => setNoteForm(e.target.value)}
              placeholder="Nhập ghi chú cho lớp học này..."
            />
          </label>
          <Button type="submit" isLoading={saving}>Lưu ghi chú</Button>
        </form>
      </Modal>

      {/* Enroll Modal */}
      <Modal isOpen={enrollModalOpen} onClose={() => setEnrollModalOpen(false)} title="Thêm sinh viên vào lớp">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Tìm theo MSSV hoặc Tên..." 
              value={enrollForm} 
              onChange={e => setEnrollForm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchStudents()}
            />
            <Button onClick={handleSearchStudents} isLoading={searchLoading}>Tìm kiếm</Button>
          </div>
          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
            {searchUsers.map(user => (
              <div key={user.id} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email} - {user.studentCode || 'N/A'}</p>
                </div>
                <Button size="sm" onClick={() => handleEnroll(user.id)} disabled={saving}>Thêm</Button>
              </div>
            ))}
            {!searchLoading && searchUsers.length === 0 && enrollForm && (
              <p className="p-4 text-center text-sm text-slate-500">Không tìm thấy sinh viên nào.</p>
            )}
          </div>
        </div>
      </Modal>

    </DashboardLayout>
  )
}
