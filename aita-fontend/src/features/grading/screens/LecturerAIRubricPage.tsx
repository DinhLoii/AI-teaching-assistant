'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { useLanguage } from '@/providers/language-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { rubricApi } from '@/lib/api/modules/rubric'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import type { AssignmentRow } from '@/lib/api/contracts'
import {
  Sparkles,
  Save,
  ArrowLeft,
  Loader2,
  FileCheck2,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Layers,
  Scale,
  Wand2,
  BookOpen,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  X,
  Code2,
  Cpu,
} from 'lucide-react'

export interface RubricCriterion {
  name: string
  maxPoints: number
  description?: string
}

// Pre-set FPT University standard rubrics for 1-click loading
const FPT_RUBRIC_TEMPLATES: Record<string, { title: string; subject: string; difficulty: string; criteria: RubricCriterion[] }> = {
  prj301: {
    title: 'Java Web MVC CRUD & JDBC (PRJ301)',
    subject: 'PRJ301',
    difficulty: 'medium',
    criteria: [
      {
        name: '1. Kiến trúc MVC & Điều hướng Servlet/JSP',
        maxPoints: 2.5,
        description: 'Phân tách rõ ràng Controller (Servlet), View (JSP/JSTL) và Model (JavaBeans). Cấu hình mapping servlet và bộ lọc Filter UTF-8 chuẩn.',
      },
      {
        name: '2. Tương tác CSDL & Thao tác CRUD (JDBC)',
        maxPoints: 3.5,
        description: 'Kết nối MS SQL Server an toàn, sử dụng PreparedStatement phòng chống SQL Injection, xử lý Transaction và đóng kết nối giải phóng tài nguyên.',
      },
      {
        name: '3. Quản lý trạng thái & Phân quyền (Session/Cookie)',
        maxPoints: 2.0,
        description: 'Xử lý đăng nhập/đăng xuất, lưu trữ thông tin phiên làm việc trong HttpSession, kiểm soát quyền truy cập trang bằng Authentication Filter.',
      },
      {
        name: '4. Kiểm tra dữ liệu & Xử lý ngoại lệ (Validation)',
        maxPoints: 2.0,
        description: 'Validate dữ liệu đầu vào cả ở Frontend và Backend, hiển thị thông báo lỗi rõ ràng cho người dùng, xử lý ngoại lệ SQLException an toàn.',
      },
    ],
  },
  prn212: {
    title: 'C# .NET Core Web API & Entity Framework (PRN212)',
    subject: 'PRN212',
    difficulty: 'medium',
    criteria: [
      {
        name: '1. Thiết kế Data Models & EF Core Code-First',
        maxPoints: 2.5,
        description: 'Tạo Entity classes với Data Annotations / Fluent API, cấu hình DbContext, tạo và chạy Migrations lên MS SQL Server thành công.',
      },
      {
        name: '2. Hiện thực RESTful API Endpoints CRUD',
        maxPoints: 3.0,
        description: 'Đầy đủ các phương thức GET, POST, PUT, DELETE theo chuẩn REST. Trả về đúng HTTP status code (200, 201, 400, 404, 500) và DTO response.',
      },
      {
        name: '3. Xác thực & Phân quyền JWT Authentication',
        maxPoints: 2.5,
        description: 'Sinh và xác thực Token Bearer JWT, phân quyền theo Role (Admin, Lecturer, Student) với attribute [Authorize(Roles = "...")] an toàn.',
      },
      {
        name: '4. Repository Pattern & Clean Architecture',
        maxPoints: 2.0,
        description: 'Áp dụng Dependency Injection cho Services & Repositories, sử dụng async/await nhất quán, bắt lỗi bằng Global Exception Middleware.',
      },
    ],
  },
  csd201: {
    title: 'Cấu trúc dữ liệu & Thuật toán cây / đồ thị (CSD201)',
    subject: 'CSD201',
    difficulty: 'hard',
    criteria: [
      {
        name: '1. Khởi tạo & Cấu trúc Node / Cây nhị phân (BST)',
        maxPoints: 2.5,
        description: 'Khai báo cấu trúc Node và Binary Search Tree chuẩn, cấp phát và giải phóng vùng nhớ an toàn, xử lý các trường hợp cây rỗng.',
      },
      {
        name: '2. Hiện thực thao tác Thêm, Tìm kiếm và Xóa Node',
        maxPoints: 3.5,
        description: 'Hiện thực đúng thuật toán chèn và xóa node trên BST (bao gồm trường hợp xóa node có 2 con bằng cách tìm node thế mạng In-order successor).',
      },
      {
        name: '3. Thuật toán Duyệt cây & Thao tác nâng cao',
        maxPoints: 2.5,
        description: 'Duyệt theo thứ tự Breadth-First (BFS bằng Queue) và Depth-First (In-order, Pre-order, Post-order). Tính chiều cao cây, đếm số lá.',
      },
      {
        name: '4. Phân tích độ phức tạp & Chất lượng mã nguồn',
        maxPoints: 1.5,
        description: 'Mã nguồn tối ưu O(log n) trong trường hợp cân bằng, comment giải thích thuật toán rõ ràng, kiểm thử thành công toàn bộ test cases.',
      },
    ],
  },
}

export function LecturerAIRubricPage() {
  const searchParams = useSearchParams()
  const initialAssignmentId = searchParams?.get('assignmentId') || searchParams?.get('id') || ''

  const { t, language } = useLanguage()
  const isVi = language === 'vi'

  const [assignments, setAssignments] = React.useState<AssignmentRow[]>([])
  const [selectedAssignmentId, setSelectedAssignmentId] = React.useState<string>(initialAssignmentId)
  const [form, setForm] = React.useState({
    topic: '',
    difficulty: 'medium',
    totalScore: 10,
    fileRef: null as File | null,
  })
  const [generating, setGenerating] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [criteria, setCriteria] = React.useState<RubricCriterion[]>([])
  const [rawText, setRawText] = React.useState<string>('')
  const [copied, setCopied] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    assignmentsApi.getAssignments()
      .then(res => {
        if (Array.isArray(res)) {
          setAssignments(res)
          if (initialAssignmentId) {
            const found = res.find(a => String(a.id) === initialAssignmentId)
            if (found) {
              setForm(prev => ({
                ...prev,
                topic: found.title || prev.topic,
                totalScore: found.maxScore || (found as any)?.totalPoints || 10,
              }))
            }
          }
        }
      })
      .catch(() => {})
  }, [initialAssignmentId])

  function handleSelectAssignment(id: string) {
    setSelectedAssignmentId(id)
    const found = assignments.find(a => String(a.id) === id)
    if (found) {
      setForm(prev => ({
        ...prev,
        topic: found.title || prev.topic,
        totalScore: found.maxScore || (found as any)?.totalPoints || 10,
      }))
    }
  }

  function handleApplyTemplate(key: string) {
    const tmpl = FPT_RUBRIC_TEMPLATES[key]
    if (!tmpl) return
    setForm(prev => ({
      ...prev,
      topic: tmpl.title,
      difficulty: tmpl.difficulty,
      totalScore: 10,
    }))
    setCriteria(tmpl.criteria)
    setRawText('')
    setSaveSuccess(false)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic.trim()) return
    setGenerating(true)
    setSaveSuccess(false)
    try {
      const body = new FormData()
      body.append('topic', form.topic)
      body.append('difficulty', form.difficulty)
      body.append('totalScore', String(form.totalScore))
      if (form.fileRef) body.append('file', form.fileRef)

      const res = await rubricApi.generateRubricAI(body)
      let parsedCriteria: RubricCriterion[] = []
      let raw = ''

      if (res && typeof res === 'object') {
        if (Array.isArray(res.criteria)) {
          parsedCriteria = res.criteria
        } else if (Array.isArray(res)) {
          parsedCriteria = res
        }
      }
      if (parsedCriteria.length === 0) {
        raw = typeof res === 'string' ? res : JSON.stringify(res, null, 2)
      }
      setCriteria(parsedCriteria)
      setRawText(raw)
    } catch (err: any) {
      alert(err?.message || (isVi ? 'Không thể tạo rubric từ AI. Vui lòng thử lại.' : 'Failed to generate rubric from AI.'))
    } finally {
      setGenerating(false)
    }
  }

  // Auto-balance criteria points so they sum up to form.totalScore exactly
  function handleAutoBalance() {
    if (criteria.length === 0) return
    const currentSum = criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0)
    if (currentSum <= 0) return

    const factor = form.totalScore / currentSum
    const updated = criteria.map(c => ({
      ...c,
      maxPoints: Math.round((Number(c.maxPoints) * factor) * 4) / 4,
    }))

    const newSum = updated.reduce((sum, c) => sum + c.maxPoints, 0)
    const diff = Math.round((form.totalScore - newSum) * 100) / 100
    if (diff !== 0 && updated.length > 0) {
      updated[updated.length - 1].maxPoints = Math.round((updated[updated.length - 1].maxPoints + diff) * 4) / 4
    }
    setCriteria(updated)
  }

  async function handleSave() {
    if (!selectedAssignmentId) {
      alert(isVi ? 'Vui lòng chọn bài tập để lưu Rubric này vào hệ thống.' : 'Please select an assignment to link this rubric.')
      return
    }
    setSaving(true)
    setSaveSuccess(false)
    try {
      await rubricApi.saveExamRubric(selectedAssignmentId, {
        criteria,
        total: form.totalScore,
      })
      setSaveSuccess(true)
    } catch (err: any) {
      alert(err?.message || (isVi ? 'Lỗi khi lưu rubric vào bài tập.' : 'Error saving rubric.'))
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    const json = JSON.stringify({ criteria, totalScore: form.totalScore }, null, 2)
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleExportJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ criteria, totalScore: form.totalScore }, null, 2))
    const dlAnchorElem = document.createElement('a')
    dlAnchorElem.setAttribute('href', dataStr)
    dlAnchorElem.setAttribute('download', `rubric-${form.topic.replace(/\s+/g, '_') || 'ai'}.json`)
    dlAnchorElem.click()
  }

  const calculatedTotal = criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0)
  const isBalanced = Math.abs(calculatedTotal - form.totalScore) < 0.05

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={isVi ? 'Barem chấm (Rubric AI)' : 'AI Rubric Generator'}
      headerSubtitle={isVi ? 'Tạo tiêu chí chấm điểm tự động và barem đánh giá bài nộp bằng mô hình AI' : 'Generate automated grading rubrics using AI models'}
    >
      <div className="space-y-6 w-full pb-12">
        {/* Breadcrumb Navigation & Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/lecturer/grading/assignments"
              className="p-2 rounded-xl border border-orange-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-orange-600 hover:bg-orange-50/60 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              title={isVi ? 'Quay lại danh sách bài tập' : 'Back to Assignments'}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {isVi ? 'Trình tạo Barem Rubric Chấm điểm AI' : 'AI Rubric Generator Studio'}
                </h1>
                <Badge variant="orange" className="text-[10px] font-mono font-bold uppercase">
                  FPT Hybrid Engine
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVi
                  ? 'Tự động phân tích yêu cầu đề bài, thiết lập ma trận tiêu chí và phân bổ điểm chuẩn mực'
                  : 'Automatically analyze problem specifications, define criteria matrices, and balance scores'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {criteria.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 px-3 text-xs gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? (isVi ? 'Đã chép' : 'Copied') : (isVi ? 'Sao chép JSON' : 'Copy JSON')}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportJson}
                  className="h-8 px-3 text-xs gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Tải .json' : 'Export .json'}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick FPT University Rubric Templates Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-orange-100/90 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-orange-500" />
              <span>{isVi ? 'Mẫu Rubric chuẩn FPT có sẵn (1-Click Apply):' : 'Pre-set FPT Standard Rubrics:'}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {isVi ? 'Bấm để nạp nhanh khung tiêu chí' : 'Click to load template'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => handleApplyTemplate('prj301')}
              className="p-3 rounded-xl border border-orange-100 dark:border-slate-800 bg-orange-50/40 dark:bg-orange-950/20 hover:border-orange-300 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                  Java Web MVC & JDBC
                </span>
                <Badge variant="orange" className="text-[10px] font-mono">PRJ301</Badge>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                4 tiêu chí: MVC, JDBC CRUD, Session, Form Validation (10đ)
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate('prn212')}
              className="p-3 rounded-xl border border-orange-100 dark:border-slate-800 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-300 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  .NET Core Web API & EF
                </span>
                <Badge variant="blue" className="text-[10px] font-mono">PRN212</Badge>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                4 tiêu chí: EF Code-First, REST API, JWT Auth, Clean Code (10đ)
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate('csd201')}
              className="p-3 rounded-xl border border-orange-100 dark:border-slate-800 bg-purple-50/40 dark:bg-purple-950/20 hover:border-purple-300 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                  Cấu trúc dữ liệu & Thuật toán
                </span>
                <Badge variant="orange" className="text-[10px] font-mono">CSD201</Badge>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                4 tiêu chí: Node init, BST CRUD, BFS/DFS, Complexity (10đ)
              </p>
            </button>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form & Configuration */}
          <div className="lg:col-span-1 space-y-5">
            <Card className="p-5 border-orange-100/90 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm border-b border-orange-100/80 dark:border-slate-800 pb-3">
                <FileCheck2 className="w-4 h-4" />
                <span>{isVi ? 'Cấu hình đề bài & Sinh AI' : 'Prompt & AI Configuration'}</span>
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Assignment Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {isVi ? 'Gán vào bài tập (Tùy chọn)' : 'Link to Assignment (Optional)'}
                  </label>
                  <select
                    value={selectedAssignmentId}
                    onChange={e => handleSelectAssignment(e.target.value)}
                    className="w-full text-xs font-medium border border-orange-200/90 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="">{isVi ? '-- Tạo tự do (chưa gán bài tập) --' : '-- Standalone rubric (unassigned) --'}</option>
                    {assignments.map(a => (
                      <option key={a.id} value={String(a.id)}>
                        {a.title} ({a.subjectCode || 'No Code'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic / Problem Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {isVi ? 'Chủ đề / Đề bài *' : 'Assignment Topic & Spec *'}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {form.topic.length} {isVi ? 'ký tự' : 'chars'}
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    required
                    placeholder={isVi ? 'Ví dụ: Xây dựng ứng dụng web quản lý bán hàng / sinh viên theo mô hình MVC sử dụng Servlet/JSP, kết nối CSDL SQL Server bằng JDBC, có kiểm tra đăng nhập và quản lý session...' : 'e.g., Build a web app using MVC with Servlet and JSP, JDBC database connectivity, and session management...'}
                    value={form.topic}
                    onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full text-xs border border-orange-200/90 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-500 transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Difficulty & Total Scale */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      {isVi ? 'Độ khó' : 'Difficulty'}
                    </label>
                    <select
                      value={form.difficulty}
                      onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full text-xs font-medium border border-orange-200/90 dark:border-slate-800 rounded-xl px-2.5 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                    >
                      <option value="easy">{isVi ? 'Cơ bản (Easy)' : 'Easy'}</option>
                      <option value="medium">{isVi ? 'Trung bình (Medium)' : 'Medium'}</option>
                      <option value="hard">{isVi ? 'Nâng cao (Hard)' : 'Hard'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      {isVi ? 'Thang điểm' : 'Max Score'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={form.totalScore}
                        onChange={e => setForm(prev => ({ ...prev, totalScore: Number(e.target.value) || 10 }))}
                        className="w-full text-xs font-mono font-bold border border-orange-200/90 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                        {isVi ? 'điểm' : 'pts'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* File Attachment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    {isVi ? 'Tài liệu đề bài (.pdf, .docx, .txt)' : 'Spec Document (.pdf, .docx, .txt)'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={e => setForm(prev => ({ ...prev, fileRef: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                  {form.fileRef ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-orange-200 dark:border-slate-800 bg-orange-50/50 dark:bg-orange-950/20 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {form.fileRef.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(form.fileRef.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, fileRef: null }))
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title={isVi ? 'Xóa file' : 'Remove file'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-orange-200 dark:border-slate-800 hover:border-orange-400 rounded-xl p-3 text-center transition-colors cursor-pointer"
                    >
                      <Upload className="w-5 h-5 mx-auto text-orange-400 mb-1" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {isVi ? 'Tải lên đề bài đặc tả' : 'Upload specification file'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PDF, DOCX hoặc TXT (tối đa 15MB)
                      </p>
                    </button>
                  )}
                </div>

                {/* Generate Button */}
                <Button
                  type="submit"
                  disabled={generating || !form.topic.trim()}
                  className="w-full py-2.5 text-xs font-bold gap-2 shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
                  <span>{generating ? (isVi ? 'AI đang phân tích & thiết lập Rubric...' : 'Generating Rubric...') : (isVi ? 'Sinh tiêu chí Rubric với AI' : 'Generate Rubric with AI')}</span>
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: Output & Interactive Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 border-orange-100/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs min-h-[500px] flex flex-col justify-between">
              <div className="space-y-4">
                {/* Header with Balance Indicator */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                        {isVi ? 'Bảng tiêu chí Rubric Chấm điểm' : 'Rubric Criteria Table'}
                      </h2>
                      {criteria.length > 0 && (
                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                          {criteria.length} {isVi ? 'tiêu chí' : 'items'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="text-slate-500">
                        {isVi ? 'Tổng điểm tiêu chí:' : 'Total Score:'}
                      </span>
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md border ${
                        isBalanced
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}>
                        {calculatedTotal} / {form.totalScore} {isVi ? 'điểm' : 'pts'}
                      </span>
                      {!isBalanced && criteria.length > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoBalance}
                          className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                          title={isVi ? 'Tự động điều chỉnh các tiêu chí để khớp chuẩn thang điểm' : 'Auto-balance scores'}
                        >
                          {isVi ? 'Tự động cân bằng điểm' : 'Auto Balance'}
                        </button>
                      )}
                    </div>
                  </div>

                  {criteria.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCriteria(prev => [...prev, { name: '', maxPoints: 1.0, description: '' }])}
                        className="h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-orange-500" />
                        <span>{isVi ? 'Thêm tiêu chí' : 'Add Item'}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Empty State */}
                {criteria.length === 0 && !rawText && !generating && (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mx-auto border border-orange-200/80 dark:border-orange-900/40 shadow-xs">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isVi ? 'Chưa có barem rubric nào được tải' : 'No rubric generated yet'}
                      </h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                        {isVi
                          ? 'Nhập thông tin đề bài bên trái và nhấn "Sinh tiêu chí Rubric với AI" hoặc chọn nhanh một trong các mẫu FPT có sẵn ở trên để bắt đầu.'
                          : 'Enter the assignment details on the left and click "Generate Rubric with AI" or pick one of the FPT templates above.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {generating && (
                  <div className="py-24 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/25 animate-bounce">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isVi ? 'AI đang phân tích và kiến tạo Rubric...' : 'AI is analyzing requirements...'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {isVi
                          ? 'Thiết lập các mốc đánh giá, phân bổ trọng số điểm số theo thang điểm FPT 10.0'
                          : 'Defining milestones, criteria, and balancing weights on 10.0 scale'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Criteria Cards List */}
                {criteria.length > 0 && (
                  <div className="space-y-3">
                    {criteria.map((c, idx) => {
                      const weightPercent = form.totalScore > 0 ? Math.round(((Number(c.maxPoints) || 0) / form.totalScore) * 100) : 0

                      return (
                        <div
                          key={idx}
                          className="border border-orange-100/90 dark:border-slate-800 rounded-2xl p-4 bg-orange-50/20 dark:bg-slate-800/30 space-y-2.5 hover:border-orange-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-orange-200/80 dark:border-orange-900/40">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              placeholder={isVi ? 'Tên tiêu chí (ví dụ: Thiết kế MVC, Xử lý JDBC, Xác thực Session...)' : 'Criterion name...'}
                              value={c.name}
                              onChange={e => {
                                const val = e.target.value
                                setCriteria(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item))
                              }}
                              className="flex-1 text-xs font-bold border border-orange-100/90 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                min={0.25}
                                step={0.25}
                                value={c.maxPoints}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0
                                  setCriteria(prev => prev.map((item, i) => i === idx ? { ...item, maxPoints: val } : item))
                                }}
                                className="w-16 text-xs text-right font-mono font-bold border border-orange-100/90 dark:border-slate-800 rounded-xl px-2.5 py-2 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                              />
                              <span className="text-xs font-bold text-slate-500">đ</span>
                              <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                                {weightPercent}%
                              </Badge>
                              <button
                                type="button"
                                onClick={() => setCriteria(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title={isVi ? 'Xóa tiêu chí này' : 'Delete criterion'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            placeholder={isVi ? 'Mô tả chi tiết yêu cầu đạt điểm tối đa (ví dụ: Viết code sạch, xử lý exception, đúng mô hình...)' : 'Detailed description for maximum points...'}
                            value={c.description || ''}
                            onChange={e => {
                              const val = e.target.value
                              setCriteria(prev => prev.map((item, i) => i === idx ? { ...item, description: val } : item))
                            }}
                            className="w-full text-xs text-slate-600 dark:text-slate-300 border border-orange-100/90 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Raw fallback text */}
                {rawText && criteria.length === 0 && (
                  <pre className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-mono whitespace-pre-wrap overflow-x-auto border border-slate-200 dark:border-slate-800 max-h-96">
                    {rawText}
                  </pre>
                )}
              </div>

              {/* Bottom Footer Actions */}
              {criteria.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {saveSuccess && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isVi ? 'Đã lưu barem rubric vào bài tập thành công!' : 'Rubric saved successfully!'}</span>
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    disabled={saving || !selectedAssignmentId}
                    onClick={handleSave}
                    className="h-9 px-4 text-xs font-bold gap-2 cursor-pointer shadow-md shadow-orange-500/20"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu vào bài tập đã chọn' : 'Save to Assignment')}</span>
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default LecturerAIRubricPage
