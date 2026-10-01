'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { subjectsApi } from '@/lib/api/modules/subjects'
import type { SubjectRow } from '@/lib/api/contracts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { 
  ArrowLeft, Loader2, ChevronRight, AlertCircle,
  Pencil, Save, X, Search, Download, Check
} from 'lucide-react'

type TabType = 'syllabus' | 'clos' | 'sessions' | 'assessment'

// Type for which card is currently being edited
type EditingCard = 'header' | 'description' | 'learningOutcomes' | 'studentTasks' | 'tools' | 'assessments' | 'clos' | 'sessions' | null

export function AdminSubjectDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  
  const [subject, setSubject] = useState<SubjectRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('syllabus')
  const [sessionSearch, setSessionSearch] = useState('')
  const [downloadingSession, setDownloadingSession] = useState<number | null>(null)

  // Inline editing state
  const [editingCard, setEditingCard] = useState<EditingCard>(null)
  const [editHeaderName, setEditHeaderName] = useState('')
  const [editHeaderCode, setEditHeaderCode] = useState('')
  const [editHeaderDegree, setEditHeaderDegree] = useState('')
  const [editHeaderSemester, setEditHeaderSemester] = useState<number>(1)
  const [editHeaderCredits, setEditHeaderCredits] = useState<number>(3)
  const [editHeaderTimeAlloc, setEditHeaderTimeAlloc] = useState('')
  const [editHeaderPrereqs, setEditHeaderPrereqs] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStudentTasks, setEditStudentTasks] = useState<string[]>([])
  const [editTools, setEditTools] = useState<string[]>([])
  const [editLearningOutcomes, setEditLearningOutcomes] = useState<any[]>([])
  const [editAssessments, setEditAssessments] = useState<any[]>([])
  const [editClos, setEditClos] = useState<any[]>([])
  const [editSessions, setEditSessions] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)



  // Handles download for both Cloudinary (fl_attachment) and Google Drive URLs.
  // Google Drive's virus-scan redirect breaks <a download>, so we fetch as blob.
  const handleDownload = useCallback(async (url: string, filename: string, sessionNo: number) => {
    const isGoogleDrive = url.includes('drive.google.com')
    if (!isGoogleDrive) {
      // Cloudinary with fl_attachment — server sends Content-Disposition: attachment, just open
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    // Google Drive: fetch blob to bypass virus-scan warning page
    try {
      setDownloadingSession(sessionNo)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      // Fallback: open in new tab if fetch fails (e.g. CORS)
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingSession(null)
    }
  }, [])

  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchSubject = useCallback(() => {
    if (!id) return
    setLoading(true)
    setLoadError(null)
    subjectsApi.getSubject(id)
      .then((res: any) => {
        const found = res?.data || res
        if (found) {
          setSubject(found)
        } else {
          setSubject({
            id: id,
            code: id.toUpperCase(),
            name: 'Course Subject',
            description: ''
          })
        }
      })
      .catch((err: any) => {
        setLoadError(err?.message || 'Failed to load subject details. Please try again.')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchSubject()
  }, [fetchSubject])

  const hasSyllabusData = useMemo(() => {
    if (subject?.syllabusData) {
      try {
        const parsed = typeof subject.syllabusData === 'string' ? JSON.parse(subject.syllabusData) : subject.syllabusData
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0 && (parsed.clos?.length > 0 || parsed.sessions?.length > 0 || parsed.description)) return true
      } catch (e) {
        // ignore
      }
    }
    return false
  }, [subject])

  const rawSyllabus = useMemo(() => {
    if (subject?.syllabusData) {
      try {
        const parsed = typeof subject.syllabusData === 'string' ? JSON.parse(subject.syllabusData) : subject.syllabusData
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed
      } catch (e) {
        // ignore
      }
    }
    return null
  }, [subject])

  // Centralized save helper: merges updated fields into rawSyllabus, persists via API, and updates local state
  const saveSyllabusData = useCallback(async (updatedFields: Record<string, any>) => {
    if (!subject || !rawSyllabus) return
    setIsSaving(true)
    try {
      const updatedSyllabus = { ...rawSyllabus, ...updatedFields }
      const syllabusJson = JSON.stringify(updatedSyllabus)
      await subjectsApi.updateSubject(subject.id, {
        code: subject.code,
        name: subject.name,
        description: updatedSyllabus.description ?? subject.description,
        syllabusData: syllabusJson,
      })
      setSubject((prev: SubjectRow | null) => prev ? {
        ...prev,
        syllabusData: syllabusJson,
        description: updatedSyllabus.description ?? prev.description,
      } : prev)
      setEditingCard(null)
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      setIsSaving(false)
    }
  }, [subject, rawSyllabus])

  const syllabus = useMemo(() => {
    if (!rawSyllabus) return null
    const s = rawSyllabus as any
    const credits = s.credits ?? s.noCredit ?? 3
    const degreeLevel = s.degreeLevel || 'Bachelor'
    const timeAllocation = s.timeAllocation || 'Study hour (150h) = 45h contact hours + 1h final exam + 104h self-study'
    const prerequisites = s.prerequisites || s.preRequisite || 'None'
    const description = s.description || subject?.description || ''

    const studentTasksList: string[] = Array.isArray(s.studentTasks)
      ? s.studentTasks
      : s.studentTasks ? [s.studentTasks] : [
          'Students must attend at least 80% of contact sessions in order to be accepted to the final examination.',
          'Student is responsible to do all assigned exercises given by instructor in class or at home and submit on time.',
          'Use laptop in class only for learning purpose.',
          'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
        ]

    const tools: string[] = s.tools || ['Internet', 'C language utility (ex.DevC++ 6.3)']

    const defaultLearningOutcomes = [
      {
        category: '1. Knowledge',
        code: '(ABET e)',
        items: [
          'Explain the way to solve a real problem using computer.',
          'Understand the basic concepts computer system, and software development.',
          'Understand the basic concepts of programming, focus on procedure programming, testing and debugging, unit testing.'
        ]
      },
      {
        category: '2. Skills in programming',
        code: '(ABET k)',
        items: [
          'Read and understand the simple C programs;',
          'Solve real problems using C.'
        ]
      },
      {
        category: '3. Apply learning methods effectively',
        code: '(ABET i)',
        items: [
          'Academic reading.',
          'Individual and team work behaviors.'
        ]
      }
    ]

    const learningOutcomes = s.learningOutcomes || defaultLearningOutcomes

    const clos = (s.clos || []).map((c: any) => ({
      code: c.code || c.cloName || 'CLO',
      details: c.details || c.cloDetails || '',
      loDetails: c.loDetails || ''
    }))

    const abetBreakdown = learningOutcomes.map((item: any) => ({
      domain: `${item.category} ${item.code || ''}`.trim(),
      clos: item.items || []
    }))

    const assessments = (s.assessments || s.assessmentScheme || []).map((a: any) => ({
      category: a.category || a.name || 'Assessment',
      weightPercent: (a.weightPercent ?? parseFloat(String(a.weight || '0').replace('%', ''))) || 0
    }))

    const sessions = (s.sessions || []).map((ses: any, index: number) => ({
      sessionNo: ses.sessionNo ?? ses.session ?? (index + 1),
      topic: ses.topic || '',
      type: ses.type || 'Offline',
      clo: ses.clo || 'CLO1',
      itu: ses.itu || 'I',
      studentTasks: Array.isArray(ses.studentTasks) ? ses.studentTasks.join(', ') : (ses.studentTasks || ''),
      materialsDownloadUrl: ses.materialsDownloadUrl || ses.cloudinaryUrl || (ses.sDownload ? '#' : undefined),
      sDownload: ses.sDownload || 'Slide PDF'
    }))

    const totalAssessmentWeight = assessments.reduce((acc: number, item: any) => acc + (item.weightPercent || 0), 0)

    return {
      code: s.code || subject?.code || 'PRF192',
      name: s.name || subject?.name || 'Programming Fundamentals',
      description,
      credits,
      degreeLevel,
      timeAllocation,
      prerequisites,
      studentTasksList,
      tools,
      learningOutcomes,
      clos,
      abetBreakdown,
      assessments,
      totalAssessmentWeight,
      sessions
    }
  }, [rawSyllabus, subject])

  // Sync header edit states whenever syllabus loads/changes — must be AFTER syllabus useMemo
  useEffect(() => {
    if (!syllabus) return
    setEditHeaderName(syllabus.name)
    setEditHeaderCode(syllabus.code)
    setEditHeaderDegree(syllabus.degreeLevel)
    setEditHeaderCredits(syllabus.credits)
    setEditHeaderTimeAlloc(syllabus.timeAllocation)
    setEditHeaderPrereqs(syllabus.prerequisites)
  }, [syllabus?.code, syllabus?.name]) // only re-sync when course changes, not on every keystroke

  // Computed live total of editAssessments
  const editAssessmentTotal = useMemo(() => {
    return editAssessments.reduce((acc, a) => acc + (Number(a.weightPercent) || 0), 0)
  }, [editAssessments])

  const isAssessmentTotalValid = useMemo(() => {
    return Math.abs(editAssessmentTotal - 100) < 0.01
  }, [editAssessmentTotal])

  // Handle single assessment weight change with automatic adjustment of the last item
  const handleAssessmentWeightChange = useCallback((index: number, newWeight: number) => {
    setEditAssessments(prev => {
      if (prev.length === 0) return prev
      const updated = prev.map((item, i) => i === index ? { ...item, weightPercent: newWeight } : { ...item })
      const lastIdx = updated.length - 1
      // If changing any item except the last one, auto-balance the last item so the sum equals 100%
      if (index !== lastIdx && lastIdx > 0) {
        const otherSum = updated
          .slice(0, lastIdx)
          .reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0)
        const remainder = Math.max(0, Math.round((100 - otherSum) * 10) / 10)
        updated[lastIdx].weightPercent = remainder
      }
      return updated
    })
  }, [])

  // Auto balance all assessment weights so the total equals 100%
  const handleAutoBalanceAssessments = useCallback(() => {
    setEditAssessments(prev => {
      if (prev.length === 0) return prev
      const lastIdx = prev.length - 1
      const updated = prev.map(item => ({ ...item }))
      const otherSum = updated.slice(0, lastIdx).reduce((sum, item) => sum + (Number(item.weightPercent) || 0), 0)
      updated[lastIdx].weightPercent = Math.max(0, Math.round((100 - otherSum) * 10) / 10)
      return updated
    })
  }, [])

  const filteredSessions = useMemo(() => {
    if (!syllabus || !sessionSearch.trim()) return syllabus?.sessions || []
    const q = sessionSearch.toLowerCase()
    return syllabus.sessions.filter(
      (s: any) => s.topic.toLowerCase().includes(q) ||
           s.studentTasks.toLowerCase().includes(q) ||
           String(s.sessionNo).includes(q)
    )
  }, [syllabus, sessionSearch])

  if (loading) {
    return (
      <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel="Quản trị viên" requiredRole="admin">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
          <p className="text-sm text-slate-500 font-medium">Loading course syllabus details...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (loadError && !subject) {
    return (
      <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel="Quản trị viên" requiredRole="admin">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-800">
            <AlertCircle size={28} />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Không thể tải thông tin môn học</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{loadError}</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => router.push('/admin/subjects')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Quay lại
            </button>
            <button
              onClick={fetchSubject}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs"
            >
              Thử lại
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Handle courses without syllabus data yet (Not provided yet)
  if (!hasSyllabusData || !syllabus) {
    return (
      <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel="Quản trị viên" requiredRole="admin">
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/subjects')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Subjects
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/admin" className="hover:underline">Admin</Link>
            <ChevronRight size={12} />
            <Link href="/admin/subjects" className="hover:underline">Subjects</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 dark:text-slate-200 font-bold">{subject?.code || id}</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-[#121629] text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Subject Code: {subject?.code || id}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-slate-200 border border-white/15">
                Degree Level: Bachelor
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Semester: {subject?.semester ? `Semester ${subject.semester}` : 'Semester 1'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {subject?.name || 'Course Subject'}
            </h1>
          </div>
        </div>

        {/* Empty State Card in English */}
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Syllabus Not Provided Yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Detailed syllabus content for <strong className="text-slate-700 dark:text-slate-200 font-semibold">{subject?.code || id} - {subject?.name}</strong> has not been provided yet.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push('/admin/subjects')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <ArrowLeft size={14} /> Back to Subjects Directory
            </button>
          </div>
        </div>
      </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV} title="AITA Admin" roleLabel="Quản trị viên" requiredRole="admin">
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/subjects')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Subjects
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/admin" className="hover:underline">Admin</Link>
          <ChevronRight size={12} />
          <Link href="/admin/subjects" className="hover:underline">Subjects</Link>
          <ChevronRight size={12} />
          <span className="text-slate-700 dark:text-slate-200 font-bold">{syllabus.code}</span>
        </div>
      </div>

      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 p-6 sm:p-8 border border-brand-100 dark:border-slate-700/60 shadow-sm">
        <div className="relative z-10 space-y-4">

          {/* Badges row + edit/save button */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap items-center gap-2">
              {editingCard === 'header' ? (
                <>
                  <input
                    value={editHeaderCode}
                    onChange={e => setEditHeaderCode(e.target.value)}
                    className="px-3 py-1 rounded-md text-xs font-bold bg-white dark:bg-slate-700 border border-brand-200 dark:border-slate-600 text-brand-700 dark:text-brand-300 w-28 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                    placeholder="Code"
                  />
                  <input
                    value={editHeaderDegree}
                    onChange={e => setEditHeaderDegree(e.target.value)}
                    className="px-3 py-1 rounded-md text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 w-28 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                    placeholder="Degree Level"
                  />
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-emerald-200 dark:border-slate-600">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Sem</span>
                    <input
                      type="number"
                      value={editHeaderSemester}
                      onChange={e => setEditHeaderSemester(Number(e.target.value) || 1)}
                      className="text-xs font-bold bg-transparent text-emerald-700 dark:text-emerald-300 w-8 focus:outline-none text-center"
                      min={1} max={10}
                    />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-amber-200 dark:border-slate-600">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Credits</span>
                    <input
                      type="number"
                      value={editHeaderCredits}
                      onChange={e => setEditHeaderCredits(Number(e.target.value) || 3)}
                      className="text-xs font-bold bg-transparent text-amber-700 dark:text-amber-300 w-8 focus:outline-none text-center"
                      min={1} max={10}
                    />
                  </div>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                    {syllabus.code}
                  </span>
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-200/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                    {syllabus.degreeLevel}
                  </span>
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Semester {subject?.semester || 1}
                  </span>
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {syllabus.credits} Credits
                  </span>
                </>
              )}
            </div>

            {/* Pencil → Save/Cancel khi edit */}
            {editingCard === 'header' ? (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={isSaving}
                  onClick={() => setEditingCard(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-all"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
                <button
                  disabled={isSaving}
                  onClick={async () => {
                    await saveSyllabusData({
                      code: editHeaderCode,
                      name: editHeaderName,
                      degreeLevel: editHeaderDegree,
                      credits: editHeaderCredits,
                      timeAllocation: editHeaderTimeAlloc,
                      prerequisites: editHeaderPrereqs,
                    })
                    if (subject) {
                      setSubject((prev: SubjectRow | null) => prev ? {
                        ...prev,
                        code: editHeaderCode,
                        name: editHeaderName,
                        semester: editHeaderSemester,
                      } : prev)
                    }
                  }}
                  className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-50"
                  title="Save"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditHeaderName(syllabus.name)
                  setEditHeaderCode(syllabus.code)
                  setEditHeaderDegree(syllabus.degreeLevel)
                  setEditHeaderSemester(subject?.semester ? Number(subject.semester) : 1)
                  setEditHeaderCredits(syllabus.credits)
                  setEditHeaderTimeAlloc(syllabus.timeAllocation)
                  setEditHeaderPrereqs(syllabus.prerequisites)
                  setEditingCard('header')
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-all"
                title="Edit"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* Subject name */}
          {editingCard === 'header' ? (
            <input
              value={editHeaderName}
              onChange={e => setEditHeaderName(e.target.value)}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 focus:border-brand-400 dark:focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 transition-all"
              placeholder="Subject Name"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {syllabus.name}
            </h1>
          )}

          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-2xl">
            Detailed course syllabus, Learning Outcomes (CLO/ABET), session schedule, and assessment scheme.
          </p>

          {/* Time & Prerequisites */}
          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 border-t border-brand-100 dark:border-slate-700/60">
            {editingCard === 'header' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold shrink-0">Time:</span>
                  <input
                    value={editHeaderTimeAlloc}
                    onChange={e => setEditHeaderTimeAlloc(e.target.value)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-xs w-72 focus:outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="font-semibold shrink-0">Prerequisites:</span>
                  <input
                    value={editHeaderPrereqs}
                    onChange={e => setEditHeaderPrereqs(e.target.value)}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-0.5 text-xs w-full max-w-xs focus:outline-none focus:border-brand-500 text-slate-700 dark:text-slate-200 transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                <span>Time: <strong className="text-slate-700 dark:text-slate-200">{syllabus.timeAllocation}</strong></span>
                <span>Prerequisites: <strong className="text-slate-700 dark:text-slate-200">{syllabus.prerequisites}</strong></span>
              </>
            )}
            <span className="text-slate-400 dark:text-slate-500">
              Sessions: <strong className="text-slate-600 dark:text-slate-300">{syllabus.sessions.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/50 w-fit">
        {[
          { key: 'syllabus' as TabType, label: 'Syllabus Overview' },
          { key: 'clos' as TabType, label: `CLO List (${syllabus.clos.length})` },
          { key: 'sessions' as TabType, label: `Sessions (${syllabus.sessions.length})` },
          { key: 'assessment' as TabType, label: `Assessment (${syllabus.assessments.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'syllabus' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Course Description</h3>
                {editingCard === 'description' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isSaving}
                      onClick={() => { setEditingCard(null) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={async () => {
                        await saveSyllabusData({ description: editDescription })
                      }}
                      className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-50"
                      title="Save"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditDescription(syllabus.description); setEditingCard('description') }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all"
                    title="Edit content"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              {editingCard === 'description' ? (
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full min-h-[180px] p-3 rounded-xl text-sm leading-relaxed font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all resize-y"
                />
              ) : (
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                  {syllabus.description}
                </p>
              )}
            </div>

            {/* ABET Course Learning Outcomes Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Course Learning Outcomes (ABET)</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Upon completing the course</span>
                  {editingCard === 'learningOutcomes' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={isSaving}
                        onClick={() => { setEditingCard(null) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                      <button
                        disabled={isSaving}
                        onClick={async () => {
                          await saveSyllabusData({ learningOutcomes: editLearningOutcomes })
                        }}
                        className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-50"
                        title="Save"
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditLearningOutcomes(JSON.parse(JSON.stringify(syllabus.learningOutcomes))); setEditingCard('learningOutcomes') }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all"
                      title="Edit content"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
              </div>

              {editingCard === 'learningOutcomes' ? (
                <div className="space-y-6">
                  {editLearningOutcomes.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {section.category}
                        </h4>
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold rounded">
                          {section.code}
                        </span>
                      </div>
                      <div className="space-y-2 pl-1">
                        {section.items.map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-3" />
                            <input
                              type="text"
                              value={item}
                              onChange={e => {
                                const newOutcomes = [...editLearningOutcomes]
                                newOutcomes[idx] = { ...newOutcomes[idx], items: [...newOutcomes[idx].items] }
                                newOutcomes[idx].items[i] = e.target.value
                                setEditLearningOutcomes(newOutcomes)
                              }}
                              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-500 transition-all"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {syllabus.learningOutcomes.map((section: any, idx: number) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {section.category}
                        </h4>
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold rounded">
                          {section.code}
                        </span>
                      </div>

                      <ul className="space-y-2 pl-1">
                        {section.items.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Student Tasks Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Student Tasks</h3>
                {editingCard === 'studentTasks' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isSaving}
                      onClick={() => { setEditingCard(null) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={async () => {
                        await saveSyllabusData({ studentTasks: editStudentTasks })
                      }}
                      className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-50"
                      title="Save"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditStudentTasks([...syllabus.studentTasksList]); setEditingCard('studentTasks') }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all"
                    title="Edit content"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              {editingCard === 'studentTasks' ? (
                <div className="space-y-3">
                  {editStudentTasks.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs font-mono font-bold text-slate-400 shrink-0 mt-2">{idx + 1}.</span>
                      <textarea
                        value={task}
                        onChange={e => {
                          const newTasks = [...editStudentTasks]
                          newTasks[idx] = e.target.value
                          setEditStudentTasks(newTasks)
                        }}
                        className="flex-1 min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-brand-500 transition-all resize-y leading-relaxed font-medium"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {syllabus.studentTasksList.map((task, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/50">
                      <span className="text-xs font-mono font-bold text-slate-400 shrink-0 mt-0.5">{idx + 1}.</span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {task}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1/3 width) */}
          <div className="space-y-6">
            {/* Tools Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Tools & Software</h3>
                {editingCard === 'tools' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isSaving}
                      onClick={() => { setEditingCard(null) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={async () => {
                        await saveSyllabusData({ tools: editTools })
                      }}
                      className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-50"
                      title="Save"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditTools([...syllabus.tools]); setEditingCard('tools') }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all"
                    title="Edit content"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              {editingCard === 'tools' ? (
                <div className="flex flex-col gap-2">
                  {editTools.map((t: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50">
                      <span className="text-xs font-mono text-slate-400 shrink-0">{i + 1}.</span>
                      <input
                        type="text"
                        value={t}
                        onChange={e => {
                          const newTools = [...editTools]
                          newTools[i] = e.target.value
                          setEditTools(newTools)
                        }}
                        className="flex-1 bg-transparent text-slate-700 dark:text-slate-300 text-xs font-medium focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {syllabus.tools.map((t: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700/50">
                      <span className="text-xs font-mono text-slate-400 shrink-0">•</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assessment Summary Box */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Assessment Weight</h3>
                <div className="flex items-center gap-2">
                  {editingCard === 'assessments' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={isSaving}
                        onClick={() => { setEditingCard(null) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                      <button
                        disabled={isSaving || !isAssessmentTotalValid}
                        onClick={async () => {
                          await saveSyllabusData({ assessments: editAssessments })
                        }}
                        className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!isAssessmentTotalValid ? 'Total weight must be exactly 100%' : 'Save'}
                      >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setActiveTab('assessment')} className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
                        View Details
                      </button>
                      <button
                        onClick={() => { setEditAssessments(JSON.parse(JSON.stringify(syllabus.assessments))); setEditingCard('assessments') }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all"
                        title="Edit content"
                      >
                        <Pencil size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editingCard === 'assessments' ? (
                <div className="space-y-3">
                  {/* Alert banner for non-100% total */}
                  {!isAssessmentTotalValid ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={15} className="shrink-0 text-amber-500" />
                        <span>
                          {editAssessmentTotal > 100
                            ? `Current total is ${editAssessmentTotal.toFixed(1)}% (exceeds 100%)`
                            : `Current total is ${editAssessmentTotal.toFixed(1)}% (under 100%)`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoBalanceAssessments}
                        className="px-2 py-0.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 text-[11px] font-bold transition-all shrink-0 shadow-xs"
                      >
                        Balance 100%
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                      <Check size={14} className="shrink-0 text-emerald-500" strokeWidth={3} />
                      <span>Total weight perfectly matches 100%</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {editAssessments.map((a: any, idx: number) => {
                      const isLast = idx === editAssessments.length - 1
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                          <input
                            type="text"
                            value={a.category}
                            onChange={e => {
                              const newAssessments = [...editAssessments]
                              newAssessments[idx] = { ...newAssessments[idx], category: e.target.value }
                              setEditAssessments(newAssessments)
                            }}
                            className="flex-1 font-semibold text-slate-700 dark:text-slate-300 bg-transparent focus:outline-none border-b border-transparent focus:border-brand-500 transition-all"
                            placeholder="Assessment component name"
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={a.weightPercent}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0
                                handleAssessmentWeightChange(idx, val)
                              }}
                              className="w-14 text-right font-bold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand-500"
                            />
                            <span className="font-bold text-brand-600 dark:text-brand-400">%</span>
                            {isLast && (
                              <span className="text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-950 px-1 py-0.5 rounded" title="Auto-balance remaining">
                                Auto
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {syllabus.assessments.map((a: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{a.category}</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-lg">
                        {a.weightPercent}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLOS */}
      {activeTab === 'clos' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                CLO List
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950 px-3 py-1 rounded-full">
                  Total: {syllabus.clos.length} CLOs
                </span>
                {editingCard === 'clos' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isSaving}
                      onClick={() => setEditingCard(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={async () => {
                        await saveSyllabusData({ clos: editClos })
                      }}
                      className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-50"
                      title="Save"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditClos(JSON.parse(JSON.stringify(syllabus.clos)))
                      setEditingCard('clos')
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all"
                    title="Edit CLO List"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            </div>

            {editingCard === 'clos' ? (
              <div className="space-y-3">
                {editClos.map((clo: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <input
                      type="text"
                      value={clo.code}
                      onChange={e => {
                        const updated = [...editClos]
                        updated[idx] = { ...updated[idx], code: e.target.value }
                        setEditClos(updated)
                      }}
                      className="w-full sm:w-28 font-bold px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-brand-600 focus:outline-none focus:border-brand-500"
                      placeholder="CLO Code"
                    />
                    <input
                      type="text"
                      value={clo.loDetails}
                      onChange={e => {
                        const updated = [...editClos]
                        updated[idx] = { ...updated[idx], loDetails: e.target.value }
                        setEditClos(updated)
                      }}
                      className="w-full sm:w-32 font-medium px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-600 focus:outline-none focus:border-brand-500"
                      placeholder="LO Mapping"
                    />
                    <input
                      type="text"
                      value={clo.details}
                      onChange={e => {
                        const updated = [...editClos]
                        updated[idx] = { ...updated[idx], details: e.target.value }
                        setEditClos(updated)
                      }}
                      className="flex-1 font-medium px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
                      placeholder="CLO Description"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                    <tr>
                      <th className="p-3 w-24 text-center font-semibold">Code</th>
                      <th className="p-3 w-28 font-semibold">LO Mapping</th>
                      <th className="p-3 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-600 dark:text-slate-300">
                    {syllabus.clos.map((clo: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-center font-semibold text-brand-600 dark:text-brand-400 font-mono text-xs">
                          {clo.code}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">
                          {clo.loDetails || clo.code.replace('CLO', 'LO')}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-200 leading-relaxed">
                          {clo.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: 60 SESSIONS SCHEDULE */}
      {activeTab === 'sessions' && (
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/50">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Session Schedule
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lecture topics, delivery types, and student tasks.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search session, topic..."
                  value={sessionSearch}
                  onChange={e => setSessionSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
              {editingCard === 'sessions' ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    disabled={isSaving}
                    onClick={() => setEditingCard(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={async () => {
                      await saveSyllabusData({ sessions: editSessions })
                    }}
                    className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-50"
                    title="Save"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditSessions(JSON.parse(JSON.stringify(syllabus.sessions)))
                    setEditingCard('sessions')
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all shrink-0"
                  title="Edit Schedule"
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="p-3 w-16 text-center font-semibold">No.</th>
                  <th className="p-3 font-semibold">Topic</th>
                  <th className="p-3 w-20 text-center font-semibold">Type</th>
                  <th className="p-3 w-20 text-center font-semibold">CLO</th>
                  <th className="p-3 w-14 text-center font-semibold">ITU</th>
                  <th className="p-3 font-semibold">Student Tasks</th>
                  <th className="p-3 w-32 text-center font-semibold">Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-600 dark:text-slate-300">
                {editingCard === 'sessions' ? (
                  editSessions.map((session: any, idx: number) => (
                    <tr key={`edit-session-${idx}`} className="bg-white dark:bg-slate-900/60">
                      <td className="p-2 text-center font-bold text-brand-600">
                        {idx + 1}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={session.topic}
                          onChange={e => {
                            const updated = [...editSessions]
                            updated[idx] = { ...updated[idx], topic: e.target.value }
                            setEditSessions(updated)
                          }}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:border-brand-500 font-medium"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <select
                          value={session.type}
                          onChange={e => {
                            const updated = [...editSessions]
                            updated[idx] = { ...updated[idx], type: e.target.value }
                            setEditSessions(updated)
                          }}
                          className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:border-brand-500 font-bold"
                        >
                          <option value="Offline">Offline</option>
                          <option value="Online">Online</option>
                          <option value="Exam">Exam</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={session.clo}
                          onChange={e => {
                            const updated = [...editSessions]
                            updated[idx] = { ...updated[idx], clo: e.target.value }
                            setEditSessions(updated)
                          }}
                          className="w-16 text-center px-1.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="text"
                          value={session.itu}
                          onChange={e => {
                            const updated = [...editSessions]
                            updated[idx] = { ...updated[idx], itu: e.target.value }
                            setEditSessions(updated)
                          }}
                          className="w-14 text-center px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent font-bold text-indigo-600"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={session.studentTasks}
                          onChange={e => {
                            const updated = [...editSessions]
                            updated[idx] = { ...updated[idx], studentTasks: e.target.value }
                            setEditSessions(updated)
                          }}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:border-brand-500"
                        />
                      </td>
                      <td className="p-2 text-center text-[11px] text-slate-400 font-medium">
                        Auto
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredSessions.map((session: any, idx: number) => (
                    <tr key={`session-${session.sessionNo}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 text-center font-extrabold text-brand-600 dark:text-brand-400 bg-slate-50/50 dark:bg-slate-900/20">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {session.topic}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          session.type === 'Online' 
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : session.type === 'Offline'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {session.type}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                          {session.clo}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {session.itu}
                      </td>
                      <td className="p-3 leading-relaxed">
                        {session.studentTasks || 'N/A'}
                      </td>
                      <td className="p-3 text-center">
                        {session.materialsDownloadUrl ? (
                          <button
                            onClick={() => handleDownload(
                              session.materialsDownloadUrl!,
                              session.sDownload || 'download',
                              session.sessionNo
                            )}
                            disabled={downloadingSession === session.sessionNo}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 hover:bg-brand-100 font-bold transition-all text-xs disabled:opacity-60 disabled:cursor-wait"
                          >
                            {downloadingSession === session.sessionNo
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Download size={14} />
                            }
                            {session.sDownload || 'Slide PDF'}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Textbook</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ASSESSMENT SCHEME */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Assessment Scheme & Weight Distribution
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  editingCard === 'assessments'
                    ? (isAssessmentTotalValid ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' : 'text-amber-600 bg-amber-50 dark:bg-amber-950')
                    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950'
                }`}>
                  Total: {(editingCard === 'assessments' ? editAssessmentTotal : syllabus.totalAssessmentWeight).toFixed(1)}%
                </span>
                {editingCard === 'assessments' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isSaving}
                      onClick={() => setEditingCard(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                    <button
                      disabled={isSaving || !isAssessmentTotalValid}
                      onClick={async () => {
                        await saveSyllabusData({ assessments: editAssessments })
                      }}
                      className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title={!isAssessmentTotalValid ? 'Total weight must be exactly 100%' : 'Save'}
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditAssessments(JSON.parse(JSON.stringify(syllabus.assessments)))
                      setEditingCard('assessments')
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-all"
                    title="Edit weights"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Alert banner when editing */}
            {editingCard === 'assessments' && (
              !isAssessmentTotalValid ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-amber-500" />
                    <span>
                      {editAssessmentTotal > 100
                        ? `Current total weight is ${editAssessmentTotal.toFixed(1)}% (exceeds 100%). Please rebalance!`
                        : `Current total weight is ${editAssessmentTotal.toFixed(1)}% (under 100%). Please rebalance!`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoBalanceAssessments}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold transition-all shrink-0 shadow-xs"
                  >
                    Auto-balance 100%
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <Check size={16} className="shrink-0 text-emerald-500" strokeWidth={3} />
                  <span>Total weight perfectly matches the 100% curriculum framework standard.</span>
                </div>
              )
            )}

            {/* Individual Progress Bars */}
            <div className="space-y-5">
              {(editingCard === 'assessments' ? editAssessments : syllabus.assessments).map((a: any, idx: number) => {
                const colors = [
                  { bg: 'bg-brand-500', text: 'text-brand-600 dark:text-brand-400' },
                  { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                  { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
                  { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
                  { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
                ]
                const color = colors[idx % colors.length]
                const isLast = idx === (editingCard === 'assessments' ? editAssessments : syllabus.assessments).length - 1

                return (
                  <div key={idx} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-sm gap-4">
                      {editingCard === 'assessments' ? (
                        <input
                          type="text"
                          value={a.category}
                          onChange={e => {
                            const newAssessments = [...editAssessments]
                            newAssessments[idx] = { ...newAssessments[idx], category: e.target.value }
                            setEditAssessments(newAssessments)
                          }}
                          className="font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent focus:border-brand-500 focus:outline-none transition-all flex-1"
                        />
                      ) : (
                        <span className="font-bold text-slate-800 dark:text-slate-200">{a.category}</span>
                      )}

                      {editingCard === 'assessments' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={a.weightPercent}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0
                              handleAssessmentWeightChange(idx, val)
                            }}
                            className="w-16 text-right font-extrabold text-sm text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand-500"
                          />
                          <span className={`font-extrabold text-sm ${color.text}`}>%</span>
                          {isLast && (
                            <span className="text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-950 px-1.5 py-0.5 rounded" title="Auto-calculate remaining">
                              Auto
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className={`font-extrabold text-sm ${color.text}`}>{a.weightPercent}%</span>
                      )}
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color.bg} transition-all duration-300 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, a.weightPercent))}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dynamic Cumulative Total Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-800 dark:text-slate-100">
                <span>Total Assessment Weight</span>
                <span className={`${
                  editingCard === 'assessments' && !isAssessmentTotalValid
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                } text-base`}>
                  {(editingCard === 'assessments' ? editAssessmentTotal : syllabus.totalAssessmentWeight).toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                {(editingCard === 'assessments' ? editAssessments : syllabus.assessments).map((a: any, idx: number) => {
                  const colors = ['bg-brand-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500']
                  return (
                    <div
                      key={idx}
                      className={`h-full ${colors[idx % colors.length]}`}
                      style={{ width: `${Math.min(100, Math.max(0, a.weightPercent))}%` }}
                      title={`${a.category}: ${a.weightPercent}%`}
                    />
                  )
                })}
              </div>

              {(editingCard === 'assessments' ? isAssessmentTotalValid : true) ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                  <Check size={14} strokeWidth={3} /> Achieved {(editingCard === 'assessments' ? editAssessmentTotal : syllabus.totalAssessmentWeight).toFixed(1)}% total assessment weight according to curriculum standard.
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5 pt-1">
                  <AlertCircle size={14} /> Total assessment weight is {(editingCard === 'assessments' ? editAssessmentTotal : syllabus.totalAssessmentWeight).toFixed(1)}% (must equal 100%).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  )
}

export default AdminSubjectDetailPage
