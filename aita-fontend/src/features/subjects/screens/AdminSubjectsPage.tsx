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
import { Library, Plus, Search, Trash2, Edit, BookOpen, Sparkles, Award, FileText, CheckCircle2 } from 'lucide-react'
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

  // Calculate KPI metrics
  const totalCredits = subjects.reduce((sum: number, s: any) => sum + (s.credit ?? 0), 0)
  const syllabusCount = subjects.filter((s: any) => Boolean(s.description)).length

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
        {/* ── 1. SIGNATURE EXECUTIVE KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Tổng môn học */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng Môn Học
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Library className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : subjects.length}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Chương trình Đại học FPT</span>
            </div>
          </div>

          {/* KPI 2: Tổng tín chỉ tích lũy */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng Số Tín Chỉ
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : totalCredits}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Trung bình 3.0 tín chỉ / môn</span>
            </div>
          </div>

          {/* KPI 3: Đã cập nhật giáo trình */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã Có Barem & Đề Cương
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {loading ? '…' : syllabusCount}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>Chuẩn Rubric kiểm định</span>
            </div>
          </div>

          {/* KPI 4: Chuyên ngành đào tạo */}
          <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Khối Chuyên Ngành
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              5
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>SE • IA • AI • IS • GD</span>
            </div>
          </div>
        </div>

        {/* ── 2. TOOLBAR: SEARCH & ACTIONS ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-orange-600" />
              {t('admin.subjects.list_title', 'Danh mục môn học')}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Quản lý khung chương trình, số tín chỉ và giáo trình đào tạo
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Input
              type="text"
              placeholder={t('admin.subjects.search_placeholder', 'Tìm theo mã môn, tên môn...')}
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 text-xs focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
            <Button
              size="sm"
              onClick={openCreateModal}
              className="shrink-0 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 shadow-orange-500/25 text-white font-bold rounded-2xl h-10 px-5 text-xs gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('admin.subjects.add_btn', 'Thêm môn học mới')}</span>
            </Button>
          </div>
        </div>

        {/* ── 3. MODERN SUBJECTS LIST UI ── */}
        <div className="space-y-3">
          {/* List Header */}
          <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
            <div className="w-1/6">{t('admin.subjects.col_code', 'Mã môn')}</div>
            <div className="w-1/3">{t('admin.subjects.col_name', 'Tên môn học')}</div>
            <div className="w-1/6">{t('admin.subjects.col_credits', 'Số tín chỉ')}</div>
            <div className="w-1/4">{t('admin.subjects.col_desc', 'Mô tả')}</div>
            <div className="w-1/12 text-right">{t('admin.subjects.col_action', 'Hành động')}</div>
          </div>

          {/* List Body */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              {t('admin.subjects.loading', 'Đang tải danh sách môn học...')}
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              {t('admin.subjects.no_subjects', 'Không tìm thấy môn học nào phù hợp.')}
            </div>
          ) : (
            subjects.map((s: any) => (
              <div 
                key={s.id} 
                className="group flex flex-col lg:flex-row lg:items-center justify-between p-4 lg:px-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all gap-4 lg:gap-0"
              >
                {/* Code */}
                <div className="w-full lg:w-1/6 flex items-center">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                    {s.code || s.SubjectCode}
                  </span>
                </div>
                
                {/* Name */}
                <div className="w-full lg:w-1/3 pr-4">
                  <Link href={`/admin/subjects/${s.id}`} className="block">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-[#FA7014] transition-colors">
                      {s.name || s.SubjectName}
                    </h4>
                  </Link>
                </div>

                {/* Credits */}
                <div className="w-full lg:w-1/6 flex items-center">
                  <span className="text-xs text-slate-800 dark:text-slate-200 font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {s.credit ?? 0} {t('admin.subjects.credits_unit', 'Tín chỉ')}
                  </span>
                </div>

                {/* Description */}
                <div className="w-full lg:w-1/4 pr-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {s.description || 'Chương trình đào tạo kỹ thuật phần mềm FPT.'}
                  </p>
                </div>

                {/* Action */}
                <div className="w-full lg:w-1/12 flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-2 rounded-xl text-slate-400 hover:text-[#FA7014] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Chỉnh sửa môn học"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(s.id, s.code || s.SubjectCode)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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

        {/* ── 4. MODAL WITH LIVE SUBJECT PREVIEW ── */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          maxWidth="4xl"
          title={
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-50 text-[#FA7014] dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">{editingSubjectId ? 'Chỉnh Sửa Môn Học' : t('admin.subjects.modal_title', 'Thêm Môn Học Mới')}</span>
            </div>
          }
          description={editingSubjectId ? 'Cập nhật thông tin chi tiết của môn học với bản xem trước trực quan' : t('admin.subjects.modal_desc', 'Khai báo môn học vào hệ thống đào tạo Đại học FPT')}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column (7 cols) */}
            <form onSubmit={handleSubmitSubject} className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">{t('admin.subjects.form_code', 'Mã môn (Subject Code)')} <span className="text-rose-500">*</span></label>
                  <Input
                    type="text"
                    placeholder="Ví dụ: SWD392"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    className="font-mono text-xs focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">{t('admin.subjects.form_credits', 'Số tín chỉ')} <span className="text-rose-500">*</span></label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.credit}
                    onChange={(e) => setFormData({ ...formData, credit: Number(e.target.value) })}
                    required
                    className="text-xs focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">{t('admin.subjects.form_name', 'Tên môn học')} <span className="text-rose-500">*</span></label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Software Architecture and Design"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="text-xs focus:border-[#FA7014] rounded-xl border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900 dark:text-slate-200">{t('admin.subjects.form_desc', 'Mô tả giáo trình')}</label>
                <textarea
                  rows={4}
                  placeholder={t('admin.subjects.form_desc_placeholder', 'Mô tả mục tiêu môn học, nội dung cốt lõi và chuẩn đầu ra...')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FA7014]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)} className="text-xs rounded-xl font-bold">
                  {t('ui.cancel', 'Hủy bỏ')}
                </Button>
                <Button size="sm" type="submit" variant="primary">
                  {t('admin.subjects.form_submit', 'Lưu môn học')}
                </Button>
              </div>
            </form>

            {/* Live Subject Card Preview (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold tracking-wider text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FA7014]" />
                  Thẻ Giáo Trình Trực Quan
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live View
                </span>
              </div>

              {/* Subject Card Preview */}
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="p-4 bg-[#FA7014] text-white relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">FPT SYLLABUS</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-bold backdrop-blur-sm flex items-center gap-1">
                      <Award className="w-3 h-3 text-white" />
                      {formData.credit || 3} Tín chỉ
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white mt-2 font-mono">
                    {formData.code.trim() || 'SUBJ_CODE'}
                  </h3>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-slate-500">Tên học phần</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {formData.name.trim() || 'Tên môn học đào tạo'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-semibold text-slate-500">Mục tiêu & Chuẩn đầu ra</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                      {formData.description.trim() || 'Chưa có mô tả giáo trình. Nhập nội dung bên cạnh để xem trước chuẩn đầu ra của môn học.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Chuẩn đào tạo FPT
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      SYS • VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center italic">
                Xem trước giao diện giáo trình sẽ hiển thị trong danh mục môn học của sinh viên và giảng viên.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
