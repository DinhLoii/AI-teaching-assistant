'use client'

import * as React from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LECTURER_NAV } from '@/config/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { classesApi } from '@/lib/api/modules/classes'
import { Library, BookOpen, Bot, Search, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

export default function LecturerSubjectsPage() {
  const { t } = useLanguage()
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [teachingSubjectCodes, setTeachingSubjectCodes] = React.useState<Set<string>>(new Set())
  const [filterMode, setFilterMode] = React.useState<'teaching' | 'all'>('teaching')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subsRes, clsRes] = await Promise.all([
        subjectsApi.getSubjects(1, 1000),
        classesApi.getClasses(1, 1000).catch(() => []),
      ])

      const subList = Array.isArray(subsRes) ? subsRes : (subsRes as any)?.data || []
      setSubjects(subList)

      const codes = new Set<string>()
      if (Array.isArray(clsRes)) {
        clsRes.forEach((c: any) => {
          const code = c.subject?.code || c.subjectCode
          if (code) codes.add(code.toLowerCase())
        })
      }
      setTeachingSubjectCodes(codes)

      // If lecturer has no assigned classes yet, default to all
      if (codes.size === 0) {
        setFilterMode('all')
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách môn học. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredSubjects = React.useMemo(() => {
    return subjects.filter((sub: any) => {
      const code = (sub.code || sub.SubjectCode || '').toLowerCase()
      const name = (sub.name || sub.SubjectName || '').toLowerCase()
      const q = searchQuery.toLowerCase().trim()

      const matchesSearch = !q || code.includes(q) || name.includes(q)
      if (!matchesSearch) return false

      if (filterMode === 'teaching' && teachingSubjectCodes.size > 0) {
        return teachingSubjectCodes.has(code)
      }
      return true
    })
  }, [subjects, teachingSubjectCodes, filterMode, searchQuery])

  return (
    <DashboardLayout
      navItems={LECTURER_NAV}
      title="AITA Lecturer"
      roleLabel={t('profile.role_lecturer', 'Giảng viên')}
      requiredRole="lecturer"
      headerTitle={t('lecturer.subjects.header_title', 'Môn học giảng dạy')}
      headerSubtitle={t('lecturer.subjects.header_subtitle', 'Tài liệu đào tạo, barem Rubric tiêu chuẩn và ngân hàng câu hỏi')}
    >
      <div className="space-y-6 w-full pb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Library className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            {t('lecturer.subjects.list_title', 'Môn học trong hệ thống')} ({filteredSubjects.length})
          </h2>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {teachingSubjectCodes.size > 0 && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('teaching')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterMode === 'teaching'
                      ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t('lecturer.subjects.teaching_tab', 'Đang giảng dạy')} ({teachingSubjectCodes.size})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    filterMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t('lecturer.subjects.all_tab', 'Tất cả môn')} ({subjects.length})
                </button>
              </div>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder={t('lecturer.subjects.search_placeholder', 'Tìm mã hoặc tên môn...')}
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between text-sm text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadData()} className="text-xs">
              {t('ui.retry', 'Thử lại')}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            {t('lecturer.subjects.loading', 'Đang tải danh sách môn học...')}
          </div>
        ) : filteredSubjects.length === 0 ? (
          <Card className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Library className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{t('lecturer.subjects.not_found', 'Không tìm thấy môn học')}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery ? t('lecturer.subjects.empty_search', 'Không có môn học nào khớp với từ khóa tìm kiếm.') : t('lecturer.subjects.empty_list', 'Chưa có môn học nào được cấu hình.')}
            </p>
            {searchQuery && (
              <Button size="sm" variant="outline" onClick={() => setSearchQuery('')} className="text-xs">
                {t('lecturer.subjects.clear_filter', 'Xóa bộ lọc')}
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((sub: any) => {
              const code = sub.code || sub.SubjectCode
              const isTeaching = teachingSubjectCodes.has(code?.toLowerCase())
              const credits = sub.credit ?? sub.credits ?? 3

              return (
                <Card
                  key={sub.id}
                  className="p-6 hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="orange" className="font-mono text-xs">
                          {code}
                        </Badge>
                        {isTeaching && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                            {t('lecturer.subjects.teaching_badge', 'Đang dạy')}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {credits} {t('admin.subjects.credits_unit', 'Tín chỉ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {sub.name || sub.SubjectName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {sub.description || t('lecturer.subjects.default_desc', 'Chương trình kỹ thuật phần mềm FPT University.')}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    <Link href={`/lecturer/subjects/${sub.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Syllabus</span>
                      </Button>
                    </Link>
                    <Link href={`/lecturer/prompts/${sub.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 gap-1">
                        <Bot className="w-3.5 h-3.5" />
                        <span>{t('lecturer.subjects.config_prompt_btn', 'Cấu hình Prompt')}</span>
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
