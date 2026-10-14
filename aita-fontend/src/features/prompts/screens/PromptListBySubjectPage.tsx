'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
import {
  ArrowLeft,
  Plus,
  Search,
  Edit3,
  Trash2,
  Bot,
  Tag,
  Copy,
  Check,
  Eye,
  Terminal,
  Sparkles,
  Sliders,
  X,
  BookOpen
} from 'lucide-react'

export function PromptListBySubjectPage() {
  const params = useParams()
  const router = useRouter()
  const subjectId = (params?.subjectId as string) || ''

  const [prompts, setPrompts] = useState<PromptTemplate[]>([])
  const [subject, setSubject] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  useEffect(() => {
    if (!subjectId) return

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [promptsData, subjectsData] = await Promise.all([
          promptsApi.getPromptTemplates(subjectId).catch(() => []),
          subjectsApi.getSubjects(1, 1000).catch(() => [])
        ])

        setPrompts(Array.isArray(promptsData) ? promptsData : [])
        const subList = Array.isArray(subjectsData) ? subjectsData : ((subjectsData as any)?.data || [])
        const currentSub = subList.find((s: any) => s.id === subjectId || s.code?.toLowerCase() === subjectId.toLowerCase())
        setSubject(currentSub || { id: subjectId, name: subjectId, code: subjectId })
      } catch (err) {
        console.error('Failed to load prompts for subject:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [subjectId])

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa prompt "${name}"?`)) return
    try {
      await promptsApi.deletePromptTemplate(id)
      setPrompts(prompts.filter((p) => p.id !== id))
      setToastMessage('Đã xóa prompt thành công')
    } catch (err: any) {
      alert(err?.message || 'Không thể xóa prompt')
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setToastMessage('Đã sao chép nội dung prompt vào clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const q = searchQuery.toLowerCase()
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.templateContent && p.templateContent.toLowerCase().includes(q))
      )
    })
  }, [prompts, searchQuery])

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel="Giảng viên"
      requiredRole="lecturer"
      headerTitle={`Thư viện Prompt - ${subject?.code || subjectId}`}
      headerSubtitle={`Quản lý và tinh chỉnh các mẫu chỉ dẫn AI cho môn học ${subject?.name || ''}`}
    >
      <div className="space-y-6 w-full pb-12">
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/lecturer/subjects">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                DS Môn học
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-6 h-6 text-orange-500" />
                <span>{subject?.name || subjectId}</span>
                <Badge variant="orange" className="font-mono text-xs">
                  {subject?.code || subjectId}
                </Badge>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Tìm kiếm prompt..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Link href={`/lecturer/prompts/${subjectId}/create`}>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs">
                <Plus className="w-4 h-4" />
                Tạo prompt mới
              </Button>
            </Link>
          </div>
        </div>

        {/* List of prompts */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Đang tải danh sách prompt...</div>
        ) : filteredPrompts.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Bot className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Chưa có prompt nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Hãy tạo các mẫu prompt cho môn học này để trợ giảng AI sinh đề thi và chấm điểm chuẩn xác nhất.
            </p>
            <Link href={`/lecturer/prompts/${subjectId}/create`}>
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs">
                <Plus className="w-4 h-4" />
                Tạo prompt đầu tiên
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPrompts.map((p) => (
              <Card
                key={p.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{p.name}</h3>
                    <Badge variant="outline" className="text-[11px] shrink-0">
                      {p.category || 'Chung'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-4 font-mono bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
                    {p.templateContent}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-slate-500 hover:text-slate-800 gap-1"
                      onClick={() => handleCopy(p.id, p.templateContent)}
                    >
                      {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === p.id ? 'Đã chép' : 'Sao chép'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-slate-500 hover:text-slate-800 gap-1"
                      onClick={() => setSelectedPrompt(p)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link href={`/lecturer/prompts/${subjectId}/edit/${p.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs h-8 text-blue-600 hover:text-blue-700">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-slate-400 hover:text-rose-600"
                      onClick={() => handleDelete(p.id, p.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* View Modal */}
        {selectedPrompt && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-orange-500" />
                  {selectedPrompt.name}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPrompt(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge variant="outline">{selectedPrompt.category || 'Chung'}</Badge>
                  <span>Môn: {subject?.code}</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {selectedPrompt.templateContent}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(selectedPrompt.id, selectedPrompt.templateContent)}
                  className="gap-1.5 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép
                </Button>
                <Button size="sm" onClick={() => setSelectedPrompt(null)} className="text-xs">
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
export default PromptListBySubjectPage
