'use client'

import { RefreshAction } from '@/components/actions/RefreshAction'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice } from '@/components/ui/feedback'
import { semestersApi } from '@/lib/api/modules/semesters'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { classesApi } from '@/lib/api/modules/classes'
import { usersApi } from '@/lib/api/modules/users'
import { errorMessage } from '@/lib/api/errors'
import type { SemesterRow, SubjectRow, ClassRow, UserRow } from '@/lib/api/contracts'
import { formatSemesterCode } from '@/utils/semester'
import { getSeasonFromDate, type CanonicalSeason } from '@/lib/seasons'
import { useLanguage } from '@/providers/language-provider'
import { cn } from '@/lib/utils'
import {
  CalendarDays,
  Layers,
  Plus,
  Trash2,
  Library,
  GraduationCap,
  Edit3,
  BookOpen,
  Users,
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Sun,
  Snowflake,
  Leaf,
  Flower2,
  Check,
  AlertTriangle,
  Clock,
  Filter,
  X,
  School,
  ArrowRight,
  Shield,
  Layers3,
  CalendarCheck,
} from 'lucide-react'

type TabType = 'curriculum' | 'all_semesters' | 'classes'

export default function AdminSeasonsPage() {
  const { t } = useLanguage()

  // Primary Data
  const [semesters, setSemesters] = React.useState<SemesterRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)

  // Navigation & View Mode
  const [activeTab, setActiveTab] = React.useState<TabType>('curriculum')
  const [selectedSeason, setSelectedSeason] = React.useState<string | null>(null)
  const [selectedSemesterId, setSelectedSemesterId] = React.useState<string | null>(null)
  
  // Search & Filters
  const [subjectSearch, setSubjectSearch] = React.useState('')
  const [semesterTableSearch, setSemesterTableSearch] = React.useState('')
  const [semesterSeasonFilter, setSemesterSeasonFilter] = React.useState<string>('all')

  // Date / Month / Year Filters for Seasons
  const [selectedYear, setSelectedYear] = React.useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = React.useState<{ start: string; end: string }>({ start: '', end: '' })

  // Sub-data for selected semester
  const [semesterSubjects, setSemesterSubjects] = React.useState<SubjectRow[]>([])
  const [loadingSubjects, setLoadingSubjects] = React.useState(false)

  // Classes inspection modal/drawer
  const [inspectClassesModal, setInspectClassesModal] = React.useState(false)
  const [inspectSubject, setInspectSubject] = React.useState<SubjectRow | null>(null)
  const [inspectClassesList, setInspectClassesList] = React.useState<ClassRow[]>([])
  const [loadingInspectClasses, setLoadingInspectClasses] = React.useState(false)

  // Create Season Modal
  const [seasonModalOpen, setSeasonModalOpen] = React.useState(false)
  const [seasonForm, setSeasonForm] = React.useState<{
    seasonType: CanonicalSeason
    year: number
    startDate: string
    endDate: string
  }>({
    seasonType: 'Fall',
    year: new Date().getFullYear(),
    startDate: `${new Date().getFullYear()}-09-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
  })

  // Create Single Semester Modal
  const [singleSemesterModalOpen, setSingleSemesterModalOpen] = React.useState(false)
  const [singleSemesterForm, setSingleSemesterForm] = React.useState({
    code: '',
    season: '',
    startDate: '',
    endDate: '',
  })

  // Edit Semester Modal
  const [editSemesterModalOpen, setEditSemesterModalOpen] = React.useState(false)
  const [editingSemester, setEditingSemester] = React.useState<SemesterRow | null>(null)
  const [editSemesterForm, setEditSemesterForm] = React.useState({
    code: '',
    season: '',
    startDate: '',
    endDate: '',
  })

  // Add Subjects Modal
  const [addSubjectModalOpen, setAddSubjectModalOpen] = React.useState(false)
  const [allSubjects, setAllSubjects] = React.useState<SubjectRow[]>([])
  const [loadingAllSubjects, setLoadingAllSubjects] = React.useState(false)
  const [addSubjectSearch, setAddSubjectSearch] = React.useState('')
  const [selectedSubjectIdsToAdd, setSelectedSubjectIdsToAdd] = React.useState<Set<string>>(new Set())

  // Class Modal
  const [classModalOpen, setClassModalOpen] = React.useState(false)
  const [editingClassId, setEditingClassId] = React.useState<string | null>(null)
  const [classForm, setClassForm] = React.useState({ code: '', lecturerId: '', subjectId: '' })
  const [lecturers, setLecturers] = React.useState<UserRow[]>([])

  // Action status & Delete Confirmation
  const [saving, setSaving] = React.useState(false)
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => Promise<void>
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  })

  // Current system season calculation
  const currentAcademicSeason = React.useMemo(() => getSeasonFromDate(new Date()), [])

  // Load all semesters
  const loadSemesters = React.useCallback(async (silently = false) => {
    if (!silently) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await semestersApi.getSemesters()
      setSemesters(data || [])
      setError(null)
    } catch (cause) {
      if (silently) throw cause
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSemesters()
  }, [loadSemesters])

  // Group semesters by season
  const groupedSeasons = React.useMemo(() => {
    return semesters.reduce((acc, sem) => {
      const s = sem.season || 'Chưa phân nhóm'
      if (!acc[s]) acc[s] = []
      acc[s].push(sem)
      return acc
    }, {} as Record<string, SemesterRow[]>)
  }, [semesters])

  const seasonNames = React.useMemo(() => Object.keys(groupedSeasons), [groupedSeasons])

  // Extract all distinct academic years from semesters and current date
  const availableYears = React.useMemo(() => {
    const years = new Set<number>()
    semesters.forEach(s => {
      if (s.startDate) {
        years.add(new Date(s.startDate).getFullYear())
      }
      if (s.endDate) {
        years.add(new Date(s.endDate).getFullYear())
      }
      const parsed = parseInt(s.code, 10)
      if (parsed > 2000 && parsed < 2100) {
        years.add(parsed)
      }
      const match = s.season?.match(/\b(20\d{2})\b/)
      if (match) {
        years.add(parseInt(match[1], 10))
      }
    })
    years.add(new Date().getFullYear())
    return Array.from(years).sort((a, b) => b - a)
  }, [semesters])

  // Filter season names by year and custom date range
  const filteredSeasonNames = React.useMemo(() => {
    return seasonNames.filter(season => {
      const sems = groupedSeasons[season] || []
      // Filter by selected year
      if (selectedYear !== 'all') {
        const y = parseInt(selectedYear, 10)
        const matchYear = sems.some(s => {
          const semYear = s.startDate ? new Date(s.startDate).getFullYear() : (parseInt(s.code, 10) || null)
          return semYear === y || (s.season && s.season.includes(selectedYear))
        })
        if (!matchYear) return false
      }
      // Filter by custom start date
      if (dateRangeFilter.start) {
        const filterStart = new Date(dateRangeFilter.start).getTime()
        const matchStart = sems.some(s => !s.endDate || new Date(s.endDate).getTime() >= filterStart)
        if (!matchStart) return false
      }
      // Filter by custom end date
      if (dateRangeFilter.end) {
        const filterEnd = new Date(dateRangeFilter.end).getTime()
        const matchEnd = sems.some(s => !s.startDate || new Date(s.startDate).getTime() <= filterEnd)
        if (!matchEnd) return false
      }
      return true
    })
  }, [seasonNames, groupedSeasons, selectedYear, dateRangeFilter])

  // Automatically select the active season or first season in filtered list
  React.useEffect(() => {
    if (filteredSeasonNames.length > 0) {
      if (!selectedSeason || !filteredSeasonNames.includes(selectedSeason)) {
        // Prioritize active season
        const activeSem = semesters.find(s => s.isActive && s.season && filteredSeasonNames.includes(s.season))
        if (activeSem?.season) {
          setSelectedSeason(activeSem.season)
        } else {
          setSelectedSeason(filteredSeasonNames[0])
        }
      }
    }
  }, [filteredSeasonNames, selectedSeason, semesters])

  // List of terms in current season
  const currentSeasonSemesters = React.useMemo(() => {
    if (!selectedSeason || !groupedSeasons[selectedSeason]) return []
    return [...groupedSeasons[selectedSeason]].sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D/g, '') || '0', 10)
      const numB = parseInt(b.code.replace(/\D/g, '') || '0', 10)
      if (numA && numB) return numA - numB
      return a.code.localeCompare(b.code)
    })
  }, [selectedSeason, groupedSeasons])

  // Automatically select the first term if none selected
  React.useEffect(() => {
    if (currentSeasonSemesters.length > 0) {
      if (!selectedSemesterId || !currentSeasonSemesters.some(s => s.id === selectedSemesterId)) {
        setSelectedSemesterId(currentSeasonSemesters[0].id)
      }
    } else {
      setSelectedSemesterId(null)
    }
  }, [currentSeasonSemesters, selectedSemesterId])

  // Load subjects whenever selectedSemesterId changes
  const loadSemesterSubjects = React.useCallback(async (semId: string) => {
    setLoadingSubjects(true)
    try {
      const data = await semestersApi.getSemesterSubjects(semId)
      setSemesterSubjects(data || [])
    } catch (cause) {
      console.error(cause)
      setSemesterSubjects([])
    } finally {
      setLoadingSubjects(false)
    }
  }, [])

  React.useEffect(() => {
    if (selectedSemesterId) {
      void loadSemesterSubjects(selectedSemesterId)
    } else {
      setSemesterSubjects([])
    }
  }, [selectedSemesterId, loadSemesterSubjects])

  // Active semester info
  const activeSemesterRow = React.useMemo(() => {
    return semesters.find(s => s.isActive) || null
  }, [semesters])

  const activeSeasonName = React.useMemo(() => {
    return activeSemesterRow?.season || null
  }, [activeSemesterRow])

  // Filtered subjects in the current selected term
  const filteredSubjects = React.useMemo(() => {
    if (!subjectSearch.trim()) return semesterSubjects
    const q = subjectSearch.toLowerCase().trim()
    return semesterSubjects.filter(
      s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [semesterSubjects, subjectSearch])

  // Filtered semesters for Tab 2 (All Semesters Table)
  const filteredTableSemesters = React.useMemo(() => {
    return semesters.filter(sem => {
      const matchSeason = semesterSeasonFilter === 'all' || sem.season === semesterSeasonFilter
      const q = semesterTableSearch.toLowerCase().trim()
      const matchQuery =
        !q ||
        sem.code.toLowerCase().includes(q) ||
        (sem.season && sem.season.toLowerCase().includes(q))
      return matchSeason && matchQuery
    })
  }, [semesters, semesterSeasonFilter, semesterTableSearch])

  // KPI Calculations
  const totalSeasonsCount = seasonNames.length
  const totalSemestersCount = semesters.length
  const totalSubjectsCount = semesters.reduce((sum, s) => sum + (s.subjectCount || 0), 0)
  const totalClassesCount = semesters.reduce((sum, s) => sum + (s.classCount || 0), 0)

  // Handlers for Season Management
  const handleActivateSeason = async (season: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSaving(true)
    try {
      await semestersApi.activateSeason(season)
      await loadSemesters(true)
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSeasonPrompt = (season: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setDeleteModal({
      isOpen: true,
      title: `Xác nhận xóa toàn bộ Chu kỳ "${season}"?`,
      description: `Hành động này sẽ xóa toàn bộ các học kỳ, danh sách môn học liên kết và lớp học phần thuộc chu kỳ ${season}. Thao tác không thể hoàn tác!`,
      onConfirm: async () => {
        try {
          await semestersApi.deleteSeason(season)
          setDeleteModal(prev => ({ ...prev, isOpen: false }))
          if (selectedSeason === season) {
            setSelectedSeason(null)
          }
          await loadSemesters()
        } catch (cause) {
          alert(errorMessage(cause))
        }
      },
    })
  }

  // Preset date update for Season creation
  const handleSeasonTypeChange = (type: CanonicalSeason) => {
    const y = seasonForm.year
    let start = `${y}-09-01`
    let end = `${y}-12-31`
    if (type === 'Spring') {
      start = `${y}-01-15`
      end = `${y}-05-30`
    } else if (type === 'Summer') {
      start = `${y}-06-01`
      end = `${y}-08-31`
    }
    setSeasonForm(prev => ({
      ...prev,
      seasonType: type,
      startDate: start,
      endDate: end,
    }))
  }

  const handleCreateSeasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const seasonName = `${seasonForm.seasonType} ${seasonForm.year}`
    setSaving(true)
    try {
      await semestersApi.createSeason({
        season: seasonName,
        startDate: seasonForm.startDate || undefined,
        endDate: seasonForm.endDate || undefined,
      })
      setSeasonModalOpen(false)
      setSelectedSeason(seasonName)
      await loadSemesters()
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  // Create Single Semester Submit
  const handleCreateSingleSemester = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!singleSemesterForm.code.trim() || saving) return
    setSaving(true)
    try {
      await semestersApi.createSemester({
        code: singleSemesterForm.code.trim(),
        season: singleSemesterForm.season.trim() || undefined,
        startDate: singleSemesterForm.startDate || undefined,
        endDate: singleSemesterForm.endDate || undefined,
        isActive: false,
      })
      setSingleSemesterModalOpen(false)
      setSingleSemesterForm({ code: '', season: '', startDate: '', endDate: '' })
      await loadSemesters()
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  // Edit Semester
  const handleOpenEditSemester = (sem: SemesterRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingSemester(sem)
    setEditSemesterForm({
      code: sem.code || '',
      season: sem.season || '',
      startDate: sem.startDate ? sem.startDate.slice(0, 10) : '',
      endDate: sem.endDate ? sem.endDate.slice(0, 10) : '',
    })
    setEditSemesterModalOpen(true)
  }

  const handleUpdateSemesterSubmit = async (e: React.FormEvent) => {
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

  const handleDeleteSemesterPrompt = (sem: SemesterRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setDeleteModal({
      isOpen: true,
      title: `Xóa học kỳ "${sem.code}"?`,
      description: `Học kỳ này và các liên kết môn học sẽ bị xóa. Các lớp học phần có thể cần được phân bổ lại.`,
      onConfirm: async () => {
        try {
          await semestersApi.deleteSemester(sem.id)
          setDeleteModal(prev => ({ ...prev, isOpen: false }))
          await loadSemesters()
        } catch (cause) {
          alert(errorMessage(cause))
        }
      },
    })
  }

  // Subject Management inside Semester
  const handleOpenAddSubjects = async () => {
    if (!selectedSemesterId) return
    setAddSubjectModalOpen(true)
    setLoadingAllSubjects(true)
    setSelectedSubjectIdsToAdd(new Set())
    setAddSubjectSearch('')
    try {
      const subs = await subjectsApi.getSubjects(1, 500)
      setAllSubjects(subs || [])
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setLoadingAllSubjects(false)
    }
  }

  const handleAddSemesterSubjectsSubmit = async () => {
    if (!selectedSemesterId || selectedSubjectIdsToAdd.size === 0) return
    setSaving(true)
    try {
      await semestersApi.addSemesterSubjects(selectedSemesterId, Array.from(selectedSubjectIdsToAdd))
      await loadSemesterSubjects(selectedSemesterId)
      await loadSemesters(true)
      setAddSubjectModalOpen(false)
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveSemesterSubject = async (subId: string, subName: string) => {
    if (!selectedSemesterId) return
    setDeleteModal({
      isOpen: true,
      title: `Gỡ môn học khỏi kỳ này?`,
      description: `Bạn có chắc muốn gỡ môn "${subName}" khỏi học kỳ hiện tại? Các lớp học phần đã mở của môn này trong kỳ vẫn được giữ nguyên.`,
      onConfirm: async () => {
        try {
          await semestersApi.removeSemesterSubject(selectedSemesterId, subId)
          setSemesterSubjects(prev => prev.filter(s => s.id !== subId))
          setDeleteModal(prev => ({ ...prev, isOpen: false }))
          await loadSemesters(true)
        } catch (cause) {
          alert(errorMessage(cause))
        }
      },
    })
  }

  // Inspect Classes of a Subject
  const handleInspectClasses = async (sub: SubjectRow) => {
    if (!selectedSemesterId) return
    setInspectSubject(sub)
    setInspectClassesModal(true)
    setLoadingInspectClasses(true)
    try {
      const data = await semestersApi.getClassesBySubject(selectedSemesterId, sub.id)
      setInspectClassesList(data || [])
    } catch (cause) {
      console.error(cause)
      setInspectClassesList([])
    } finally {
      setLoadingInspectClasses(false)
    }
  }

  // Class Management Handlers
  const handleOpenCreateClassForSubject = async (subId: string) => {
    if (!selectedSemesterId) return
    setEditingClassId(null)
    setClassForm({ code: '', lecturerId: '', subjectId: subId })
    setClassModalOpen(true)
    if (lecturers.length === 0) {
      try {
        const rows: UserRow[] = []
        for (let p = 1; p <= 5; p++) {
          const batch = await usersApi.getUsers('lecturer', p, 100)
          rows.push(...batch)
          if (batch.length < 100) break
        }
        setLecturers(rows)
      } catch (cause) {
        console.error(cause)
      }
    }
  }

  const handleSaveClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSemesterId || !classForm.subjectId || !classForm.code.trim() || saving) return
    setSaving(true)
    try {
      const payload = {
        code: classForm.code.trim().toUpperCase(),
        subjectId: classForm.subjectId,
        semesterId: selectedSemesterId,
        ...(classForm.lecturerId ? { lecturerId: classForm.lecturerId } : {}),
      }
      if (editingClassId) {
        await classesApi.updateClass(editingClassId, { ...payload, keepExistingInstructors: false })
      } else {
        await classesApi.createClass(payload)
      }
      setClassModalOpen(false)
      if (inspectSubject && inspectSubject.id === classForm.subjectId) {
        const data = await semestersApi.getClassesBySubject(selectedSemesterId, inspectSubject.id)
        setInspectClassesList(data || [])
      }
      await loadSemesters(true)
    } catch (cause) {
      alert(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const selectedSemesterObj = React.useMemo(() => {
    return semesters.find(s => s.id === selectedSemesterId) || null
  }, [semesters, selectedSemesterId])

  // Neutral icon for seasons (no distracting colors)
  const getSeasonVisual = (seasonName: string) => {
    const lower = seasonName.toLowerCase()
    let icon = Leaf
    if (lower.includes('spring') || lower.includes('xuân')) {
      icon = Flower2
    } else if (lower.includes('summer') || lower.includes('hè')) {
      icon = Sun
    }
    return {
      icon,
      color: 'text-slate-500 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700',
    }
  }

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.seasons.title', 'Chương trình Đào tạo & Quản lý Học kỳ')}
      headerSubtitle={t(
        'admin.seasons.subtitle',
        'Điều phối chu kỳ năm học (Seasons), lộ trình 9 kỳ đào tạo, phân bổ môn học và lớp học phần'
      )}
    >
      <div className="w-full space-y-6 pb-12">
        {/* ── 1. HEADER EXECUTIVE ACTION TOOLBAR ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Quản lý Chương trình & Học kỳ
                </h2>
                {activeSeasonName && (
                  <Badge variant="success" className="text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Kỳ hiện tại: {activeSeasonName}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chu kỳ đào tạo hiện tại của năm học: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentAcademicSeason.label} ({currentAcademicSeason.nameVi})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <RefreshAction onRefresh={() => loadSemesters(true)} disabled={loading} busy={refreshing} cachePaths={["/semesters"]} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSingleSemesterModalOpen(true)}
              className="gap-1.5 text-xs rounded-xl border-slate-200 dark:border-slate-800"
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <span>Tạo Kỳ riêng lẻ</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSeasonForm({
                  seasonType: currentAcademicSeason.season,
                  year: currentAcademicSeason.year,
                  startDate: `${currentAcademicSeason.year}-09-01`,
                  endDate: `${currentAcademicSeason.year}-12-31`,
                })
                setSeasonModalOpen(true)
              }}
              className="gap-1.5 text-xs rounded-xl font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Khởi tạo Season mới</span>
            </Button>
          </div>
        </div>



        {error && <ErrorNotice message={error} onRetry={() => void loadSemesters()} />}

        {/* ── 2. COMPACT DATE & SEASON FILTER BAR ── */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          {/* Top row: Section Title + Year & Date Range Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-200/60 dark:border-orange-900/60">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Lọc & Chọn Chu kỳ Học kỳ</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    ({filteredSeasonNames.length} chu kỳ)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Lọc theo năm đào tạo và khoảng thời gian (ngày / tháng / năm)
                </p>
              </div>
            </div>

            {/* Date / Month / Year Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Year Selector */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-semibold text-slate-500">Năm:</span>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả năm</option>
                  {availableYears.map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-semibold text-slate-500">Từ ngày:</span>
                <input
                  type="date"
                  value={dateRangeFilter.start}
                  onChange={e => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none font-mono"
                />
              </div>

              {/* Date To */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1">
                <span className="text-[11px] font-semibold text-slate-500">Đến ngày:</span>
                <input
                  type="date"
                  value={dateRangeFilter.end}
                  onChange={e => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none font-mono"
                />
              </div>

              {/* Clear filters */}
              {(selectedYear !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all')
                    setDateRangeFilter({ start: '', end: '' })
                  }}
                  className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline px-2 py-1 cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Bottom row: Compact Season Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
            {filteredSeasonNames.map(season => {
              const sems = groupedSeasons[season] || []
              const isSelected = selectedSeason === season
              const isActiveSeason = sems.some(s => s.isActive)
              const visual = getSeasonVisual(season)
              const VisualIcon = visual.icon
              const totalClasses = sems.reduce((sum, s) => sum + (s.classCount || 0), 0)
              const firstSem = sems[0]
              const dateText = firstSem?.startDate && firstSem?.endDate
                ? `${new Date(firstSem.startDate).toLocaleDateString('vi-VN')} - ${new Date(firstSem.endDate).toLocaleDateString('vi-VN')}`
                : null

              return (
                <div
                  key={season}
                  onClick={() => setSelectedSeason(season)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center gap-2.5 select-none",
                    isSelected
                      ? "bg-white dark:bg-slate-900 border-orange-500 shadow-sm ring-1 ring-orange-500/30 text-slate-900 dark:text-white"
                      : "bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border", visual.bg, visual.color)}>
                    <VisualIcon className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs">{season}</span>
                      {isActiveSeason && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {dateText || `${sems.length} kỳ • ${totalClasses} lớp`}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200 dark:border-slate-700">
                      {!isActiveSeason && (
                        <button
                          type="button"
                          onClick={(e) => void handleActivateSeason(season, e)}
                          title="Kích hoạt làm kỳ hiện tại"
                          className="text-[10px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 p-1 rounded-md transition-colors"
                        >
                          Kích hoạt
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSeasonPrompt(season, e)}
                        title="Xóa chu kỳ"
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {filteredSeasonNames.length === 0 && (
              <p className="text-xs text-slate-400 py-1">
                Không tìm thấy chu kỳ nào trong khoảng thời gian đã lọc.
              </p>
            )}
          </div>
        </div>

        {/* ── 4. TABS NAVIGATION (CURRICULUM / ALL SEMESTERS / CLASSES) ── */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('curriculum')}
              className={cn(
                "px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
                activeTab === 'curriculum'
                  ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <BookOpen className="w-4 h-4" />
              <span>Khung 9 Kỳ & Môn học ({selectedSeason || 'Chu kỳ'})</span>
            </button>

            <button
              onClick={() => setActiveTab('all_semesters')}
              className={cn(
                "px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2",
                activeTab === 'all_semesters'
                  ? "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Bảng Tổng hợp Tất cả Học kỳ ({semesters.length})</span>
            </button>
          </div>

          {activeTab === 'curriculum' && selectedSemesterObj && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>Học kỳ: <strong className="text-slate-800 dark:text-slate-200">{selectedSemesterObj.code}</strong></span>
              {(selectedSemesterObj.startDate || selectedSemesterObj.endDate) && (
                <span className="font-mono text-[11px] text-slate-400">
                  ({selectedSemesterObj.startDate ? selectedSemesterObj.startDate.slice(0, 10) : ''} → {selectedSemesterObj.endDate ? selectedSemesterObj.endDate.slice(0, 10) : ''})
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── 5. TAB 1: CURRICULUM 9-TERM MATRIX VIEW ── */}
        {activeTab === 'curriculum' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Term Pill Selector (Kỳ 1 -> Kỳ 9) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Lộ trình phân bổ đào tạo trong {selectedSeason}:
                </span>
                <span className="text-xs text-slate-400">
                  {currentSeasonSemesters.length} Kỳ học phần
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {currentSeasonSemesters.map((sem) => {
                  const isSelected = selectedSemesterId === sem.id
                  return (
                    <button
                      key={sem.id}
                      onClick={() => setSelectedSemesterId(sem.id)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-2 cursor-pointer border",
                        isSelected
                          ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/25"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <span>{sem.code}</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-md text-[10px] font-mono",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        )}
                      >
                        {sem.subjectCount || 0} môn
                      </span>
                    </button>
                  )
                })}

                {currentSeasonSemesters.length === 0 && (
                  <p className="text-xs text-slate-400 py-2">
                    Chu kỳ này chưa có kỳ đào tạo nào. Vui lòng tạo mới season hoặc thêm kỳ.
                  </p>
                )}
              </div>
            </div>

            {/* Selected Term Details & Subject Table */}
            {selectedSemesterObj ? (
              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Danh sách Môn học phân bổ trong {selectedSemesterObj.code}</span>
                        {selectedSemesterObj.season && (
                          <Badge variant="outline" className="text-xs">
                            {selectedSemesterObj.season}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Tổng số {semesterSubjects.length} môn học được kích hoạt mở lớp trong kỳ này
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Subject search within term */}
                    <div className="relative w-56">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={subjectSearch}
                        onChange={e => setSubjectSearch(e.target.value)}
                        placeholder="Tìm mã hoặc tên môn..."
                        className="pl-8 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
                      />
                      {subjectSearch && (
                        <button
                          onClick={() => setSubjectSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditSemester(selectedSemesterObj)}
                      className="gap-1.5 text-xs rounded-xl border-slate-200 dark:border-slate-800 h-9"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sửa Kỳ</span>
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleOpenAddSubjects()}
                      className="gap-1.5 text-xs rounded-xl font-bold h-9"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Gán môn vào Kỳ</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {loadingSubjects ? (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500" />
                      <p>Đang tải danh sách môn học của học kỳ...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 font-extrabold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="px-5 py-3.5 w-16 text-center">STT</th>
                            <th className="px-5 py-3.5">Mã Môn Học</th>
                            <th className="px-5 py-3.5">Tên Môn Học</th>
                            <th className="px-5 py-3.5 text-center">Số Tín Chỉ</th>
                            <th className="px-5 py-3.5 text-center">Lớp Đang Mở</th>
                            <th className="px-5 py-3.5 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {filteredSubjects.map((sub, idx) => (
                            <tr
                              key={sub.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                            >
                              <td className="px-5 py-3.5 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              <td className="px-5 py-3.5">
                                <span className="px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-mono font-bold text-xs border border-orange-200/60 dark:border-orange-900/60">
                                  {sub.code}
                                </span>
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {sub.name}
                                </div>
                                {sub.description && (
                                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                    {sub.description}
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-3.5 text-center">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {sub.credit || 3} Tín chỉ
                                </Badge>
                              </td>

                              <td className="px-5 py-3.5 text-center">
                                <button
                                  onClick={() => void handleInspectClasses(sub)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 transition-colors cursor-pointer text-xs font-semibold"
                                >
                                  <School className="w-3.5 h-3.5 text-orange-500" />
                                  <span>Xem lớp</span>
                                </button>
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleOpenCreateClassForSubject(sub.id)}
                                    className="text-xs h-7 px-2.5 rounded-lg border-slate-200 dark:border-slate-800"
                                    title="Mở thêm lớp học phần cho môn này"
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1 text-orange-500" />
                                    <span>Tạo lớp</span>
                                  </Button>

                                  <Link href={`/admin/subjects`}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900"
                                      title="Đi tới danh mục môn học"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                  </Link>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => void handleRemoveSemesterSubject(sub.id, sub.name)}
                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Gỡ môn học khỏi kỳ này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}

                          {filteredSubjects.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-5 py-12 text-center text-slate-400 space-y-3">
                                <Library className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                                <p className="text-xs font-medium">
                                  {subjectSearch
                                    ? `Không tìm thấy môn học nào khớp với "${subjectSearch}"`
                                    : 'Chưa có môn học nào được gán vào học kỳ này.'}
                                </p>
                                {!subjectSearch && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleOpenAddSubjects()}
                                    className="text-xs rounded-xl"
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Gán môn học ngay
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Vui lòng chọn một học kỳ ở thanh trên để xem danh sách môn học.</p>
              </div>
            )}
          </div>
        )}

        {/* ── 6. TAB 2: ALL SEMESTERS COMPREHENSIVE DATA TABLE ── */}
        {activeTab === 'all_semesters' && (
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in duration-200">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                  Danh sách Tổng hợp Tất cả Học kỳ
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  Quản lý mã học kỳ, chu kỳ đào tạo (Season), thời gian bắt đầu và kết thúc
                </CardDescription>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Season dropdown filter */}
                <select
                  value={semesterSeasonFilter}
                  onChange={e => setSemesterSeasonFilter(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs px-3 focus:outline-none focus:border-orange-500 font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="all">Tất cả chu kỳ ({totalSeasonsCount})</option>
                  {seasonNames.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Table search input */}
                <div className="relative w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={semesterTableSearch}
                    onChange={e => setSemesterTableSearch(e.target.value)}
                    placeholder="Tìm mã kỳ, chu kỳ..."
                    className="pl-8 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
                  />
                  {semesterTableSearch && (
                    <button
                      onClick={() => setSemesterTableSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSingleSemesterModalOpen(true)}
                  className="gap-1.5 text-xs rounded-xl font-bold h-9"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo kỳ mới</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 font-extrabold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Mã Học Kỳ</th>
                      <th className="px-5 py-3.5">Chu kỳ (Season)</th>
                      <th className="px-5 py-3.5">Thời Gian Diễn Ra</th>
                      <th className="px-5 py-3.5 text-center">Trạng Thái</th>
                      <th className="px-5 py-3.5 text-center">Môn Học</th>
                      <th className="px-5 py-3.5 text-center">Lớp Học</th>
                      <th className="px-5 py-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredTableSemesters.map(sem => (
                      <tr
                        key={sem.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                            {formatSemesterCode(sem.code)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <Badge variant="outline" className="text-xs">
                            {sem.season || 'Chưa phân nhóm'}
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                          {sem.startDate || sem.endDate ? (
                            <span>
                              {sem.startDate ? sem.startDate.slice(0, 10) : '—'} → {sem.endDate ? sem.endDate.slice(0, 10) : '—'}
                            </span>
                          ) : (
                            <span className="text-slate-400">Chưa đặt thời gian</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          {sem.isActive ? (
                            <Badge variant="success" className="text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Đang kích hoạt
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] text-slate-400">
                              Lưu trữ
                            </Badge>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                          {sem.subjectCount || 0}
                        </td>

                        <td className="px-5 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                          {sem.classCount || 0}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (sem.season) setSelectedSeason(sem.season)
                                setSelectedSemesterId(sem.id)
                                setActiveTab('curriculum')
                              }}
                              className="text-xs h-7 px-2 rounded-lg"
                              title="Xem chi tiết môn học trong kỳ"
                            >
                              <BookOpen className="w-3.5 h-3.5 mr-1" />
                              Xem môn
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditSemester(sem)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900"
                              title="Chỉnh sửa kỳ"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSemesterPrompt(sem)}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Xóa kỳ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTableSemesters.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          Không tìm thấy học kỳ nào phù hợp với điều kiện tìm kiếm.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* ── MODAL: KHỞI TẠO SEASON MỚI (NĂM HỌC / CHU KỲ) ── */}
      <Modal
        isOpen={seasonModalOpen}
        onClose={() => setSeasonModalOpen(false)}
        title="Khởi tạo Chu kỳ Năm học Mới (Season)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSeasonSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/60 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Hệ thống tự động hóa:</strong> Khi khởi tạo Season, hệ thống sẽ tự sinh <strong>9 Kỳ đào tạo (Kỳ 1 → Kỳ 9)</strong> và tự động gán toàn bộ môn học tương ứng theo ma trận chuẩn ngành CNTT.
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">
              Chọn Mùa học kỳ (Season Type)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Fall', 'Spring', 'Summer'] as CanonicalSeason[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSeasonTypeChange(type)}
                  className={cn(
                    "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1",
                    seasonForm.seasonType === type
                      ? "border-orange-500 bg-orange-50/80 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-bold shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  )}
                >
                  <span className="text-xs font-bold">{type}</span>
                  <span className="text-[11px] text-slate-400">
                    {type === 'Fall' ? 'Kỳ Thu (09 - 12)' : type === 'Spring' ? 'Kỳ Xuân (01 - 05)' : 'Kỳ Hè (06 - 08)'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Năm học</span>
              <Input
                type="number"
                required
                value={seasonForm.year}
                onChange={e => {
                  const val = parseInt(e.target.value, 10) || new Date().getFullYear()
                  setSeasonForm(prev => ({ ...prev, year: val }))
                }}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800 focus:border-orange-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Tên chu kỳ dự kiến</span>
              <Input
                disabled
                value={`${seasonForm.seasonType} ${seasonForm.year}`}
                className="text-xs rounded-xl bg-slate-50 dark:bg-slate-800 font-bold text-orange-600 dark:text-orange-400 border-slate-200 dark:border-slate-800"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày bắt đầu</span>
              <Input
                type="date"
                value={seasonForm.startDate}
                onChange={e => setSeasonForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày kết thúc</span>
              <Input
                type="date"
                value={seasonForm.endDate}
                onChange={e => setSeasonForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSeasonModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="rounded-xl text-xs font-bold"
            >
              Khởi tạo Season & Ma trận 9 Kỳ
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: TẠO HỌC KỲ RIÊNG LẺ ── */}
      <Modal
        isOpen={singleSemesterModalOpen}
        onClose={() => setSingleSemesterModalOpen(false)}
        title="Tạo Kỳ Học phần Riêng lẻ"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSingleSemester} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Mã học kỳ (*)</span>
            <Input
              required
              placeholder="VD: Kỳ 1, FA26, SP26..."
              value={singleSemesterForm.code}
              onChange={e => setSingleSemesterForm(prev => ({ ...prev, code: e.target.value }))}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800 font-mono"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Thuộc Season / Chu kỳ</span>
            <Input
              placeholder="VD: Fall 2026, Summer 2026..."
              value={singleSemesterForm.season}
              onChange={e => setSingleSemesterForm(prev => ({ ...prev, season: e.target.value }))}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày bắt đầu</span>
              <Input
                type="date"
                value={singleSemesterForm.startDate}
                onChange={e => setSingleSemesterForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày kết thúc</span>
              <Input
                type="date"
                value={singleSemesterForm.endDate}
                onChange={e => setSingleSemesterForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSingleSemesterModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="rounded-xl text-xs font-bold"
            >
              Tạo Học kỳ
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: CHỈNH SỬA HỌC KỲ ── */}
      <Modal
        isOpen={editSemesterModalOpen}
        onClose={() => setEditSemesterModalOpen(false)}
        title={`Chỉnh sửa Học kỳ ${editingSemester?.code || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateSemesterSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Mã học kỳ (*)</span>
            <Input
              required
              value={editSemesterForm.code}
              onChange={e => setEditSemesterForm(prev => ({ ...prev, code: e.target.value }))}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800 font-mono"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Tên Season / Nhóm kỳ</span>
            <Input
              value={editSemesterForm.season}
              onChange={e => setEditSemesterForm(prev => ({ ...prev, season: e.target.value }))}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày bắt đầu</span>
              <Input
                type="date"
                value={editSemesterForm.startDate}
                onChange={e => setEditSemesterForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Ngày kết thúc</span>
              <Input
                type="date"
                value={editSemesterForm.endDate}
                onChange={e => setEditSemesterForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-xs rounded-xl border-slate-200 dark:border-slate-800"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditSemesterModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="rounded-xl text-xs font-bold"
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: GẮN MÔN HỌC VÀO HỌC KỲ (VỚI TÌM KIẾM THÔNG MINH) ── */}
      <Modal
        isOpen={addSubjectModalOpen}
        onClose={() => setAddSubjectModalOpen(false)}
        title={`Gán Môn Học vào ${selectedSemesterObj?.code || 'Học kỳ'}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={addSubjectSearch}
                onChange={e => setAddSubjectSearch(e.target.value)}
                placeholder="Tìm mã môn (PRJ, CSD...) hoặc tên môn..."
                className="pl-8 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
              />
              {addSubjectSearch && (
                <button
                  onClick={() => setAddSubjectSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Đã chọn: <strong className="text-orange-600 dark:text-orange-400">{selectedSubjectIdsToAdd.size}</strong> môn
              </span>
            </div>
          </div>

          {/* Subjects Checklist */}
          <div className="max-h-[380px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {loadingAllSubjects ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-orange-500 mb-2" />
                Đang tải danh mục môn học...
              </div>
            ) : (
              (() => {
                const available = allSubjects
                  .filter(s => !semesterSubjects.some(ss => ss.id === s.id))
                  .filter(s => {
                    if (!addSubjectSearch.trim()) return true
                    const q = addSubjectSearch.toLowerCase().trim()
                    return s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
                  })

                if (available.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-400">
                      {addSubjectSearch ? 'Không tìm thấy môn học nào khớp với từ khóa.' : 'Tất cả môn học đã được gán vào kỳ này.'}
                    </div>
                  )
                }

                return available.map(sub => {
                  const isChecked = selectedSubjectIdsToAdd.has(sub.id)
                  return (
                    <label
                      key={sub.id}
                      className={cn(
                        "flex items-center justify-between p-3 transition-colors cursor-pointer select-none",
                        isChecked
                          ? "bg-orange-50/60 dark:bg-orange-950/30"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = new Set(selectedSubjectIdsToAdd)
                            if (next.has(sub.id)) next.delete(sub.id)
                            else next.add(sub.id)
                            setSelectedSubjectIdsToAdd(next)
                          }}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {sub.code}
                            </span>
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {sub.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] font-mono">
                        {sub.credit || 3} Tín chỉ
                      </Badge>
                    </label>
                  )
                })
              })()
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              Chỉ hiển thị các môn chưa được gán vào học kỳ này.
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddSubjectModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={() => void handleAddSemesterSubjectsSubmit()}
                isLoading={saving}
                disabled={selectedSubjectIdsToAdd.size === 0}
                variant="primary"
                className="rounded-xl text-xs font-bold"
              >
                Gán {selectedSubjectIdsToAdd.size > 0 ? `${selectedSubjectIdsToAdd.size} Môn Học` : ''}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: XEM DANH SÁCH LỚP HỌC PHẦN CỦA MÔN ── */}
      <Modal
        isOpen={inspectClassesModal}
        onClose={() => setInspectClassesModal(false)}
        title={`Các Lớp Học Phần môn ${inspectSubject?.code || ''} (${selectedSemesterObj?.code || ''})`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {inspectSubject?.name} • Tổng cộng {inspectClassesList.length} lớp học phần
            </p>
            {inspectSubject && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleOpenCreateClassForSubject(inspectSubject.id)}
                className="gap-1 text-xs rounded-xl h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Lớp</span>
              </Button>
            )}
          </div>

          {loadingInspectClasses ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto text-orange-500 mb-2" />
              Đang tải danh sách lớp học...
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {inspectClassesList.map(cls => (
                <div key={cls.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/classes/${cls.id}`}
                        className="font-mono font-bold text-xs text-slate-900 dark:text-white hover:text-orange-600 flex items-center gap-1"
                      >
                        {cls.code}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <Badge variant="outline" className="text-[10px]">
                        {cls.studentCount || 0} Sinh viên
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Giảng viên: <strong className="text-slate-700 dark:text-slate-300">{cls.lecturers?.map(l => l.name).join(', ') || 'Chưa phân công'}</strong>
                    </p>
                  </div>

                  <Link href={`/admin/classes/${cls.id}`}>
                    <Button variant="outline" size="sm" className="text-xs h-7 rounded-lg">
                      Quản lý lớp
                    </Button>
                  </Link>
                </div>
              ))}

              {inspectClassesList.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <School className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p>Chưa có lớp học phần nào mở cho môn này trong học kỳ.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setInspectClassesModal(false)}
              className="text-xs rounded-xl"
            >
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: TẠO LỚP HỌC PHẦN MỚI CHO MÔN ── */}
      <Modal
        isOpen={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title="Tạo Lớp Học Phần Mới"
        maxWidth="md"
      >
        <form onSubmit={handleSaveClassSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Mã lớp (*)</span>
            <Input
              required
              placeholder="VD: SE1801, IA1902..."
              value={classForm.code}
              onChange={e => setClassForm(prev => ({ ...prev, code: e.target.value }))}
              className="text-xs rounded-xl border-slate-200 dark:border-slate-800 font-mono uppercase"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">Phân công Giảng viên</span>
            <select
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-orange-500"
              value={classForm.lecturerId}
              onChange={e => setClassForm(prev => ({ ...prev, lecturerId: e.target.value }))}
            >
              <option value="">-- Chưa phân công giảng viên --</option>
              {lecturers.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.email})
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClassModalOpen(false)}
              className="rounded-xl text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              className="rounded-xl text-xs font-bold"
            >
              Khởi tạo Lớp
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: XÁC NHẬN XÓA (CLEAN DESIGN SYSTEM CONFIRMATION) ── */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        title={deleteModal.title}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              {deleteModal.description}
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
              className="rounded-xl text-xs font-semibold"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => void deleteModal.onConfirm()}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Xác nhận Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

