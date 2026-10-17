'use client'

import { useEffect, useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ErrorNotice } from '@/components/ui/feedback'
import { promptsApi, type PromptTemplate } from '@/lib/api/modules/prompts'
import { classesApi } from '@/lib/api/modules/classes'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { aiApi } from '@/lib/api/modules/ai'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import {
  Bot,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Edit3,
  Sparkles,
  BookOpen,
  Code2,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Zap,
  Info,
} from 'lucide-react'

interface SubjectOption {
  id: string
  code: string
  name: string
}

const blank = { name: '', category: '', templateContent: '' }

// Standard FPT suggested templates by subject code
const SAMPLE_PROMPT_PRESETS: Record<string, { name: string; category: string; content: string }> = {
  PRJ301: {
    name: 'Chỉ dẫn Chấm bài Java Web MVC & JDBC',
    category: 'Chấm điểm Rubric',
    content: `Bạn là Trợ giảng AI phụ trách môn PRJ301 (Java Web Application Development) tại Đại học FPT.
Nhiệm vụ của bạn là phân tích mã nguồn bài làm của sinh viên và đánh giá chi tiết theo Rubric:
1. Kiểm tra cấu trúc phân tầng MVC: Controller (Servlet/Filter), View (JSP/JSTL), Model (DAO, DTO/Entity).
2. Kiểm tra thao tác CSDL: Kết nối JDBC an toàn, sử dụng PreparedStatement phòng chống SQL Injection, giải phóng Connection.
3. Kiểm tra quản lý trạng thái: Sử dụng Session, Cookie và Filter xác thực phân quyền.
4. Nhận xét chi tiết từng lỗi, chỉ ra file và dòng code có vấn đề, đưa ra lời khuyên mang tính gợi mở sư phạm (không giải hộ toàn bộ bài tập).`,
  },
  PRN212: {
    name: 'Chỉ dẫn Chấm bài C# .NET Web API & EF Core',
    category: 'Chấm điểm Rubric',
    content: `Bạn là Trợ giảng AI phụ trách môn PRN212 (C# & .NET Application Development) tại Đại học FPT.
Nhiệm vụ của bạn là phân tích mã nguồn bài làm của sinh viên:
1. Đánh giá thiết kế Entity Framework Core, quan hệ giữa các Entity và tính đúng đắn của DbContext.
2. Kiểm tra các RESTful API endpoints CRUD, tính chuẩn mực của HTTP Status Codes và DTO mapping.
3. Kiểm tra cơ chế xác thực JWT Bearer và phân quyền Role.
4. Đánh giá chất lượng mã nguồn: Áp dụng Clean Architecture, Dependency Injection và xử lý ngoại lệ toàn cục.`,
  },
  CSD201: {
    name: 'Chỉ dẫn Đánh giá Cấu trúc dữ liệu & Thuật toán',
    category: 'Chấm điểm thuật toán',
    content: `Bạn là Trợ giảng AI phụ trách môn CSD201 (Data Structures and Algorithms) tại Đại học FPT.
Nhiệm vụ của bạn là phân tích mã nguồn giải thuật của sinh viên:
1. Đánh giá tính đúng đắn của các thao tác trên cấu trúc dữ liệu (Node, Tree, Graph, Heap).
2. Phân tích độ phức tạp thời gian O(n) và độ phức tạp không gian của thuật toán.
3. Kiểm tra các trường hợp biên (edge cases): cây rỗng, danh sách 1 phần tử, giá trị trùng lặp.
4. Đưa ra phản hồi rõ ràng, phân tích lý do nếu test case bị fail.`,
  },
  PRM392: {
    name: 'Chỉ dẫn Đánh giá Ứng dụng Android Native',
    category: 'Chấm điểm Rubric',
    content: `Bạn là Trợ giảng AI phụ trách môn PRM392 (Android Mobile Application Development) tại Đại học FPT.
Nhiệm vụ của bạn là phân tích dự án Android của sinh viên:
1. Kiểm tra kiến trúc MVVM, Activity/Fragment lifecycle và Navigation component.
2. Đánh giá lưu trữ cục bộ Room Database / SQLite và kết nối REST API Retrofit.
3. Kiểm tra xử lý bất đồng bộ Coroutines / LiveData, quản lý bộ nhớ và cấp quyền Runtime Permissions.
4. Đánh giá trải nghiệm người dùng theo Material Design guidelines.`,
  },
}

export default function LecturerPromptsPage() {
  const { isAuthenticated, role } = useAuth()
  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Load teaching subjects from classes + fallback to all subjects
  useEffect(() => {
    if (!isAuthenticated || role !== 'lecturer') return
    let active = true
    async function load() {
      try {
        const options = new Map<string, SubjectOption>()
        for (let page = 1; ; page++) {
          const rows = await classesApi.getClasses(page, 50)
          if (!active) return
          rows.forEach(row => {
            if (row.subject && typeof row.subject === 'object') {
              options.set(row.subject.id, row.subject)
            }
          })
          if (rows.length < 50) break
        }

        // Fallback to all subjects if no assigned classes yet
        if (options.size === 0) {
          try {
            const allSubs = await subjectsApi.getSubjects(1, 1000)
            const subList = Array.isArray(allSubs) ? allSubs : ((allSubs as any)?.data || [])
            subList.forEach((s: any) => {
              if (s && s.id) {
                options.set(s.id, {
                  id: s.id,
                  code: s.code || s.SubjectCode || '',
                  name: s.name || s.SubjectName || '',
                })
              }
            })
          } catch {}
        }

        if (active) {
          setSubjects([...options.values()])
          setLoading(false)
        }
      } catch (cause) {
        if (active) {
          setError(errorMessage(cause))
          setLoading(false)
        }
      }
    }
    void load()
    return () => { active = false }
  }, [isAuthenticated, role, revision])

  // Load prompt templates for selected subject
  useEffect(() => {
    if (!subjectId) return
    let active = true
    setLoading(true)
    promptsApi.getPromptTemplates(subjectId)
      .then(rows => {
        if (active) {
          setPrompts(rows || [])
          setError(null)
          setLoading(false)
        }
      })
      .catch(cause => {
        if (active) {
          setError(errorMessage(cause))
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [subjectId, revision])

  const currentSubject = useMemo(() => {
    return subjects.find(s => s.id === subjectId) || null
  }, [subjects, subjectId])

  // Extract unique categories for quick filtering
  const categories = useMemo(() => {
    const set = new Set<string>()
    prompts.forEach(p => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [prompts])

  // Filter prompts by search keyword and category
  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.templateContent.toLowerCase().includes(searchQuery.toLowerCase())

      const matchCat =
        selectedCategory === 'all' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase())

      return matchSearch && matchCat
    })
  }, [prompts, searchQuery, selectedCategory])

  function open(prompt?: PromptTemplate) {
    setEditingId(prompt?.id ?? null)
    setForm(
      prompt
        ? { name: prompt.name, category: prompt.category ?? '', templateContent: prompt.templateContent }
        : blank
    )
    setFormError(null)
    setModal(true)
  }

  function applyPreset(code: string) {
    const preset = SAMPLE_PROMPT_PRESETS[code] || SAMPLE_PROMPT_PRESETS.PRJ301
    setForm({
      name: preset.name,
      category: preset.category,
      templateContent: preset.content,
    })
    setEditingId(null)
    setFormError(null)
    setModal(true)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setFormError(null)
    try {
      const payload = { ...form, subjectId }
      if (editingId) await promptsApi.updatePromptTemplate(editingId, payload)
      else await promptsApi.createPromptTemplate(payload)
      setModal(false)
      setLoading(true)
      setRevision(value => value + 1)
    } catch (cause) {
      setFormError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function remove(prompt: PromptTemplate) {
    if (!window.confirm(`Xóa prompt “${prompt.name}”?`)) return
    setBusy(true)
    try {
      await promptsApi.deletePromptTemplate(prompt.id)
      setLoading(true)
      setRevision(value => value + 1)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function generate(refine: boolean) {
    setBusy(true)
    setFormError(null)
    try {
      const result = refine
        ? await aiApi.refinePrompt({ content: form.templateContent })
        : await aiApi.generatePrompt({
            name: form.name,
            category: form.category,
            subjectCode: currentSubject?.code,
          })
      setForm(previous => ({ ...previous, templateContent: result.prompt }))
    } catch (cause) {
      setFormError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  function handleCopyPrompt(prompt: PromptTemplate) {
    navigator.clipboard.writeText(prompt.templateContent)
    setCopiedId(prompt.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.prompts.title', 'Thư viện prompt')}
      headerSubtitle={t('lecturer.prompts.subtitle', 'Quản lý chỉ dẫn AI theo môn được phân công')}
    >
      <div className="space-y-6 w-full pb-12">
        {/* Hero Header Banner */}
        <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isVi ? 'Cấu hình System Prompt Chấm bài AI' : 'AI Grading System Prompts'}
                </h1>
                <Badge variant="orange" className="text-[10px] font-mono font-bold uppercase">
                  FPT Hybrid Engine
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isVi
                  ? 'Thiết lập các chỉ dẫn hệ thống chuyên sâu theo từng môn học để AI chấm điểm đúng barem Rubric, phân tích mã nguồn và đưa ra phản hồi mang tính sư phạm.'
                  : 'Configure subject-specific system prompts to guide AI grading, rubric alignment, and pedagogical feedback.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <span className="text-[11px] text-slate-400 block font-medium">Môn học phụ trách</span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {subjects.length} môn
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar: Subject Selector, Quick Pills & Create Button */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            {/* Subject Selector (Preserving combobox role for automated tests) */}
            <div className="flex-1 max-w-md">
              <label htmlFor="subject-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('lecturer.prompts.subject_label', 'Môn học')}
              </label>
              <select
                id="subject-select"
                aria-label="Môn học"
                className="w-full h-10 rounded-xl border border-orange-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors cursor-pointer shadow-2xs"
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value)
                  setPrompts([])
                  setError(null)
                  setLoading(!!e.target.value)
                  setSelectedCategory('all')
                }}
              >
                <option value="">{t('lecturer.prompts.select_subject', 'Chọn môn học')}</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} — {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Create Prompt Button (Preserving exact name for automated tests) */}
            <Button
              disabled={!subjectId || busy}
              onClick={() => open()}
              className="h-10 px-4 text-xs font-bold gap-2 shrink-0 cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t('lecturer.prompts.create_btn', 'Tạo prompt')}</span>
            </Button>
          </div>

          {/* Quick Subject Switcher Pills */}
          {subjects.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">
                {isVi ? 'Chuyển nhanh:' : 'Quick Select:'}
              </span>
              {subjects.map(s => {
                const isActive = s.id === subjectId
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSubjectId(s.id)
                      setPrompts([])
                      setError(null)
                      setLoading(true)
                      setSelectedCategory('all')
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s.code}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)} />

        {/* ============================================================ */}
        {/* STATE 1: NO SUBJECT SELECTED YET                             */}
        {/* ============================================================ */}
        {!subjectId && !loading && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-orange-500" />
                    <span>{isVi ? 'Danh sách Môn học được phân công' : 'Your Teaching Subjects'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {subjects.length
                      ? t('lecturer.prompts.select_to_view', 'Chọn môn để xem các prompt đã lưu.')
                      : t('lecturer.prompts.no_subjects_assigned', 'Chưa có môn học được phân công.')}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-bold">
                  {subjects.length} subjects
                </Badge>
              </div>

              {/* Subject Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {subjects.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSubjectId(s.id)
                      setPrompts([])
                      setError(null)
                      setLoading(true)
                    }}
                    className="p-4 rounded-2xl border border-orange-100 dark:border-slate-800 bg-gradient-to-br from-orange-50/30 via-white to-amber-50/20 dark:from-slate-900 dark:to-slate-800 hover:border-orange-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="orange" className="font-mono text-xs font-bold">
                          {s.code}
                        </Badge>
                        <Sparkles className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors line-clamp-2">
                        {s.name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                      <span>{isVi ? 'Cấu hình prompt' : 'Manage Prompts'}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Design Best Practices Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <span>1. Xác định Vai trò & Barem</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Khai báo rõ AI là Trợ giảng môn học tại Đại học FPT, yêu cầu đánh giá nghiêm ngặt theo đúng cấu trúc tiêu chí Rubric.
                </p>
              </Card>

              <Card className="p-4 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                  <Code2 className="w-4 h-4 text-blue-500" />
                  <span>2. Kiểm tra Logic & Clean Code</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Chỉ dẫn AI phát hiện code thừa, lỗi ngoại lệ chưa xử lý, vi phạm mô hình (MVC, Clean Architecture) và kiểm tra anti-cheat.
                </p>
              </Card>

              <Card className="p-4 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>3. Phản hồi Sư phạm</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Nhận xét cụ thể vị trí file/dòng code, giải thích tại sao bị trừ điểm và định hướng cách khắc phục thay vì viết code hộ.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STATE 2: SUBJECT SELECTED (LIST & EDITOR)                    */}
        {/* ============================================================ */}
        {subjectId && (
          <div className="space-y-4">
            {/* Subject Context Header & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2.5">
                <Badge variant="orange" className="font-mono text-xs px-2.5 py-1 font-bold">
                  {currentSubject?.code}
                </Badge>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    {currentSubject?.name}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {prompts.length} {isVi ? 'prompt đã lưu' : 'prompts stored'}
                  </span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={isVi ? 'Tìm kiếm prompt...' : 'Search prompt...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {isVi ? 'Tất cả' : 'All'} ({prompts.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Loading Indicator (Preserving role=status for tests) */}
            {loading && (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <p role="status" className="text-xs font-semibold">
                  {t('lecturer.prompts.loading', 'Đang tải…')}
                </p>
              </div>
            )}

            {/* Empty State (Preserving exact text 'Môn này chưa có prompt.' for tests) */}
            {!loading && !error && prompts.length === 0 && (
              <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-orange-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto border border-orange-200/80">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t('lecturer.prompts.empty', 'Môn này chưa có prompt.')}
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {isVi
                      ? 'Tạo chỉ dẫn chấm bài chuyên biệt cho môn học này hoặc áp dụng mẫu gợi ý có sẵn từ trợ giảng AITA.'
                      : 'Create a specialized grading prompt or apply a pre-set template.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    onClick={() => open()}
                    className="h-8 px-3.5 text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('lecturer.prompts.create_btn', 'Tạo prompt')}</span>
                  </Button>
                  {currentSubject?.code && (
                    <Button
                      variant="outline"
                      onClick={() => applyPreset(currentSubject.code)}
                      className="h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                      <span>{isVi ? `Nạp mẫu gợi ý cho ${currentSubject.code}` : 'Apply Sample'}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Prompts Grid */}
            {!loading && !error && filteredPrompts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrompts.map(prompt => {
                  const isCopied = copiedId === prompt.id

                  return (
                    <article
                      key={prompt.id}
                      className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:border-orange-300 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                              {prompt.name}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {prompt.category ? `${prompt.category} · ` : ''}
                              <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                                {prompt.usageCount || 0}
                              </span>{' '}
                              {t('lecturer.prompts.usage_count', 'lượt sử dụng')}
                            </p>
                          </div>
                          {prompt.category && (
                            <Badge variant="outline" className="text-[10px] font-semibold border-orange-200 shrink-0">
                              {prompt.category}
                            </Badge>
                          )}
                        </div>

                        {/* Content Code Preview */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 line-clamp-5 whitespace-pre-wrap leading-relaxed">
                          {prompt.templateContent}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleCopyPrompt(prompt)}
                          className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-900 gap-1.5"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Sao chép' : 'Copy')}</span>
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => open(prompt)}
                            className="h-7 px-3 text-xs font-bold gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t('ui.edit', 'Chỉnh sửa')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void remove(prompt)}
                            className="h-7 px-2.5 text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t('ui.delete', 'Xóa')}</span>
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for Creating / Editing Prompt */}
      <Modal
        isOpen={modal}
        onClose={() => { if (!busy) setModal(false) }}
        title={editingId ? t('lecturer.prompts.modal_edit', 'Chỉnh sửa prompt') : t('lecturer.prompts.modal_create', 'Tạo prompt')}
        maxWidth="3xl"
      >
        <form onSubmit={save} className="space-y-4">
          <ErrorNotice message={formError} />

          {/* Prompt Name (Preserving exact label for automated tests) */}
          <div className="space-y-1.5">
            <label htmlFor="prompt-name-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('lecturer.prompts.name_label', 'Tên prompt')}
            </label>
            <Input
              id="prompt-name-input"
              aria-label="Tên prompt"
              required
              disabled={busy}
              placeholder={isVi ? 'VD: Chấm bài PRJ301 MVC & JDBC' : 'e.g., Grade PRJ301 MVC'}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="text-xs font-medium"
            />
          </div>

          {/* Category (Preserving exact label for automated tests) */}
          <div className="space-y-1.5">
            <label htmlFor="prompt-category-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('lecturer.prompts.category_label', 'Phân loại')}
            </label>
            <Input
              id="prompt-category-input"
              aria-label="Phân loại"
              disabled={busy}
              placeholder={isVi ? 'VD: Chấm điểm Rubric, Code Review, Vấn đáp...' : 'e.g., Rubric Evaluation, Code Review...'}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="text-xs font-medium"
            />
          </div>

          {/* AI Generation Tools Bar */}
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-orange-50/50 dark:bg-slate-900/80 border border-orange-100/90 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>{isVi ? 'Trợ lý AI:' : 'AI Assistant:'}</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !form.name.trim()}
              onClick={() => void generate(false)}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5"
            >
              <span>{t('lecturer.prompts.ai_generate_btn', 'Tạo nội dung bằng AI')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !form.templateContent.trim()}
              onClick={() => void generate(true)}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5"
            >
              <span>{t('lecturer.prompts.ai_refine_btn', 'Cải thiện nội dung')}</span>
            </Button>
          </div>

          {/* Prompt Content (Preserving exact label for automated tests) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="prompt-content-input" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('lecturer.prompts.content_label', 'Nội dung')}
              </label>
              <span className="text-[10px] text-slate-400">
                {form.templateContent.length} {isVi ? 'ký tự' : 'chars'}
              </span>
            </div>
            <textarea
              id="prompt-content-input"
              aria-label="Nội dung"
              required
              disabled={busy}
              rows={12}
              placeholder={isVi ? 'Nhập nội dung chỉ dẫn System Prompt cho AI...' : 'Enter prompt instructions...'}
              className="w-full rounded-xl border border-orange-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-orange-500 transition-colors"
              value={form.templateContent}
              onChange={e => setForm({ ...form, templateContent: e.target.value })}
            />
          </div>

          {/* Quick Available Variables Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <span className="font-semibold">{isVi ? 'Biến gợi ý:' : 'Variables:'}</span>
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 font-mono">{"{source_code}"}</code>
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 font-mono">{"{rubric}"}</code>
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 font-mono">{"{assignment_title}"}</code>
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-orange-600 font-mono">{"{student_code}"}</code>
          </div>

          {/* Save Button (Preserving exact name for automated tests) */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              isLoading={busy}
              className="h-9 px-5 text-xs font-bold shadow-md shadow-orange-500/20 cursor-pointer"
            >
              {t('lecturer.prompts.save_btn', 'Lưu prompt')}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
