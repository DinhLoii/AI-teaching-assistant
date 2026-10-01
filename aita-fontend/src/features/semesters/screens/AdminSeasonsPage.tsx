'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice } from '@/components/ui/feedback'
import { semestersApi } from '@/lib/api/modules/semesters'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { classesApi } from '@/lib/api/modules/classes'
import { usersApi } from '@/lib/api/modules/users'
import { errorMessage } from '@/lib/api/errors'
import type { SemesterRow, SubjectRow, ClassRow, UserRow } from '@/lib/api/contracts'
import { CalendarDays, Layers, Plus, Trash2, Library, GraduationCap, ArrowLeft, Edit3, BookOpen, Users, ExternalLink } from 'lucide-react'
import { formatSemesterCode } from '@/utils/semester'
import { useLanguage } from '@/providers/language-provider'
import Link from 'next/link'

type Level = 'season' | 'semester' | 'subject' | 'class'

export default function AdminSeasonsPage() {
  const { t } = useLanguage()
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Level state
  const [level, setLevel] = useState<Level>('season')
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<SemesterRow | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<SubjectRow | null>(null)

  // Sub-data state
  const [semesterSubjects, setSemesterSubjects] = useState<SubjectRow[]>([])
  const [subjectClasses, setSubjectClasses] = useState<ClassRow[]>([])
  const [loadingSub, setLoadingSub] = useState(false)

  // Modal states
  const [seasonModalOpen, setSeasonModalOpen] = useState(false)
  const [seasonForm, setSeasonForm] = useState({ season: '', startDate: '', endDate: '' })
  
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false)
  const [allSubjects, setAllSubjects] = useState<SubjectRow[]>([])
  const [selectedSubjectIdsToAdd, setSelectedSubjectIdsToAdd] = useState<Set<string>>(new Set())

  const [saving, setSaving] = useState(false)

  // Edit Semester Modal states
  const [editSemesterModalOpen, setEditSemesterModalOpen] = useState(false)
  const [editingSemester, setEditingSemester] = useState<SemesterRow | null>(null)
  const [editSemesterForm, setEditSemesterForm] = useState({
    code: '',
    season: '',
    startDate: '',
    endDate: '',
  })

  // Class Modal states
  const [classModalOpen, setClassModalOpen] = useState(false)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [classForm, setClassForm] = useState({ code: '', lecturerId: '' })
  const [lecturers, setLecturers] = useState<UserRow[]>([])

  const loadSemesters = useCallback(async () => {
    setLoading(true)
    try {
      const data = await semestersApi.getSemesters()
      setSemesters(data || [])
      setError(null)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSemesters()
  }, [loadSemesters])

  const groupedSeasons = semesters.reduce((acc, sem) => {
    const s = sem.season || 'Unclassified'
    if (!acc[s]) acc[s] = []
    acc[s].push(sem)
    return acc
  }, {} as Record<string, SemesterRow[]>)

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || !seasonForm.season.trim()) return
    setSaving(true)
    try {
      await semestersApi.createSeason({
        season: seasonForm.season.trim(),
        startDate: seasonForm.startDate || undefined,
        endDate: seasonForm.endDate || undefined,
      })
      setSeasonModalOpen(false)
      setSeasonForm({ season: '', startDate: '', endDate: '' })
      await loadSemesters()
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSeason = async (season: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Xóa toàn bộ Học kỳ "${season}" và các môn, lớp bên trong?`)) return
    try {
      await semestersApi.deleteSeason(season)
      if (selectedSeason === season) {
        setLevel('season')
        setSelectedSeason(null)
      }
      await loadSemesters()
    } catch (cause) {
      alert(errorMessage(cause))
    }
  }

  const navigateTo = (lvl: Level) => {
    setLevel(lvl)
    if (lvl === 'season') {
      setSelectedSeason(null)
      setSelectedSemester(null)
      setSelectedSubject(null)
    } else if (lvl === 'semester') {
      setSelectedSemester(null)
      setSelectedSubject(null)
    } else if (lvl === 'subject') {
      setSelectedSubject(null)
    }
  }

  const handleOpenEditSemester = (sem: SemesterRow, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSemester(sem)
    setEditSemesterForm({
      code: sem.code || '',
      season: sem.season || '',
      startDate: sem.startDate ? sem.startDate.slice(0, 10) : '',
      endDate: sem.endDate ? sem.endDate.slice(0, 10) : '',
    })
    setEditSemesterModalOpen(true)
  }

  const handleUpdateSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSemester || saving) return
    setSaving(true)
    try {
      await semestersApi.updateSemester(editingSemester.id, {
        code: editSemesterForm.code.trim(),
        season: editSemesterForm.season.trim() || undefined,
        startDate: editSemesterForm.startDate || undefined,
        endDate: editSemesterForm.endDate || undefined,
      })
      setEditSemesterModalOpen(false)
      setEditingSemester(null)
      await loadSemesters()
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const loadSemesterSubjects = async (semId: string) => {
    setLoadingSub(true)
    try {
      const data = await semestersApi.getSemesterSubjects(semId)
      setSemesterSubjects(data || [])
    } catch (cause) {
      console.error(cause)
      setSemesterSubjects([])
    } finally {
      setLoadingSub(false)
    }
  }

  const loadSubjectClasses = async (semId: string, subId: string) => {
    setLoadingSub(true)
    try {
      const data = await semestersApi.getClassesBySubject(semId, subId)
      setSubjectClasses(data || [])
    } catch (cause) {
      console.error(cause)
      setSubjectClasses([])
    } finally {
      setLoadingSub(false)
    }
  }

  const handleOpenAddSubjects = async () => {
    if (!selectedSemester) return
    setAddSubjectModalOpen(true)
    setSaving(true)
    setSelectedSubjectIdsToAdd(new Set())
    try {
      // Load first 500 subjects to let admin pick from
      const subs = await subjectsApi.getSubjects(1, 500)
      setAllSubjects(subs)
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const handleAddSemesterSubjects = async () => {
    if (!selectedSemester || selectedSubjectIdsToAdd.size === 0) return
    setSaving(true)
    try {
      await semestersApi.addSemesterSubjects(selectedSemester.id, Array.from(selectedSubjectIdsToAdd))
      await loadSemesterSubjects(selectedSemester.id)
      setAddSubjectModalOpen(false)
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveSemesterSubject = async (subId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedSemester || !window.confirm('Gỡ môn học này khỏi học kỳ?')) return
    try {
      await semestersApi.removeSemesterSubject(selectedSemester.id, subId)
      setSemesterSubjects(prev => prev.filter(s => s.id !== subId))
    } catch (cause) {
      alert(errorMessage(cause))
    }
  }

  const handleOpenClassModal = async (cls?: ClassRow) => {
    if (!selectedSemester || !selectedSubject) return
    setEditingClassId(cls?.id || null)
    setClassForm({ code: cls?.code || '', lecturerId: cls?.lecturers?.[0]?.id || '' })
    setClassModalOpen(true)
    
    if (lecturers.length === 0) {
      setSaving(true)
      try {
        const rows: UserRow[] = []
        for (let p = 1; p <= 5; p++) {
          const batch = await usersApi.getUsers('lecturer', p, 100)
          rows.push(...batch)
          if (batch.length < 100) break
        }
        setLecturers(rows)
      } catch (cause) {
        alert(errorMessage(cause))
      } finally {
        setSaving(false)
      }
    }
  }

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSemester || !selectedSubject || saving) return
    setSaving(true)
    try {
      const payload = {
        code: classForm.code.trim(),
        subjectId: selectedSubject.id,
        semesterId: selectedSemester.id,
        ...(classForm.lecturerId ? { lecturerId: classForm.lecturerId } : {})
      }
      if (editingClassId) {
        await classesApi.updateClass(editingClassId, { ...payload, keepExistingInstructors: false })
      } else {
        await classesApi.createClass(payload)
      }
      setClassModalOpen(false)
      await loadSubjectClasses(selectedSemester.id, selectedSubject.id)
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClass = async (clsId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lớp này?')) return
    setSaving(true)
    try {
      await classesApi.deleteClass(clsId)
      if (selectedSemester && selectedSubject) {
        await loadSubjectClasses(selectedSemester.id, selectedSubject.id)
      }
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel={t('profile.role_admin', 'Quản trị viên')} requiredRole="admin" headerTitle={t('admin.seasons.title', 'Quản trị chương trình học')} headerSubtitle={t('admin.seasons.subtitle', 'Điều hướng phân cấp Kỳ → Môn → Lớp')}>
      <div className="space-y-6">
        <ErrorNotice message={error} onRetry={() => void loadSemesters()} />

        {/* Header Breadcrumbs */}
        <div className="flex items-center gap-3">
          {level !== 'season' && (
            <Button variant="outline" size="icon" onClick={() => {
              if (level === 'class') navigateTo('subject')
              else if (level === 'subject') navigateTo('semester')
              else if (level === 'semester') navigateTo('season')
            }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <button onClick={() => navigateTo('season')} className="hover:text-brand-600">{t('admin.seasons.all_seasons', 'Tất cả kỳ (Seasons)')}</button>
            {selectedSeason && <><span>/</span><button onClick={() => navigateTo('semester')} className="hover:text-brand-600">{selectedSeason}</button></>}
            {selectedSemester && <><span>/</span><button onClick={() => navigateTo('subject')} className="hover:text-brand-600">{formatSemesterCode(selectedSemester.code)}</button></>}
            {selectedSubject && <><span>/</span><span className="text-slate-800 dark:text-slate-200">{selectedSubject.code}</span></>}
          </div>
        </div>

        {/* Level 1: Seasons */}
        {!loading && level === 'season' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setSeasonModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Tạo Season Mới</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupedSeasons).map(([season, sems]) => {
                const totalClasses = sems.reduce((sum, s) => sum + (s.classCount || 0), 0)
                const totalSubjects = sems.reduce((sum, s) => sum + (s.subjectCount || 0), 0)
                return (
                  <article key={season} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition dark:border-slate-800 dark:bg-slate-900" onClick={() => { setSelectedSeason(season); setLevel('semester') }}>
                    <div className="bg-gradient-to-r from-brand-500 to-indigo-500 p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2 text-lg"><Layers className="w-5 h-5" /> {season}</h3>
                      <button className="p-2 hover:bg-white/20 rounded-full" onClick={(e) => handleDeleteSeason(season, e)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-5 flex justify-between">
                      <div className="text-center"><p className="text-2xl font-bold">{sems.length}</p><p className="text-xs text-slate-500">Semesters</p></div>
                      <div className="text-center"><p className="text-2xl font-bold text-indigo-600">{totalSubjects}</p><p className="text-xs text-slate-500">Môn học</p></div>
                      <div className="text-center"><p className="text-2xl font-bold text-emerald-600">{totalClasses}</p><p className="text-xs text-slate-500">Lớp học</p></div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {/* Level 2: Semesters */}
        {!loading && level === 'semester' && selectedSeason && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(groupedSeasons[selectedSeason] || []).sort((a,b) => (a.code > b.code ? 1 : -1)).map(sem => (
              <article key={sem.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md cursor-pointer transition dark:border-slate-800 dark:bg-slate-900 group" onClick={() => { setSelectedSemester(sem); loadSemesterSubjects(sem.id); setLevel('subject') }}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold flex items-center gap-2 text-lg"><CalendarDays className="w-5 h-5 text-indigo-500" /> {formatSemesterCode(sem.code)}</h3>
                  <button
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                    title="Chỉnh sửa học kỳ"
                    onClick={(e) => handleOpenEditSemester(sem, e)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {sem.subjectCount || 0} môn</span>
                  <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> {sem.classCount || 0} lớp</span>
                </div>
                {(sem.startDate || sem.endDate) && (
                  <p className="text-xs text-slate-400 mt-2">
                    {sem.startDate ? new Date(sem.startDate).toLocaleDateString('vi-VN') : ''} - {sem.endDate ? new Date(sem.endDate).toLocaleDateString('vi-VN') : ''}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Level 3: Subjects in Semester */}
        {!loading && level === 'subject' && selectedSemester && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Môn học trong {formatSemesterCode(selectedSemester.code)}</h2>
              <Button onClick={() => void handleOpenAddSubjects()}><Plus className="w-4 h-4 mr-2" /> Gắn môn vào kỳ</Button>
            </div>
            {loadingSub ? <p>Đang tải môn học...</p> : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Mã môn</th>
                      <th className="px-4 py-3 font-semibold">Tên môn</th>
                      <th className="px-4 py-3 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {semesterSubjects.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" onClick={() => { setSelectedSubject(sub); loadSubjectClasses(selectedSemester.id, sub.id); setLevel('class') }}>
                        <td className="px-4 py-3 font-mono font-semibold text-brand-600">{sub.code}</td>
                        <td className="px-4 py-3">{sub.name}</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="icon" onClick={(e) => handleRemoveSemesterSubject(sub.id, e)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </td>
                      </tr>
                    ))}
                    {semesterSubjects.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Chưa có môn học nào được gắn vào kỳ này.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Level 4: Classes in Subject */}
        {!loading && level === 'class' && selectedSemester && selectedSubject && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Các lớp {selectedSubject.code} trong {formatSemesterCode(selectedSemester.code)}</h2>
              <Button onClick={() => void handleOpenClassModal()}><Plus className="w-4 h-4 mr-2" /> Tạo Lớp Học</Button>
            </div>
            {loadingSub ? <p>Đang tải lớp học...</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectClasses.map(cls => (
                  <article key={cls.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/admin/classes/${cls.id}`} className="font-bold text-brand-600 font-mono text-lg flex items-center gap-2 hover:underline">
                          {cls.code} <ExternalLink className="w-4 h-4" />
                        </Link>
                        <p className="text-sm text-slate-500 mt-1">{cls.lecturers?.map(l => l.name).join(', ') || 'Chưa phân công GV'}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => void handleOpenClassModal(cls)}><Edit3 className="w-4 h-4 text-slate-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleDeleteClass(cls.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1 text-slate-500"><Users className="w-4 h-4" /> {cls.studentCount || 0} SV</span>
                    </div>
                  </article>
                ))}
                {subjectClasses.length === 0 && <p className="col-span-full text-center py-8 text-slate-500">Không có lớp học nào cho môn này trong học kỳ.</p>}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Season Modal */}
      <Modal isOpen={seasonModalOpen} onClose={() => setSeasonModalOpen(false)} title="Tạo Học kỳ / Chương trình">
        <form onSubmit={handleCreateSeason} className="space-y-4">
          <label className="block space-y-2">
            <span>Tên Season (VD: Fall 2026)</span>
            <Input required value={seasonForm.season} onChange={e => setSeasonForm(prev => ({ ...prev, season: e.target.value }))} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span>Ngày bắt đầu</span>
              <Input type="date" value={seasonForm.startDate} onChange={e => setSeasonForm(prev => ({ ...prev, startDate: e.target.value }))} />
            </label>
            <label className="block space-y-2">
              <span>Ngày kết thúc</span>
              <Input type="date" value={seasonForm.endDate} onChange={e => setSeasonForm(prev => ({ ...prev, endDate: e.target.value }))} />
            </label>
          </div>
          <p className="text-sm text-slate-500">Hệ thống sẽ tự tạo 9 Term con và gán các môn theo ma trận chuẩn.</p>
          <Button type="submit" isLoading={saving}>Khởi tạo Season</Button>
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal isOpen={addSubjectModalOpen} onClose={() => setAddSubjectModalOpen(false)} title="Gắn môn học vào Học kỳ">
        <div className="space-y-4">
          <p className="text-sm">Chọn môn học bên dưới để gán vào {selectedSemester && formatSemesterCode(selectedSemester.code)}:</p>
          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg dark:border-slate-700">
            {saving && <p className="p-4 text-center">Đang tải môn học...</p>}
            {!saving && allSubjects.filter(s => !semesterSubjects.find(ss => ss.id === s.id)).map(sub => (
              <label key={sub.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b last:border-b-0 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedSubjectIdsToAdd.has(sub.id)}
                  onChange={() => {
                    const next = new Set(selectedSubjectIdsToAdd)
                    next.has(sub.id) ? next.delete(sub.id) : next.add(sub.id)
                    setSelectedSubjectIdsToAdd(next)
                  }}
                />
                <div>
                  <span className="font-mono font-semibold">{sub.code}</span>
                  <span className="ml-2 text-slate-600 dark:text-slate-400">{sub.name}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setAddSubjectModalOpen(false)}>Hủy</Button>
            <Button type="button" onClick={handleAddSemesterSubjects} isLoading={saving} disabled={selectedSubjectIdsToAdd.size === 0}>Gắn môn học</Button>
          </div>
        </div>
      </Modal>

      {/* Class Modal */}
      <Modal isOpen={classModalOpen} onClose={() => setClassModalOpen(false)} title={editingClassId ? "Chỉnh sửa lớp học" : "Tạo Lớp Học mới"}>
        <form onSubmit={handleSaveClass} className="space-y-4">
          <label className="block space-y-2">
            <span>Mã lớp (*)</span>
            <Input required placeholder="VD: SE1801" value={classForm.code} onChange={e => setClassForm(prev => ({ ...prev, code: e.target.value }))} />
          </label>
          <label className="block space-y-2">
            <span>Phân công Giảng viên</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={classForm.lecturerId}
              onChange={e => setClassForm(prev => ({ ...prev, lecturerId: e.target.value }))}
            >
              <option value="">-- Chưa phân công --</option>
              {lecturers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.email})</option>)}
            </select>
          </label>
          <Button type="submit" isLoading={saving}>{editingClassId ? "Lưu thay đổi" : "Tạo Lớp"}</Button>
        </form>
      </Modal>

      {/* Edit Semester Modal */}
      <Modal isOpen={editSemesterModalOpen} onClose={() => setEditSemesterModalOpen(false)} title="Chỉnh sửa Học kỳ">
        <form onSubmit={handleUpdateSemester} className="space-y-4">
          <label className="block space-y-2">
            <span>Mã học kỳ (*)</span>
            <Input
              required
              placeholder="VD: FA24, SP25"
              value={editSemesterForm.code}
              onChange={e => setEditSemesterForm(prev => ({ ...prev, code: e.target.value }))}
            />
          </label>
          <label className="block space-y-2">
            <span>Tên Season / Nhóm kỳ</span>
            <Input
              placeholder="VD: Fall 2024, Spring 2025"
              value={editSemesterForm.season}
              onChange={e => setEditSemesterForm(prev => ({ ...prev, season: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span>Ngày bắt đầu</span>
              <Input
                type="date"
                value={editSemesterForm.startDate}
                onChange={e => setEditSemesterForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </label>
            <label className="block space-y-2">
              <span>Ngày kết thúc</span>
              <Input
                type="date"
                value={editSemesterForm.endDate}
                onChange={e => setEditSemesterForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setEditSemesterModalOpen(false)}>Hủy</Button>
            <Button type="submit" isLoading={saving}>Lưu thay đổi</Button>
          </div>
        </form>
      </Modal>

    </DashboardLayout>
  )
}
