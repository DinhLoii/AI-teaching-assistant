'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { promptsApi, type PromptTemplate } from '@/lib/api/modules/prompts'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { aiApi } from '@/lib/api/modules/ai'
import { promptGenerationStore } from '@/services/promptGenerationStore'
import {
  ArrowLeft,
  Save,
  Sparkles,
  Bot,
  AlertCircle,
  Wand2,
  Sliders,
  CheckCircle2,
  FileCode,
  Globe
} from 'lucide-react'

export function PromptCreateEditPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = (params?.subjectId as string) || ''
  const promptId = params?.promptId as string | undefined
  const isEditing = Boolean(promptId)

  const [formData, setFormData] = useState({
    name: '',
    category: 'Chung',
    templateContent: '',
    temperature: 0.7,
    isActive: true,
  })

  const [subject, setSubject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null)

  // Config template generator modal/state
  const [templateType, setTemplateType] = useState<'quiz' | 'essay'>('quiz')
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [difficulty, setDifficulty] = useState<string>('Trung bình')
  const [topicInput, setTopicInput] = useState<string>('')
  const [promptLanguage, setPromptLanguage] = useState<'vi' | 'en'>('vi')

  useEffect(() => {
    // If the store holds state from a different subject or prompt, reset it so content does not bleed between subjects
    const currentState = promptGenerationStore.getState()
    if (currentState.subjectId && currentState.subjectId !== subjectId) {
      promptGenerationStore.reset()
    } else if (currentState.promptId && currentState.promptId !== promptId) {
      promptGenerationStore.reset()
    }

    const unsub = promptGenerationStore.subscribe((state) => {
      // Strictly match subjectId and promptId
      const matchesSubject = !state.subjectId || state.subjectId === subjectId
      const matchesPrompt = (!state.promptId && !promptId) || state.promptId === promptId
      if (!matchesSubject || !matchesPrompt) return

      setIsAiGenerating(state.isGenerating)
      if (state.generatedContent) {
        setFormData((prev) => ({ ...prev, templateContent: state.generatedContent! }))
      }
      if (state.successMsg) {
        setAiSuccessMessage(state.successMsg)
        setTimeout(() => setAiSuccessMessage(null), 3000)
      }
      if (state.error) {
        setError(state.error)
      }
    })
    return unsub
  }, [subjectId, promptId])

  useEffect(() => {
    if (!subjectId) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [promptsData, subjectsData] = await Promise.all([
          promptsApi.getPromptTemplates(subjectId).catch(() => []),
          subjectsApi.getSubjects(1, 1000).catch(() => [])
        ])

        const subList = Array.isArray(subjectsData) ? subjectsData : ((subjectsData as any)?.data || [])
        const currentSub = subList.find((s: any) => s.id === subjectId || s.code?.toLowerCase() === subjectId.toLowerCase())
        setSubject(currentSub || { id: subjectId, name: subjectId, code: subjectId })

        if (promptId && Array.isArray(promptsData)) {
          const found = promptsData.find((p: any) => p.id === promptId)
          if (found) {
            setFormData({
              name: found.name || '',
              category: found.category || 'Chung',
              templateContent: found.templateContent || '',
              temperature: (found as any).temperature ?? 0.7,
              isActive: (found as any).isActive ?? true,
            })
          }
        }
      } catch (err) {
        console.error('Failed to load prompt template:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [subjectId, promptId])

  const handleApplyConfigTemplate = () => {
    const code = subject?.code || 'SUBJECT'
    const typeLabel = templateType === 'quiz' ? (promptLanguage === 'en' ? 'Multiple-choice Quiz' : 'Trắc nghiệm') : (promptLanguage === 'en' ? 'Practical Coding / Essay' : 'Tự luận / Thực hành lập trình')
    const topic = topicInput.trim() || (promptLanguage === 'en' ? 'Comprehensive core knowledge' : 'Tổng hợp kiến thức trọng tâm')

    let generated = ''
    if (promptLanguage === 'en') {
      if (templateType === 'quiz') {
        generated = `You are an expert instructor for the course ${code}.
Your task is to create a multiple-choice quiz according to the following requirements:
- Subject: ${code}
- Format: ${typeLabel}
- Topic: ${topic}
- Questions count: ${questionCount}
- Difficulty: ${difficulty}
- Language: English

Detailed requirements:
1. Generate exactly ${questionCount} multiple-choice questions with 4 options (A, B, C, D).
2. Clearly indicate the correct option and provide detailed explanations for why it is correct.
3. Align strictly with the syllabus learning outcomes of ${code}.`
      } else {
        generated = `You are an expert instructor for the course ${code}.
Your task is to create a practical coding or essay assignment according to the following requirements:
- Subject: ${code}
- Format: ${typeLabel}
- Topic: ${topic}
- Difficulty: ${difficulty}
- Language: English

Detailed requirements:
1. Provide a comprehensive real-world problem statement with clear functional requirements.
2. Provide sample test cases (Input / Expected Output).
3. Specify technical constraints and submission instructions for students.`
      }
    } else {
      if (templateType === 'quiz') {
        generated = `Bạn là một giảng viên chuyên gia về môn học ${code}.
Nhiệm vụ của bạn là tạo đề bài kiểm tra trắc nghiệm theo các yêu cầu sau:
- Môn học: ${code}
- Dạng đề: ${typeLabel}
- Chủ đề: ${topic}
- Số lượng: ${questionCount} câu hỏi
- Độ khó: ${difficulty}
- Ngôn ngữ: Tiếng Việt

Yêu cầu chi tiết:
1. Tạo đúng ${questionCount} câu hỏi trắc nghiệm gồm 4 đáp án (A, B, C, D).
2. Chỉ định rõ đáp án đúng và phần giải thích cặn kẽ vì sao đáp án đó chính xác.
3. Bám sát chuẩn đầu ra syllabus của môn ${code}.`
      } else {
        generated = `Bạn là một giảng viên chuyên gia về môn học ${code}.
Nhiệm vụ của bạn là tạo bài tập thực hành/lập trình theo các yêu cầu sau:
- Môn học: ${code}
- Dạng bài: ${typeLabel}
- Chủ đề: ${topic}
- Độ khó: ${difficulty}
- Ngôn ngữ: Tiếng Việt

Yêu cầu chi tiết:
1. Mô tả bài toán thực tế rõ ràng, các nghiệp vụ cụ thể.
2. Cung cấp bộ Test Cases kiểm thử mẫu (Input / Expected Output).
3. Đưa ra hướng dẫn triển khai và các ràng buộc kỹ thuật đối với sinh viên.`
      }
    }

    setFormData((prev) => ({
      ...prev,
      name: prev.name || `${typeLabel} - ${topic}`,
      templateContent: generated,
      category: templateType === 'quiz' ? 'Quiz' : 'Assignment'
    }))

    // Delegate generation tracking to store
    promptGenerationStore.startExecuteGenerate({
      templateType,
      questionCount,
      language: promptLanguage,
      difficulty,
      topic,
      description: generated,
      subjectCode: code,
      subjectId,
      promptId,
      name: formData.name || `${typeLabel} - ${topic}`,
      fallbackPrompt: generated,
    })
  }

  const handleAiRefine = async () => {
    if (!formData.templateContent.trim()) {
      setError('Vui lòng nhập nội dung prompt trước khi yêu cầu AI cải thiện')
      return
    }
    setError(null)
    promptGenerationStore.startAiRefine({
      content: formData.templateContent,
      subjectCode: subject?.code || 'SUBJECT',
      subjectId,
      promptId,
      language: promptLanguage,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.templateContent.trim()) {
      setError('Vui lòng điền đầy đủ Tên prompt và Nội dung prompt')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        ...formData,
        subjectId,
      }
      if (isEditing && promptId) {
        await promptsApi.updatePromptTemplate(promptId, payload)
      } else {
        await promptsApi.createPromptTemplate(payload)
      }
      promptGenerationStore.reset()
      router.push(`/lecturer/prompts/${subjectId}`)
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu prompt template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel="Giảng viên"
      requiredRole="lecturer"
      headerTitle={isEditing ? 'Chỉnh sửa Prompt' : 'Tạo mới Prompt'}
      headerSubtitle={`Thiết lập mẫu chỉ dẫn AI cho môn học ${subject?.code || ''}`}
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <Link href={`/lecturer/prompts/${subjectId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại danh sách
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="orange" className="font-mono text-xs">
              {subject?.code || subjectId}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center justify-between text-sm text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-xs">
              Đóng
            </Button>
          </div>
        )}

        {aiSuccessMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}

        {/* Quick Generator Assistant */}
        <Card className="p-5 bg-gradient-to-r from-orange-50/70 to-amber-50/70 dark:from-slate-900 dark:to-slate-800/80 border border-orange-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Bộ sinh chỉ dẫn nhanh theo chủ đề</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Dạng đề</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:bg-slate-900 dark:border-slate-700"
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as any)}
              >
                <option value="quiz">Trắc nghiệm</option>
                <option value="essay">Tự luận / Coding</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Số lượng câu</label>
              <Input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value) || 10)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Độ khó</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:bg-slate-900 dark:border-slate-700"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="Dễ">Dễ</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Khó">Khó</option>
                <option value="Rất khó">Rất khó</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Ngôn ngữ</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs dark:bg-slate-900 dark:border-slate-700 font-medium text-orange-600 dark:text-orange-400"
                value={promptLanguage}
                onChange={(e) => setPromptLanguage(e.target.value as any)}
              >
                <option value="vi">Tiếng Việt (VI)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Chủ đề bài học</label>
              <Input
                placeholder="VD: SQL Joins, OOP..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyConfigTemplate}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Sinh cấu trúc Prompt
          </Button>
        </Card>

        {/* Main Form */}
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Tên Prompt *</label>
                <Input
                  required
                  placeholder="VD: Đề trắc nghiệm DBI202 - SQL Subquery"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Phân loại</label>
                <Input
                  placeholder="VD: Quiz, Assignment, Lab..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nội dung Prompt chỉ dẫn AI *</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAiRefine}
                  disabled={isAiGenerating || !formData.templateContent.trim()}
                  className="text-xs gap-1.5 text-orange-600 border-orange-200 dark:border-orange-900/50"
                  isLoading={isAiGenerating}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Tối ưu hóa nội dung
                </Button>
              </div>
              <textarea
                required
                rows={12}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs dark:bg-slate-900 dark:border-slate-800"
                placeholder="Nhập nội dung chỉ dẫn chi tiết cho trợ giảng AI..."
                value={formData.templateContent}
                onChange={(e) => setFormData({ ...formData, templateContent: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link href={`/lecturer/prompts/${subjectId}`}>
                <Button variant="ghost" type="button">
                  Hủy
                </Button>
              </Link>
              <Button
                type="submit"
                isLoading={isSaving}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2 font-semibold shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isEditing ? 'Cập nhật Prompt' : 'Lưu Prompt'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
export default PromptCreateEditPage
