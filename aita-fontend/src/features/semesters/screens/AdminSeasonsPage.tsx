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

  const totalSeasonsCount = Object.keys(groupedSeasons).length
  const totalSemestersCount = semesters.length
  const totalSubjectsAcross = semesters.reduce((sum, s) => sum + (s.subjectCount || 0), 0)
  const totalClassesAcross = semesters.reduce((sum, s) => sum + (s.classCount || 0), 0)

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.seasons.title', 'Quản trị chương trình học')}
      headerSubtitle={t('admin.seasons.subtitle', 'Điều hướng phân cấp Kỳ → Môn → Lớp')}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ── 1. SIGNATURE EXECUTIVE KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Chu kỳ năm học (Seasons) */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chu Kỳ Năm Học (Seasons)
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : totalSeasonsCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Nhóm học kỳ đào tạo</span>
            </div>
          </div>

          {/* KPI 2: Tổng học kỳ */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng Học Kỳ Đã Mở
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <CalendarDays className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : totalSemestersCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Spring / Summer / Fall</span>
            </div>
          </div>

          {/* KPI 3: Lượt môn học phân bổ */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lượt Môn Gắn Vào Kỳ
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : totalSubjectsAcross}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Được mở giảng dạy</span>
            </div>
          </div>

          {/* KPI 4: Lớp học vận hành */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lớp Học Vận Hành
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : totalClassesAcross}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Lớp học phần trên hệ thống</span>
            </div>
          </div>
        </div>

        <ErrorNotice message={error} onRetry={() => void loadSemesters()} />

        {/* ── 2. BREADCRUMBS NAVIGATION ── */}
        <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div className="flex items-center gap-3">
            {level !== 'season' && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (level === 'class') navigateTo('subject')
                  else if (level === 'subject') navigateTo('semester')
                  else if (level === 'semester') navigateTo('season')
                }}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
              <button
                onClick={() => navigateTo('season')}
                className={`hover:text-[#FA7014] cursor-pointer px-2.5 py-1 rounded-lg ${level === 'season' ? 'bg-orange-50 text-[#FA7014] dark:bg-orange-950/60 dark:text-orange-400 font-bold' : ''}`}
              >
                {t('admin.seasons.all_seasons', 'Tất cả kỳ (Seasons)')}
              </button>
              {selectedSeason && (
                <>
                  <span className="text-slate-300">/</span>
                  <button
                    onClick={() => navigateTo('semester')}
                    className={`hover:text-[#FA7014] cursor-pointer px-2.5 py-1 rounded-lg ${level === 'semester' ? 'bg-orange-50 text-[#FA7014] dark:bg-orange-950/60 dark:text-orange-400 font-bold' : ''}`}
                  >
                    {selectedSeason}
                  </button>
                </>
              )}
              {selectedSemester && (
                <>
                  <span className="text-slate-300">/</span>
                  <button
                    onClick={() => navigateTo('subject')}
                    className={`hover:text-[#FA7014] cursor-pointer px-2.5 py-1 rounded-lg ${level === 'subject' ? 'bg-orange-50 text-[#FA7014] dark:bg-orange-950/60 dark:text-orange-400 font-bold' : ''}`}
                  >
                    {formatSemesterCode(selectedSemester.code)}
                  </button>
                </>
              )}
              {selectedSubject && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-mono font-bold">
                    {selectedSubject.code}
                  </span>
                </>
              )}
            </div>
          </div>

          {level === 'season' && (
            <Button
              onClick={() => setSeasonModalOpen(true)}
              variant="primary"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tạo Season Mới
            </Button>
          )}
        </div>

        {/* ── 3. LEVEL 1: SEASONS ── */}
        {!loading && level === 'season' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedSeasons).map(([season, sems]) => {
              const totalClasses = sems.reduce((sum, s) => sum + (s.classCount || 0), 0)
              const totalSubjects = sems.reduce((sum, s) => sum + (s.subjectCount || 0), 0)
              return (
                <article
                  key={season}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all"
                  onClick={() => { setSelectedSeason(season); setLevel('semester') }}
                >
                  <div className="bg-[#FA7014] p-4 text-white flex justify-between items-center">
                    <h3 className="font-extrabold flex items-center gap-2 text-base">
                      <Layers className="w-5 h-5" /> {season}
                    </h3>
                    <button
                      className="p-1.5 hover:bg-white/20 rounded-lg cursor-pointer transition-colors"
                      onClick={(e) => handleDeleteSeason(season, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 flex justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{sems.length}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Semesters</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{totalSubjects}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Môn học</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{totalClasses}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Lớp học</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Level 2: Semesters */}
        {!loading && level === 'semester' && selectedSeason && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(groupedSeasons[selectedSeason] || []).sort((a,b) => (a.code > b.code ? 1 : -1)).map(sem => (
              <article
                key={sem.id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 cursor-pointer transition-all dark:border-slate-800 dark:bg-slate-900 group"
                onClick={() => { setSelectedSemester(sem); loadSemesterSubjects(sem.id); setLevel('subject') }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-extrabold flex items-center gap-2 text-base text-slate-900 dark:text-white">
                    <CalendarDays className="w-5 h-5 text-[#FA7014]" />
                    {formatSemesterCode(sem.code)}
                  </h3>
                  <button
                    className="p-1.5 rounded-xl text-slate-400 hover:text-[#FA7014] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Chỉnh sửa học kỳ"
                    onClick={(e) => handleOpenEditSemester(sem, e)}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" /> {sem.subjectCount || 0} môn học</span>
                  <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" /> {sem.classCount || 0} lớp</span>
                </div>
                {(sem.startDate || sem.endDate) && (
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
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
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Môn học trong {formatSemesterCode(selectedSemester.code)}
              </h2>
              <Button
                onClick={() => void handleOpenAddSubjects()}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Gắn môn vào kỳ
              </Button>
            </div>
            {loadingSub ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                Đang tải danh sách môn học...
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 font-extrabold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Mã môn</th>
                      <th className="px-5 py-3.5">Tên môn</th>
                      <th className="px-5 py-3.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {semesterSubjects.map(sub => (
                      <tr
                        key={sub.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        onClick={() => { setSelectedSubject(sub); loadSubjectClasses(selectedSemester.id, sub.id); setLevel('class') }}
                      >
                        <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white">{sub.code}</td>
                        <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">{sub.name}</td>
                        <td className="px-5 py-3 text-center">
                          <Button variant="ghost" size="icon" onClick={(e) => handleRemoveSemesterSubject(sub.id, e)} className="hover:bg-rose-50 text-rose-500 rounded-xl cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {semesterSubjects.length === 0 && (
                      <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400">Chưa có môn học nào được gắn vào kỳ này.</td></tr>
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
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Các lớp {selectedSubject.code} trong {formatSemesterCode(selectedSemester.code)}
              </h2>
              <Button
                onClick={() => void handleOpenClassModal()}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Tạo Lớp Học
              </Button>
            </div>
            {loadingSub ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                Đang tải danh sách lớp học...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectClasses.map(cls => (
                  <article key={cls.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/admin/classes/${cls.id}`} className="font-extrabold text-slate-900 dark:text-white hover:text-[#FA7014] font-mono text-base flex items-center gap-1.5 transition-colors">
                          {cls.code} <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <p className="text-xs text-slate-500 mt-1">{cls.lecturers?.map(l => l.name).join(', ') || 'Chưa phân công GV'}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => void handleOpenClassModal(cls)} className="rounded-xl text-slate-400 hover:text-[#FA7014] hover:bg-slate-50 cursor-pointer"><Edit3 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => void handleDeleteClass(cls.id)} className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1 text-slate-500"><Users className="w-3.5 h-3.5 text-[#FA7014]" /> {cls.studentCount || 0} SV</span>
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
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Tên Season (VD: Fall 2026)</span>
            <Input required value={seasonForm.season} onChange={e => setSeasonForm(prev => ({ ...prev, season: e.target.value }))} className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-[#FA7014]" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày bắt đầu</span>
              <Input type="date" value={seasonForm.startDate} onChange={e => setSeasonForm(prev => ({ ...prev, startDate: e.target.value }))} className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-[#FA7014]" />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày kết thúc</span>
              <Input type="date" value={seasonForm.endDate} onChange={e => setSeasonForm(prev => ({ ...prev, endDate: e.target.value }))} className="rounded-xl border-slate-200 dark:border-slate-800 focus:border-[#FA7014]" />
            </label>
          </div>
          <p className="text-xs text-slate-500">Hệ thống sẽ tự tạo 9 Term con và gán các môn theo ma trận chuẩn.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSeasonModalOpen(false)} className="rounded-xl font-bold border-slate-200 dark:border-slate-800">Hủy</Button>
            <Button type="submit" variant="primary" isLoading={saving}>Khởi tạo Season</Button>
          </div>
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal isOpen={addSubjectModalOpen} onClose={() => setAddSubjectModalOpen(false)} title="Gắn môn học vào Học kỳ">
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">Chọn môn học bên dưới để gán vào {selectedSemester && formatSemesterCode(selectedSemester.code)}:</p>
          <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {saving && <p className="p-4 text-center text-xs text-slate-400">Đang tải môn học...</p>}
            {!saving && allSubjects.filter(s => !semesterSubjects.find(ss => ss.id === s.id)).map(sub => (
              <label key={sub.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedSubjectIdsToAdd.has(sub.id)}
                  onChange={() => {
                    const next = new Set(selectedSubjectIdsToAdd)
                    next.has(sub.id) ? next.delete(sub.id) : next.add(sub.id)
                    setSelectedSubjectIdsToAdd(next)
                  }}
                  className="w-4 h-4 rounded text-[#FA7014] focus:ring-[#FA7014]"
                />
                <div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{sub.code}</span>
                  <span className="ml-2 text-slate-700 dark:text-slate-300 text-xs">{sub.name}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setAddSubjectModalOpen(false)} className="rounded-xl font-bold border-slate-200 dark:border-slate-800 text-xs">Hủy</Button>
            <Button type="button" onClick={handleAddSemesterSubjects} isLoading={saving} disabled={selectedSubjectIdsToAdd.size === 0} variant="primary">Gắn môn học</Button>
          </div>
        </div>
      </Modal>

      {/* Class Modal */}
      <Modal isOpen={classModalOpen} onClose={() => setClassModalOpen(false)} title={editingClassId ? "Chỉnh sửa lớp học" : "Tạo Lớp Học mới"}>
        <form onSubmit={handleSaveClass} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Mã lớp (*)</span>
            <Input required placeholder="VD: SE1801" value={classForm.code} onChange={e => setClassForm(prev => ({ ...prev, code: e.target.value }))} className="text-xs focus:border-[#FA7014] rounded-xl font-mono uppercase border-slate-200 dark:border-slate-800" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Phân công Giảng viên</span>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#FA7014]"
              value={classForm.lecturerId}
              onChange={e => setClassForm(prev => ({ ...prev, lecturerId: e.target.value }))}
            >
              <option value="">-- Chưa phân công --</option>
              {lecturers.map(l => <option key={l.id} value={l.id}>{l.name} ({l.email})</option>)}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setClassModalOpen(false)} className="rounded-xl font-bold border-slate-200 dark:border-slate-800 text-xs">Hủy</Button>
            <Button type="submit" variant="primary" isLoading={saving}>{editingClassId ? "Lưu thay đổi" : "Tạo Lớp"}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Semester Modal */}
      <Modal isOpen={editSemesterModalOpen} onClose={() => setEditSemesterModalOpen(false)} title="Chỉnh sửa Học kỳ">
        <form onSubmit={handleUpdateSemester} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Mã học kỳ (*)</span>
            <Input
              required
              placeholder="VD: FA24, SP25"
              value={editSemesterForm.code}
              onChange={e => setEditSemesterForm(prev => ({ ...prev, code: e.target.value }))}
              className="text-xs focus:border-[#FA7014] rounded-xl font-mono uppercase border-slate-200 dark:border-slate-800"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Tên Season / Nhóm kỳ</span>
            <Input
              placeholder="VD: Fall 2024, Spring 2025"
              value={editSemesterForm.season}
              onChange={e => setEditSemesterForm(prev => ({ ...prev, season: e.target.value }))}
              className="text-xs focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày bắt đầu</span>
              <Input
                type="date"
                value={editSemesterForm.startDate}
                onChange={e => setEditSemesterForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-xs focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày kết thúc</span>
              <Input
                type="date"
                value={editSemesterForm.endDate}
                onChange={e => setEditSemesterForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-xs focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setEditSemesterModalOpen(false)} className="rounded-xl font-bold border-slate-200 dark:border-slate-800 text-xs">Hủy</Button>
            <Button type="submit" variant="primary" isLoading={saving}>Lưu thay đổi</Button>
          </div>
        </form>
      </Modal>

    </DashboardLayout>
  )
}
