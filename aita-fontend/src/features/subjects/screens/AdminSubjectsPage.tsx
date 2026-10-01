'use client'

import * as React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/feedback'
import { subjectsApi } from '@/lib/api/modules/subjects'
import { Library, Plus, Search, Trash2, Edit } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'
import Link from 'next/link'

export default function AdminSubjectsPage() {
  const { t } = useLanguage()
  const [subjects, setSubjects] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({
    code: '',
    name: '',
    credit: 3,
    description: '',
  })
  const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(null)

  const loadSubjects = React.useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await subjectsApi.getSubjects(page, 50, search)
      setSubjects(Array.isArray(res) ? res : res?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  React.useEffect(() => {
    const handler = setTimeout(() => {
      loadSubjects()
    }, 300)
    return () => clearTimeout(handler)
  }, [loadSubjects])

  const handleSubmitSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSubjectId) {
        await subjectsApi.updateSubject(editingSubjectId, formData as any)
      } else {
        await subjectsApi.createSubject(formData as any)
      }
      setModalOpen(false)
      setFormData({ code: '', name: '', credit: 3, description: '' })
      setEditingSubjectId(null)
      await loadSubjects()
    } catch (err: any) {
      alert(err?.message || (editingSubjectId ? 'Lỗi khi cập nhật môn học.' : t('admin.subjects.create_error', 'Lỗi khi tạo môn học.')))
    }
  }

  const openCreateModal = () => {
    setEditingSubjectId(null)
    setFormData({ code: '', name: '', credit: 3, description: '' })
    setModalOpen(true)
  }

  const openEditModal = (s: any) => {
    setEditingSubjectId(s.id)
    setFormData({
      code: s.code || s.SubjectCode || '',
      name: s.name || s.SubjectName || '',
      credit: s.credit ?? 0,
      description: s.description || '',
    })
    setModalOpen(true)
  }

  const handleDeleteSubject = async (id: string, code: string) => {
    if (!confirm(t('admin.subjects.confirm_delete', 'Bạn có chắc muốn xóa môn {{code}}?').replace('{{code}}', code))) return
    try {
      await subjectsApi.deleteSubject(id)
      await loadSubjects()
    } catch (err: any) {
      alert(err?.message || t('admin.subjects.delete_error', 'Lỗi khi xóa môn.'))
    }
  }

  // Client filtering removed as we use server-side search

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.subjects.header_title', 'Quản lý Môn học')}
      headerSubtitle={t('admin.subjects.header_subtitle', 'Quản lý chương trình đào tạo, mã môn và số tín chỉ')}
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Library className="w-5 h-5 text-orange-400" />
              {t('admin.subjects.list_title', 'Môn học trong hệ thống')} ({subjects.length})
            </h2>
          </div>

          <Button variant="primary" size="sm" onClick={openCreateModal} className="gap-1.5 text-xs">
            <Plus className="w-4 h-4" />
            <span>{t('admin.subjects.add_btn', 'Thêm môn học mới')}</span>
          </Button>
        </div>

        <div className="w-full max-w-sm">
          <Input
            type="text"
            placeholder={t('admin.subjects.search_placeholder', 'Tìm theo mã môn, tên môn...')}
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Modern Subjects List UI */}
        <div className="space-y-3">
          {/* List Header */}
          <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="w-1/6">{t('admin.subjects.col_code', 'Mã môn')}</div>
            <div className="w-1/3">{t('admin.subjects.col_name', 'Tên môn học')}</div>
            <div className="w-1/6">{t('admin.subjects.col_credits', 'Số tín chỉ')}</div>
            <div className="w-1/4">{t('admin.subjects.col_desc', 'Mô tả')}</div>
            <div className="w-1/12 text-right">{t('admin.subjects.col_action', 'Hành động')}</div>
          </div>

          {/* List Body */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              {t('admin.subjects.loading', 'Đang tải danh sách môn học...')}
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              {t('admin.subjects.no_subjects', 'Không tìm thấy môn học nào phù hợp.')}
            </div>
          ) : (
            subjects.map((s: any) => (
              <div 
                key={s.id} 
                className="group flex flex-col lg:flex-row lg:items-center justify-between p-4 lg:px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all gap-4 lg:gap-0"
              >
                {/* Code */}
                <div className="w-full lg:w-1/6 flex items-center">
                  <Badge variant="orange" className="text-xs px-3 py-1 font-mono">
                    {s.code || s.SubjectCode}
                  </Badge>
                </div>
                
                {/* Name */}
                <div className="w-full lg:w-1/3 pr-4">
                  <Link href={`/admin/subjects/${s.id}`} className="block">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors">
                      {s.name || s.SubjectName}
                    </h4>
                  </Link>
                </div>

                {/* Credits */}
                <div className="w-full lg:w-1/6 flex items-center">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {s.credit ?? 0} {t('admin.subjects.credits_unit', 'Tín chỉ')}
                  </span>
                </div>

                {/* Description */}
                <div className="w-full lg:w-1/4 pr-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {s.description || 'Chương trình đào tạo kỹ thuật phần mềm FPT.'}
                  </p>
                </div>

                {/* Action */}
                <div className="w-full lg:w-1/12 flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    title="Chỉnh sửa môn học"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(s.id, s.code || s.SubjectCode)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Xóa môn học"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {subjects.length > 0 && !loading && (
          <Pagination 
            page={page} 
            hasNext={subjects.length === 50} 
            loading={loading} 
            onChange={(nextPage) => setPage(nextPage)} 
          />
        )}

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSubjectId ? 'Chỉnh Sửa Môn Học' : t('admin.subjects.modal_title', 'Thêm Môn Học Mới')}
          description={editingSubjectId ? 'Cập nhật thông tin chi tiết của môn học' : t('admin.subjects.modal_desc', 'Khai báo môn học vào hệ thống đào tạo Đại học FPT')}
        >
          <form onSubmit={handleSubmitSubject} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.subjects.form_code', 'Mã môn (Subject Code)')}</label>
                <Input
                  type="text"
                  placeholder="Ví dụ: SWD392"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.subjects.form_credits', 'Số tín chỉ')}</label>
                <Input
                  type="number"
                  value={formData.credit}
                  onChange={(e) => setFormData({ ...formData, credit: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.subjects.form_name', 'Tên môn học')}</label>
              <Input
                type="text"
                placeholder="Ví dụ: Software Architecture and Design"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.subjects.form_desc', 'Mô tả giáo trình')}</label>
              <textarea
                rows={3}
                placeholder={t('admin.subjects.form_desc_placeholder', 'Mô tả mục tiêu môn học...')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
                {t('ui.cancel', 'Hủy bỏ')}
              </Button>
              <Button variant="primary" size="sm" type="submit">
                {t('admin.subjects.form_submit', 'Lưu môn học')}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
