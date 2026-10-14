'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  AlertCircle,
  Database,
  Code,
  Upload,
  Loader2,
  FileCheck2,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  Layers,
  CheckCircle,
  Bot
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FileUpload } from '../components/FileUpload'
import { RubricRuleSpecViewer } from '../components/RubricRuleSpecViewer'
import { gradingApi } from '@/lib/api/modules/grading'
import { classesApi } from '@/lib/api/modules/classes'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { assignmentsApi } from '@/lib/api/modules/assignments'
import { semestersApi } from '@/lib/api/modules/semesters'
import { promptsApi, type PromptTemplate } from '@/lib/api/modules/prompts'
import { aiGenerationStore } from '@/services/aiGenerationStore'
import { cleanAssignmentHtml } from '@/utils/htmlCleaner'
import { extractAssignmentTypesFromSyllabus } from '@/utils/subjectHelper'
import { useLanguage } from '@/providers/language-provider'

export function AssignmentUploadPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [textPrompt, setTextPrompt] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // AI Store sync
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Context data
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [allClasses, setAllClasses] = useState<any[]>([])
  const [allSubjects, setAllSubjects] = useState<any[]>([])
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([])
  const [subjectCode, setSubjectCode] = useState('')
  const [availableAssignmentTypes, setAvailableAssignmentTypes] = useState<string[]>([])
  const [selectedAssignmentType, setSelectedAssignmentType] = useState('')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])

  // Prompt templates
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([])
  const [isPromptDrawerOpen, setIsPromptDrawerOpen] = useState(false)

  // Step 2 & 3 content
  const [content, setContent] = useState('')
  const [blueprint, setBlueprint] = useState<any>(null)
  const [rubric, setRubric] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>({
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 10,
    weightPercentage: 10,
    category: 'Assignment'
  })

  // SQL Answer key
  const [isUploadingAnswerKey, setIsUploadingAnswerKey] = useState(false)
  const [existingTotalWeight, setExistingTotalWeight] = useState(0)

  // Subscribe to AI store
  useEffect(() => {
    const unsub = aiGenerationStore.subscribe((state) => {
      setIsLoading(state.isGenerating)
      if (state.loadingMsg) setLoadingMsg(state.loadingMsg)
      if (state.error) setError(state.error)
      if (state.result) {
        setContent(cleanAssignmentHtml(state.result.content))
        setRubric(state.result.rubric)
        setBlueprint(state.result.blueprint)
        setMetadata((prev: any) => ({
          ...prev,
          ...state.result?.metadata,
          dueDate: prev.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
        }))
        setStep(2)
      }
      if (state.selectedSemester) setSelectedSemester(state.selectedSemester)
      if (state.subjectCode) setSubjectCode(state.subjectCode)
      if (state.assignmentType) setSelectedAssignmentType(state.assignmentType)
      if (state.textPrompt) setTextPrompt(state.textPrompt)
    })
    return unsub
  }, [])

  // Load initial options
  useEffect(() => {
    async function loadData() {
      try {
        const [clsData, semsData, subjData] = await Promise.all([
          classesApi.getClasses(1, 1000).catch(() => []),
          semestersApi.getSemesters().catch(() => []),
          subjectsApi.getSubjects(1, 1000).catch(() => [])
        ])

        const classes = Array.isArray(clsData) ? clsData : []
        setAllClasses(classes)

        const subs = Array.isArray(subjData) ? subjData : ((subjData as any)?.data || [])
        setAllSubjects(subs)

        const sems = Array.isArray(semsData) ? semsData : []
        setSemesters(sems)

        // Teacher's unique subjects
        const uniqueSubs = new Set<string>()
        classes.forEach((c: any) => {
          const code = c.subject?.code || c.subjectCode
          if (code) uniqueSubs.add(code)
        })
        const teacherSubs = Array.from(uniqueSubs).sort()
        setTeacherSubjects(teacherSubs)

        // Default semester
        const activeSem = sems.find((s: any) => s.isActive) || sems[0]
        if (activeSem) setSelectedSemester(activeSem.id)

        // Default subject
        if (teacherSubs.length > 0) {
          setSubjectCode(teacherSubs[0])
        }
      } catch (err) {
        console.error('Failed to load initial assignment upload data:', err)
      }
    }
    void loadData()
  }, [])

  // Update syllabus assignment types when subject changes
  useEffect(() => {
    if (!subjectCode) {
      setAvailableAssignmentTypes([])
      setSelectedAssignmentType('')
      return
    }
    const found = allSubjects.find((s) => s.code?.toLowerCase() === subjectCode.toLowerCase())
    const types = extractAssignmentTypesFromSyllabus(found?.syllabusData)
    setAvailableAssignmentTypes(types)
    if (types.length > 0) {
      setSelectedAssignmentType((prev) => (types.includes(prev) ? prev : types[0]))
    } else {
      setSelectedAssignmentType('Assignment')
    }

    // Load prompt templates for subject
    if (found?.id) {
      promptsApi.getPromptTemplates(found.id).then(setPromptTemplates).catch(() => setPromptTemplates([]))
    }
  }, [subjectCode, allSubjects])

  // Filter classes available for selected semester and subject
  const availableClasses = allClasses.filter((c: any) => {
    const semMatch = !selectedSemester || c.semester?.id === selectedSemester || c.semesterId === selectedSemester
    const subMatch = !subjectCode || c.subject?.code?.toLowerCase() === subjectCode.toLowerCase()
    return semMatch && subMatch
  })

  // Start Generation via Text
  const handleGenerateText = () => {
    if (!textPrompt.trim()) {
      setError('Vui lòng nhập mô tả hoặc yêu cầu đề bài')
      return
    }
    if (!selectedSemester || !subjectCode) {
      setError('Vui lòng chọn Học kỳ và Môn học')
      return
    }
    setError(null)
    aiGenerationStore.startGeneration(textPrompt, selectedSemester, subjectCode, selectedAssignmentType)
  }

  // Start Generation via File
  const handleUploadFile = async (file: File) => {
    if (!selectedSemester || !subjectCode) {
      setError('Vui lòng chọn Học kỳ và Môn học trước khi tải file')
      return
    }
    setError(null)
    setUploadedFile(file)
    await aiGenerationStore.startFileGeneration(file, selectedSemester, subjectCode, selectedAssignmentType)
  }

  // Handle SQL Answer Key upload
  const handleAnswerKeyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAnswerKey(true)
    setError(null)
    try {
      if (rubric?.rules) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('rubricRules', JSON.stringify(rubric.rules))
        const res = await gradingApi.parseSqlKey(formData)
        if (res.rules) {
          setRubric({ ...rubric, rules: res.rules })
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể đọc file SQL Answer Key')
    } finally {
      setIsUploadingAnswerKey(false)
    }
  }

  // Publish assignment
  const handlePublish = async () => {
    if (!rubric || !blueprint) return

    if (selectedClasses.length === 0) {
      setError('Vui lòng chọn ít nhất một lớp học áp dụng bài tập')
      return
    }
    if (!metadata.dueDate) {
      setError('Vui lòng đặt hạn nộp bài')
      return
    }
    if (new Date(metadata.dueDate).getTime() <= Date.now()) {
      setError('Hạn nộp bài phải ở thời điểm tương lai.')
      return
    }

    const newWeight = metadata.weightPercentage !== undefined ? Number(metadata.weightPercentage) : 0
    if (newWeight > 70) {
      setError('Tỷ trọng điểm của bài tập không được vượt quá 70%.')
      return
    }

    // Check cumulative weight per class across active assignments
    try {
      const allExams = await assignmentsApi.getAssignments()
      if (Array.isArray(allExams) && selectedClasses.length > 0) {
        for (const classId of selectedClasses) {
          const targetClass = allClasses.find((c: any) => c.id === classId)
          const className = targetClass?.name || targetClass?.classCode || targetClass?.code || classId

          const classExams = allExams.filter((a: any) => {
            if (a.isDeleted || a.status === 'deleted' || a.status === 'Deleted') return false
            const matchesClass = Array.isArray(a.classes)
              ? a.classes.includes(classId)
              : (a.classId === classId || (Array.isArray(a.classIds) && a.classIds.includes(classId)))
            return matchesClass
          })

          const existingTotal = classExams.reduce((sum: number, a: any) => sum + (Number(a.weightPercentage) || 0), 0)
          if (existingTotal + newWeight > 70) {
            setError(`Tổng trọng số các bài tập trong lớp ${className} không được vượt quá 70%. Hiện tại đã là ${existingTotal}%, thêm mới ${newWeight}% sẽ thành ${existingTotal + newWeight}%.`)
            return
          }
        }
      }
    } catch (weightCheckErr: any) {
      setError('Không thể kiểm tra tổng trọng số các bài tập trong lớp: ' + (weightCheckErr?.message || 'Lỗi đọc dữ liệu'))
      return
    }

    const totalWeight = rubric.rules ? rubric.rules.reduce((sum: number, r: any) => sum + (Number(r.weight) || 0), 0) : 0
    if (Math.abs(totalWeight - (metadata.totalPoints || 10)) > 0.05) {
      setError(`Tổng điểm các tiêu chí rubric (${totalWeight}) phải bằng điểm tối đa (${metadata.totalPoints || 10})`)
      return
    }

    setIsLoading(true)
    setLoadingMsg('Đang tạo và phân phối bài tập đến các lớp học...')
    try {
      const isLocked = metadata.latePolicyOption === 'NONE_LOCKED'
      const allowLateSubmission = metadata.allowLateSubmission !== undefined ? metadata.allowLateSubmission : !isLocked
      let latePenaltyType = 'NONE'
      if (metadata.latePolicyOption === 'DAILY_POINTS') latePenaltyType = 'DAILY_POINTS'
      else if (metadata.latePolicyOption === 'DAILY_PERCENT') latePenaltyType = 'DAILY_PERCENT'
      else if (metadata.latePolicyOption === 'FLAT_POINTS') latePenaltyType = 'FLAT_POINTS'

      const finalMetadata = {
        ...metadata,
        title: metadata.title || 'AI Assignment',
        assignmentType: selectedAssignmentType || metadata.category || 'Assignment',
        examType: selectedAssignmentType || metadata.category || 'Assignment',
        category: selectedAssignmentType || metadata.category || 'Assignment',
        semesterId: selectedSemester,
        classIds: selectedClasses,
        content: cleanAssignmentHtml(content),
        gradingStrategy: metadata.gradingStrategy || metadata.strategy || 'CONTINUOUS_QUEUE',
        strategy: metadata.gradingStrategy || metadata.strategy || 'CONTINUOUS_QUEUE',
        allowLateSubmission,
        latePenaltyType,
        latePenaltyValue: Number(metadata.latePenaltyValue) || 0,
        lateSubmitHours: Number(metadata.lateSubmitHours) || 24,
      }

      const assignment = await gradingApi.publishAssignment(finalMetadata, blueprint, rubric)
      aiGenerationStore.reset()
      router.push(`/lecturer/grading/assignments/${assignment.id || assignment.examId}`)
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo bài tập vào hệ thống')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.upload.header_title', 'Tạo đề bài & Barem AI')}
      headerSubtitle={t('lecturer.upload.header_subtitle', 'Trích xuất tài liệu đào tạo, sinh đề bài tự động và thiết lập barem chấm sandbox')}
    >
      <div className="w-full space-y-6 pb-12">
        {/* Progress Stepper */}
        <div className="relative overflow-hidden flex items-center justify-between bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 p-4 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div className={`flex items-center gap-3 ${step >= 1 ? 'text-orange-600 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 1 ? 'bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/25' : 'bg-slate-100 text-slate-400'}`}>
              1
            </div>
            <span>{t('lecturer.upload.step1', 'Nhập nguồn đề bài')}</span>
          </div>
          <div className="h-0.5 flex-1 mx-4 bg-orange-100/80 dark:bg-slate-800" />
          <div className={`flex items-center gap-3 ${step >= 2 ? 'text-orange-600 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 2 ? 'bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/25' : 'bg-slate-100 text-slate-400'}`}>
              2
            </div>
            <span>{t('lecturer.upload.step2', 'Nội dung & Yêu cầu')}</span>
          </div>
          <div className="h-0.5 flex-1 mx-4 bg-orange-100/80 dark:bg-slate-800" />
          <div className={`flex items-center gap-3 ${step >= 3 ? 'text-orange-600 font-bold' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 3 ? 'bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/25' : 'bg-slate-100 text-slate-400'}`}>
              3
            </div>
            <span>{t('lecturer.upload.step3', 'Barem Rubric & Xuất bản')}</span>
          </div>
        </div>

        {/* Global Loading Overlay */}
        {isLoading && (
          <div className="p-8 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-2xl flex items-center gap-4 animate-pulse">
            <Loader2 className="w-6 h-6 text-orange-600 animate-spin shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">{loadingMsg || 'Đang xử lý...'}</p>
              <p className="text-xs text-orange-700 dark:text-orange-400">Hệ thống AI đang phân tích dữ liệu, vui lòng đợi trong giây lát.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => aiGenerationStore.cancelGeneration()} className="text-xs">
              Hủy
            </Button>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between text-sm text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-xs">
              Đóng
            </Button>
          </div>
        )}

        {/* STEP 1: INPUT SOURCE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="relative overflow-hidden p-6 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 rounded-2xl shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Thông tin bài tập & môn học
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Học kỳ</label>
                  <select
                    className="w-full rounded-xl border border-orange-100/90 bg-white p-2.5 text-sm dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:border-orange-400"
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                  >
                    <option value="">Chọn học kỳ</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.code} {s.isActive ? '(Hiện tại)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Môn học</label>
                  <select
                    className="w-full rounded-xl border border-orange-100/90 bg-white p-2.5 text-sm dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:border-orange-400"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                  >
                    <option value="">Chọn môn học</option>
                    {teacherSubjects.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Loại bài tập</label>
                  <select
                    className="w-full rounded-xl border border-orange-100/90 bg-white p-2.5 text-sm dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:border-orange-400"
                    value={selectedAssignmentType}
                    onChange={(e) => setSelectedAssignmentType(e.target.value)}
                  >
                    {availableAssignmentTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    {!availableAssignmentTypes.includes('Assignment') && <option value="Assignment">Assignment</option>}
                    {!availableAssignmentTypes.includes('Lab') && <option value="Lab">Lab</option>}
                    {!availableAssignmentTypes.includes('Workshop') && <option value="Workshop">Workshop</option>}
                  </select>
                </div>
              </div>

              {/* Mode switch */}
              <div className="inline-flex p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs mb-6">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    inputMode === 'text'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Mô tả bằng văn bản / Chỉ dẫn AI
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    inputMode === 'file'
                      ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Tải lên tài liệu đề bài (PDF / Word / ZIP / SQL)
                </button>
              </div>

              {inputMode === 'text' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Mô tả yêu cầu, chủ đề bài tập hoặc paste nội dung đề:
                    </span>
                    {promptTemplates.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPromptDrawerOpen(!isPromptDrawerOpen)}
                        className="text-xs gap-1.5 text-orange-600"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        Thư viện Prompt ({promptTemplates.length})
                      </Button>
                    )}
                  </div>

                  {isPromptDrawerOpen && (
                    <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-xl space-y-2 max-h-56 overflow-y-auto">
                      <p className="text-xs font-bold text-orange-800 dark:text-orange-300">Chọn mẫu chỉ dẫn đã lưu:</p>
                      {promptTemplates.map((pt) => (
                        <div
                          key={pt.id}
                          onClick={() => {
                            setTextPrompt(pt.templateContent)
                            promptsApi.incrementPromptUsage(pt.id).catch(console.error)
                            setIsPromptDrawerOpen(false)
                          }}
                          className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-500 transition-all text-xs"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{pt.name}</div>
                          <div className="text-slate-500 line-clamp-1">{pt.templateContent}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    rows={8}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:bg-slate-900 dark:border-slate-800"
                    placeholder="Ví dụ: Tạo bài thực hành SQL gồm 5 câu truy vấn từ cơ bản đến nâng cao cho môn DBI202 về hệ thống Quản lý Thư viện, yêu cầu sinh schema CREATE TABLE, INSERT và các tiêu chí chấm điểm tự động..."
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                  />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleGenerateText}
                      disabled={isLoading || !textPrompt.trim()}
                      className="bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      Tạo đề bài bằng AI
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <FileUpload onUpload={handleUploadFile} isUploading={isLoading} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: CONTENT & BLUEPRINT REVIEW */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-orange-500" />
                  Kiểm tra nội dung & Thiết lập bài tập
                </h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Quay lại
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setStep(3)}
                    className="text-xs bg-orange-600 hover:bg-orange-700 text-white gap-1"
                  >
                    Tiếp tục barem Rubric
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Tiêu đề bài tập</label>
                  <Input
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    placeholder="Tên bài tập"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Hạn nộp bài</label>
                  <Input
                    type="datetime-local"
                    value={metadata.dueDate}
                    onChange={(e) => setMetadata({ ...metadata, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Điểm tối đa</label>
                  <Input
                    type="number"
                    value={metadata.totalPoints}
                    onChange={(e) => setMetadata({ ...metadata, totalPoints: Number(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Tỷ trọng điểm (%)</label>
                  <Input
                    type="number"
                    value={metadata.weightPercentage}
                    onChange={(e) => setMetadata({ ...metadata, weightPercentage: Number(e.target.value) || 10 })}
                  />
                </div>
              </div>

              {/* Grading Strategy & Late Policy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Chiến lược chấm điểm</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
                    value={metadata.gradingStrategy || 'CONTINUOUS_QUEUE'}
                    onChange={(e) => setMetadata({ ...metadata, gradingStrategy: e.target.value, strategy: e.target.value })}
                  >
                    <option value="CONTINUOUS_QUEUE">Chấm liên tục (Real-time khi nộp)</option>
                    <option value="BATCH_POST_DEADLINE">Chấm hàng loạt sau hạn nộp</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Chính sách nộp trễ</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs"
                    value={metadata.latePolicyOption || 'NONE_LOCKED'}
                    onChange={(e) => {
                      const opt = e.target.value
                      setMetadata({
                        ...metadata,
                        latePolicyOption: opt,
                        allowLateSubmission: opt !== 'NONE_LOCKED',
                      })
                    }}
                  >
                    <option value="NONE_LOCKED">Không chấp nhận (Khóa sau hạn)</option>
                    <option value="DAILY_POINTS">Trừ điểm theo ngày</option>
                    <option value="DAILY_PERCENT">Trừ điểm theo tỷ lệ %</option>
                    <option value="FLAT_POINTS">Trừ điểm cố định khi trễ</option>
                    <option value="NONE_FREE">Cho phép nộp trễ miễn phí</option>
                  </select>
                </div>

                {metadata.latePolicyOption && metadata.latePolicyOption !== 'NONE_LOCKED' && metadata.latePolicyOption !== 'NONE_FREE' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Mức phạt {metadata.latePolicyOption === 'DAILY_PERCENT' ? '(%)' : '(điểm)'}
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={metadata.latePenaltyValue || 0}
                        onChange={(e) => setMetadata({ ...metadata, latePenaltyValue: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        Chấp nhận trễ tối đa (giờ)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={metadata.lateSubmitHours || 24}
                        onChange={(e) => setMetadata({ ...metadata, lateSubmitHours: Number(e.target.value) || 24 })}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                  Nội dung đề bài (HTML / Markdown):
                </label>
                <textarea
                  rows={14}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs dark:bg-slate-900 dark:border-slate-800"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </Card>
          </div>
        )}

        {/* STEP 3: RUBRIC & PUBLISH */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  Barem Rubric & Phân phối lớp học
                </h2>
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Chỉnh sửa đề
                </Button>
              </div>

              {/* Target Classes Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Chọn lớp học áp dụng bài tập ({availableClasses.length} lớp khả dụng):
                </label>
                {availableClasses.length === 0 ? (
                  <p className="text-xs text-amber-600 italic">Không tìm thấy lớp học nào thuộc môn {subjectCode} trong học kỳ đã chọn.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {availableClasses.map((cls) => {
                      const isSelected = selectedClasses.includes(cls.id)
                      return (
                        <div
                          key={cls.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedClasses(selectedClasses.filter((id) => id !== cls.id))
                            } else {
                              setSelectedClasses([...selectedClasses, cls.id])
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200 font-semibold'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <span>{cls.code || cls.name}</span>
                          {isSelected && <CheckCircle className="w-4 h-4 text-orange-600 shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SQL Answer key if projectType is sql */}
              {blueprint?.projectType === 'sql' && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                      <Database className="w-4 h-4 text-blue-500" />
                      <span>SQL Reference Answer Key (.sql)</span>
                    </div>
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" className="text-xs gap-1 pointer-events-none" isLoading={isUploadingAnswerKey}>
                        <Upload className="w-3.5 h-3.5" />
                        Tải file đáp án .sql
                      </Button>
                      <input type="file" accept=".sql" className="hidden" onChange={handleAnswerKeyUpload} />
                    </label>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    Tải lên file SQL chứa schema tạo bảng và câu lệnh đáp án mẫu để hệ thống phân tích và điền vào barem rubric.
                  </p>
                </div>
              )}

              {/* Rubric Rules list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Danh sách tiêu chí chấm điểm Rubric ({rubric?.rules?.length || 0})
                  </span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tổng điểm:{' '}
                    {rubric?.rules?.reduce((s: number, r: any) => s + (Number(r.weight) || 0), 0) || 0} / {metadata.totalPoints || 10}
                  </span>
                </div>

                {rubric?.rules?.map((rule: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <Input
                          value={rule.title || rule.name || ''}
                          onChange={(e) => {
                            const updated = { ...rubric }
                            updated.rules[idx].title = e.target.value
                            setRubric(updated)
                          }}
                          className="font-semibold text-sm"
                          placeholder="Tên tiêu chí"
                        />
                      </div>
                      <div className="w-28 flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.5"
                          value={rule.weight || 0}
                          onChange={(e) => {
                            const updated = { ...rubric }
                            updated.rules[idx].weight = parseFloat(e.target.value) || 0
                            setRubric(updated)
                          }}
                          className="text-right text-sm"
                        />
                        <span className="text-xs text-slate-500">điểm</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = { ...rubric }
                          updated.rules.splice(idx, 1)
                          setRubric(updated)
                        }}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <textarea
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:bg-slate-900 dark:border-slate-800"
                      placeholder="Mô tả tiêu chuẩn đạt điểm..."
                      value={rule.description || ''}
                      onChange={(e) => {
                        const updated = { ...rubric }
                        updated.rules[idx].description = e.target.value
                        setRubric(updated)
                      }}
                    />

                    {/* Test cases / Probe specification preview */}
                    <RubricRuleSpecViewer rule={rule} />
                  </div>
                ))}
              </div>

              {/* Final Publish Button */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Quay lại
                </Button>
                <Button
                  onClick={handlePublish}
                  isLoading={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm font-semibold"
                >
                  <CheckCircle className="w-4 h-4" />
                  Xuất bản & Giao bài tập cho học sinh
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
export default AssignmentUploadPage
