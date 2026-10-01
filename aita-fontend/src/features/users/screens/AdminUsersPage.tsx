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
import { usersApi } from '@/lib/api/modules/users'
import { classesApi } from '@/lib/api/modules/classes'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import * as XLSX from 'xlsx'
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  Lock,
  Unlock,
  Trash2,
  Mail,
  Shield,
  GraduationCap,
  School,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Edit,
} from 'lucide-react'

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [roleFilter, setRoleFilter] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const { isAuthenticated, loading: authLoading, role } = useAuth()
  const { t } = useLanguage()

  // Add User Modal
  const [addModal, setAddModal] = React.useState(false)
  const [formData, setFormData] = React.useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    code: '',
  })
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [modalError, setModalError] = React.useState<string | null>(null)

  const [importModal, setImportModal] = React.useState(false)
  const [importType, setImportType] = React.useState<'student'|'lecturer'|'assignment'>('student')
  const [importing, setImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Bulk Delete State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = React.useState(false)

  // Classes Management State for Edit Modal
  const [userClasses, setUserClasses] = React.useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = React.useState(false)
  const [deletedClasses, setDeletedClasses] = React.useState<string[]>([])
  const [addedClasses, setAddedClasses] = React.useState<string[]>([])
  const [availableClasses, setAvailableClasses] = React.useState<any[]>([])
  const [selectedClassToAdd, setSelectedClassToAdd] = React.useState('')

  // Bulk Edit Role Modal
  const [bulkRoleModal, setBulkRoleModal] = React.useState(false)
  const [bulkRole, setBulkRole] = React.useState<'STUDENT' | 'LECTURER' | 'ADMIN'>('STUDENT')
  const [updatingBulkRole, setUpdatingBulkRole] = React.useState(false)

  // Bulk Assign Class Modal
  const [bulkAssignModal, setBulkAssignModal] = React.useState(false)
  const [selectedClassToAssign, setSelectedClassToAssign] = React.useState('')
  const [assigningBulkClass, setAssigningBulkClass] = React.useState(false)

  // Dedicated 1 User -> Multiple Classes Assignment Modal
  const [assignUserModal, setAssignUserModal] = React.useState(false)
  const [assignTargetUser, setAssignTargetUser] = React.useState<any>(null)
  const [assignUserClasses, setAssignUserClasses] = React.useState<any[]>([])
  const [loadingAssignUserClasses, setLoadingAssignUserClasses] = React.useState(false)
  const [assignClassSearch, setAssignClassSearch] = React.useState('')
  const [assignSeasonFilter, setAssignSeasonFilter] = React.useState('all')
  const [selectedClassIdsToAssign, setSelectedClassIdsToAssign] = React.useState<string[]>([])
  const [savingUserClasses, setSavingUserClasses] = React.useState(false)
  const [assignUserError, setAssignUserError] = React.useState<string | null>(null)
  const [assignUserSuccess, setAssignUserSuccess] = React.useState<string | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const loadUsers = React.useCallback(async () => {
    if (authLoading || !isAuthenticated || role !== 'admin') return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await usersApi.getUsers(roleFilter, page, 50, search)
      const data = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || []
      setUsers(data)
    } catch (err: any) {
      console.error('Failed to load users:', err)
      setLoadError(err?.message || t('admin.users.load_error', 'Không thể kết nối máy chủ để tải danh sách người dùng.'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [authLoading, isAuthenticated, role, roleFilter, page, search, t])


  React.useEffect(() => {
    if (authLoading || !isAuthenticated || role !== 'admin') return
    loadUsers()
  }, [authLoading, isAuthenticated, role, loadUsers])

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError(null)
    try {
      if (editingUserId) {
        await usersApi.updateUser(editingUserId, {
          fullName: formData.fullName,
          email: formData.email,
          ...(formData.password ? { password: formData.password } : {}),
          role: formData.role.toUpperCase() as any,
          ...(formData.role.toUpperCase() === 'LECTURER' ? { lecturerCode: formData.code } : formData.role.toUpperCase() === 'STUDENT' ? { studentCode: formData.code } : {}),
          deletedClasses: deletedClasses,
          addedClasses: addedClasses,
        } as any)
      } else {
        await usersApi.createUser({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role.toUpperCase() as any,
          ...(formData.role.toUpperCase() === 'LECTURER' ? { lecturerCode: formData.code } : formData.role.toUpperCase() === 'STUDENT' ? { studentCode: formData.code } : {}),
        } as any)
      }
      setAddModal(false)
      setFormData({ fullName: '', email: '', password: '', role: 'STUDENT', code: '' })
      setEditingUserId(null)
      await loadUsers()
    } catch (err: any) {
      setModalError(err?.message || (editingUserId ? t('admin.users.update_error', 'Không thể cập nhật người dùng.') : t('admin.users.create_error', 'Không thể tạo người dùng.')))
    } finally {
      setSubmitting(false)
    }
  }

  const openCreateModal = () => {
    setEditingUserId(null)
    setFormData({ fullName: '', email: '', password: '', role: 'STUDENT', code: '' })
    setAddModal(true)
    setDeletedClasses([])
    setUserClasses([])
  }

  const openEditModal = async (u: any) => {
    setEditingUserId(u.id)
    setAddModal(true)
    setDeletedClasses([])
    setAddedClasses([])
    setUserClasses([])
    setLoadingDetails(true)

    if (availableClasses.length === 0) {
      classesApi.getClasses(1, 1000).then(setAvailableClasses).catch(() => [])
    }

    setFormData({
      fullName: u.name || u.fullName || u.FullName || '',
      email: u.email || u.Email || '',
      password: '',
      role: (u.role?.name || u.role || 'STUDENT').toUpperCase(),
      code: u.studentCode || u.StudentCode || u.lecturerCode || u.LecturerCode || '',
    })

    try {
      const details = await usersApi.getUser(u.id)
      const classes = details.role === 'student' ? details.enrolledClasses || [] : details.instructingClasses || []
      setUserClasses(classes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleToggleLock = async (user: any) => {
    const isLocked = String(user.status).toLowerCase() === 'locked'
    const action = isLocked ? t('admin.users.unlock', 'mở khóa') : t('admin.users.lock', 'khóa')
    if (!confirm(t('admin.users.confirm_lock', 'Bạn có chắc muốn {{action}} tài khoản {{email}}?').replace('{{action}}', action).replace('{{email}}', user.email))) return
    try {
      await usersApi.toggleUserLock(user.id, !isLocked)
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || t('ui.error_occurred', 'Thao tác thất bại.'))
    }
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(t('admin.users.confirm_delete', 'Bạn có chắc chắn muốn xóa tài khoản {{email}}?').replace('{{email}}', email))) return
    try {
      await usersApi.deleteUser(userId)
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || t('admin.users.delete_error', 'Không thể xóa người dùng.'))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(t('admin.users.confirm_bulk_delete', 'Bạn có chắc chắn muốn xóa {{count}} người dùng đã chọn? Thao tác này không thể hoàn tác.').replace('{{count}}', String(selectedIds.size)))) return
    setBulkDeleting(true)
    try {
      const res = await usersApi.bulkDeleteUsers(Array.from(selectedIds))
      alert(t('admin.users.bulk_delete_success', 'Đã xóa thành công {{deleted}} người dùng. Thất bại: {{failed}}.').replace('{{deleted}}', String(res.deleted?.length ?? 0)).replace('{{failed}}', String(res.failed?.length ?? 0)))
      setSelectedIds(new Set())
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || t('admin.users.delete_error', 'Không thể xóa người dùng.'))
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkUpdateRole = async () => {
    if (selectedIds.size === 0) return
    setUpdatingBulkRole(true)
    try {
      const ids = Array.from(selectedIds)
      await Promise.all(ids.map(id => usersApi.updateUser(id, { role: bulkRole } as any)))
      alert(t('admin.users.bulk_role_success', 'Đã cập nhật vai trò {{role}} cho {{count}} người dùng thành công!').replace('{{role}}', bulkRole).replace('{{count}}', String(ids.length)))
      setBulkRoleModal(false)
      setSelectedIds(new Set())
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || t('admin.users.role_update_error', 'Lỗi khi cập nhật vai trò.'))
    } finally {
      setUpdatingBulkRole(false)
    }
  }

  const handleOpenBulkAssign = async () => {
    setBulkAssignModal(true)
    if (availableClasses.length === 0) {
      try {
        const cls = await classesApi.getClasses(1, 1000)
        setAvailableClasses(cls || [])
        if (cls && cls.length > 0) setSelectedClassToAssign(cls[0].id)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleBulkAssignClass = async () => {
    if (!selectedClassToAssign || selectedIds.size === 0) return
    setAssigningBulkClass(true)
    try {
      const ids = Array.from(selectedIds)
      const usersToAssign = ids.map(id => users.find(u => u.id === id) || { id, role: 'STUDENT' })

      const results = await Promise.allSettled(
        usersToAssign.map(async u => {
          const roleStr = String((u as any).role?.name || (u as any).role || (u as any).Role || '').toUpperCase()
          if (roleStr === 'LECTURER') {
            return classesApi.updateClass(selectedClassToAssign, { lecturerId: u.id, keepExistingInstructors: true } as any)
          } else {
            return classesApi.enrollStudent(selectedClassToAssign, u.id)
          }
        })
      )

      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failedCount = results.filter(r => r.status === 'rejected').length

      alert(t('admin.users.bulk_assign_success', 'Đã phân công/gán lớp cho {{count}} người dùng thành công!').replace('{{count}}', String(successCount)))

      setBulkAssignModal(false)
      setSelectedIds(new Set())
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || t('admin.users.assign_class_error', 'Lỗi khi phân công lớp.'))
    } finally {
      setAssigningBulkClass(false)
    }
  }

  const openAssignUserModal = async (u: any) => {
    setAssignTargetUser(u)
    setAssignUserModal(true)
    setAssignUserError(null)
    setAssignUserSuccess(null)
    setSelectedClassIdsToAssign([])
    setLoadingAssignUserClasses(true)

    if (availableClasses.length === 0) {
      classesApi.getClasses(1, 1000).then(setAvailableClasses).catch(() => [])
    }

    try {
      const details = await usersApi.getUser(u.id)
      const roleStr = String(u.role?.name || u.role || 'STUDENT').toUpperCase()
      const classes = roleStr === 'STUDENT' ? (details.enrolledClasses || []) : (details.instructingClasses || [])
      setAssignUserClasses(classes)
    } catch (err: any) {
      console.error('Failed to load user classes:', err)
      setAssignUserError(err?.message || t('admin.users.load_user_classes_error', 'Không thể tải danh sách lớp hiện tại của người dùng.'))
    } finally {
      setLoadingAssignUserClasses(false)
    }
  }

  const handleSaveAssignUserClasses = async () => {
    if (!assignTargetUser || selectedClassIdsToAssign.length === 0) return
    setSavingUserClasses(true)
    setAssignUserError(null)
    setAssignUserSuccess(null)
    try {
      const roleStr = String(assignTargetUser.role?.name || assignTargetUser.role || 'STUDENT').toUpperCase()
      const results = await Promise.allSettled(
        selectedClassIdsToAssign.map(async (classId) => {
          if (roleStr === 'LECTURER') {
            return classesApi.updateClass(classId, { lecturerId: assignTargetUser.id, keepExistingInstructors: true } as any)
          } else {
            return classesApi.enrollStudent(classId, assignTargetUser.id)
          }
        })
      )

      const fulfilled = results.filter(r => r.status === 'fulfilled').length
      const rejected = results.filter(r => r.status === 'rejected').length

      if (rejected === 0) {
        setAssignUserSuccess(t('admin.users.assign_classes_user_success', 'Đã phân công thành công {{count}} lớp cho {{name}}!').replace('{{count}}', String(fulfilled)).replace('{{name}}', assignTargetUser.name || assignTargetUser.fullName || assignTargetUser.email))
      } else {
        setAssignUserError(t('admin.users.assign_classes_user_partial', 'Đã phân công {{fulfilled}} lớp thành công, {{rejected}} lớp gặp lỗi.').replace('{{fulfilled}}', String(fulfilled)).replace('{{rejected}}', String(rejected)))
      }

      // Reload user assigned classes
      const details = await usersApi.getUser(assignTargetUser.id)
      const classes = roleStr === 'STUDENT' ? (details.enrolledClasses || []) : (details.instructingClasses || [])
      setAssignUserClasses(classes)
      setSelectedClassIdsToAssign([])
      await loadUsers()
    } catch (err: any) {
      setAssignUserError(err?.message || t('admin.users.save_assign_error', 'Lỗi khi lưu phân công lớp.'))
    } finally {
      setSavingUserClasses(false)
    }
  }

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)

    let promise;
    if (importType === 'student') {
      promise = usersApi.importStudentsExcel(formData);
    } else if (importType === 'lecturer') {
      promise = usersApi.importLecturersExcel(formData);
    } else {
      promise = usersApi.importTeachingAssignmentsExcel(formData);
    }

    promise
      .then(res => {
        alert(t('admin.users.import_success', 'Đã nhập thành công {{count}} người dùng!').replace('{{count}}', String(res.successCount || 0)))
        setImportModal(false)
        loadUsers()
      })
      .catch(err => {
        alert(err?.message || t('admin.users.import_error', 'Import thất bại'))
      })
      .finally(() => {
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      })
  }

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={t('admin.users.header_title', 'Quản lý Người dùng')}
      headerSubtitle={t('admin.users.header_subtitle', 'Quản trị danh sách sinh viên, giảng viên và cán bộ quản trị')}
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              {t('admin.users.list_title', 'Danh sách tài khoản')} ({users.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelImport}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModal(true)}
              className="text-xs gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>{t('admin.users.import_btn', 'Nhập từ Excel')}</span>
            </Button>

            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkRoleModal(true)}
                  className="text-xs gap-1.5"
                >
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span>{t('admin.users.change_role_bulk', 'Đổi vai trò')} ({selectedIds.size})</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBulkAssign}
                  className="text-xs gap-1.5"
                >
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span>{t('admin.users.assign_class_bulk', 'Gán lớp')} ({selectedIds.size})</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  isLoading={bulkDeleting}
                  className="text-xs gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t('admin.users.delete_bulk', 'Xóa đã chọn')} ({selectedIds.size})</span>
                </Button>
              </>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="text-xs gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('admin.users.add_btn', 'Thêm người dùng')}</span>
            </Button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {['all', 'STUDENT', 'LECTURER', 'ADMIN'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize font-semibold ${
                  roleFilter === r
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {r === 'all' ? t('admin.users.filter_all', 'Tất cả') : r.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="w-full md:w-72">
            <Input
              type="text"
              placeholder={t('admin.users.search_placeholder', 'Tìm theo tên, email, mã số...')}
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Error State Banner */}
        {loadError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  {t('ui.error', 'Lỗi tải danh sách người dùng')}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                  {loadError}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadUsers}
              className="text-xs gap-1.5 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('ui.retry', 'Thử lại')}</span>
            </Button>
          </div>
        )}

        {/* Users Table */}
        {/* Modern Users List UI */}
        <div className="space-y-3">
          {/* List Header */}
          <div className="hidden lg:flex items-center justify-between px-6 py-3 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="w-10 text-center">
              <input 
                type="checkbox" 
                className="rounded border-slate-300"
                checked={users.length > 0 && selectedIds.size === users.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(new Set(users.map(u => u.id)))
                  } else {
                    setSelectedIds(new Set())
                  }
                }}
              />
            </div>
            <div className="w-1/4">{t('admin.users.col_name', 'Họ và tên')}</div>
            <div className="w-1/5">{t('admin.users.col_email', 'Email FPT')}</div>
            <div className="w-1/6">{t('admin.users.col_code', 'Mã số (MSSV/MSGV)')}</div>
            <div className="w-1/6">{t('admin.users.col_role', 'Vai trò')}</div>
            <div className="w-1/6">{t('admin.users.col_status', 'Trạng thái')}</div>
            <div className="w-1/12 text-right">{t('admin.users.col_action', 'Hành động')}</div>
          </div>

          {/* List Body */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              {t('ui.loading_users', 'Đang tải danh sách người dùng...')}
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              {t('admin.users.no_users', 'Không có người dùng nào phù hợp.')}
            </div>
          ) : (
            users.map((u: any) => {
              const roleName = String(u.role || u.Role || 'STUDENT').toUpperCase()
              const isLocked = String(u.status).toLowerCase() === 'locked'

              return (
                <div 
                  key={u.id} 
                  className="group flex flex-col lg:flex-row lg:items-center justify-between p-4 lg:px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all gap-4 lg:gap-0"
                >
                  {/* Checkbox */}
                  <div className="w-10 hidden lg:flex items-center justify-center shrink-0">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      checked={selectedIds.has(u.id)}
                      onChange={(e) => {
                        const next = new Set(selectedIds)
                        if (e.target.checked) next.add(u.id)
                        else next.delete(u.id)
                        setSelectedIds(next)
                      }}
                    />
                  </div>

                  {/* Name */}
                  <div className="w-full lg:w-1/4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-600 dark:text-orange-400 shrink-0">
                      {u.fullName?.charAt(0) || u.email?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-orange-500 transition-colors">
                        {u.fullName || t('admin.users.default_name', 'Người dùng')}
                      </h4>
                      <p className="text-xs text-slate-500 lg:hidden truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  
                  {/* Email (Hidden on small) */}
                  <div className="hidden lg:block w-full lg:w-1/5 text-xs text-slate-600 dark:text-slate-300 font-mono truncate pr-2">
                    {u.email}
                  </div>

                  {/* Code */}
                  <div className="w-full lg:w-1/6 flex items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {u.code || u.StudentCode || '—'}
                    </span>
                  </div>

                  {/* Role */}
                  <div className="w-full lg:w-1/6 flex items-center">
                    <Badge
                      variant={
                        roleName === 'ADMIN'
                          ? 'orange'
                          : roleName === 'LECTURER'
                          ? 'blue'
                          : 'default'
                      }
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {roleName}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="w-full lg:w-1/6 flex items-center">
                    <Badge variant={isLocked ? 'danger' : 'success'} className="text-[10px] bg-opacity-10">
                      {isLocked ? t('admin.users.status_locked', 'Đã khóa') : t('admin.users.status_active', 'Hoạt động')}
                    </Badge>
                  </div>

                  {/* Action */}
                  <div className="w-full lg:w-1/12 flex items-center justify-end gap-1">
                    <button
                      onClick={() => openAssignUserModal(u)}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                      title={t('admin.users.assign_classes_tooltip', 'Phân công lớp cho người dùng này')}
                    >
                      <School className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                      title={t('admin.users.edit_tooltip', 'Chỉnh sửa người dùng')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleLock(u)}
                      className={`p-2 rounded-xl transition-colors ${
                        isLocked 
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' 
                          : 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                      }`}
                      title={isLocked ? t('admin.users.unlock_tooltip', 'Mở khóa tài khoản') : t('admin.users.lock_tooltip', 'Khóa tài khoản')}
                    >
                      {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title={t('admin.users.delete_tooltip', 'Xóa người dùng')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {users.length > 0 && !loading && (
          <Pagination 
            page={page} 
            hasNext={users.length === 50} 
            loading={loading} 
            onChange={(nextPage) => setPage(nextPage)} 
          />
        )}

        {/* Create User Modal */}
        <Modal
          isOpen={addModal}
          onClose={() => setAddModal(false)}
          title={editingUserId ? t('admin.users.edit_modal_title', 'Chỉnh sửa tài khoản người dùng') : t('admin.users.modal_title', 'Tạo tài khoản người dùng mới')}
          description={editingUserId ? t('admin.users.edit_modal_desc', 'Cập nhật thông tin tài khoản người dùng.') : t('admin.users.modal_desc', 'Thêm tài khoản trực tiếp vào cơ sở dữ liệu AITA')}
        >
          <form onSubmit={handleSubmitUser} className="space-y-4">
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.users.form_fullname', 'Họ và tên đầy đủ')}</label>
              <Input
                type="text"
                placeholder={t('admin.users.default_name', 'Nguyễn Văn A')}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.users.form_email', 'Email FPT')}</label>
              <Input
                type="email"
                placeholder="user@fpt.edu.vn"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.users.form_role', 'Vai trò')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="STUDENT">{t('admin.users.role_student', 'Sinh viên (STUDENT)')}</option>
                  <option value="LECTURER">{t('admin.users.role_lecturer', 'Giảng viên (LECTURER)')}</option>
                  <option value="ADMIN">{t('admin.users.role_admin', 'Quản trị viên (ADMIN)')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.users.form_code', 'Mã số (MSSV / MSGV)')}</label>
                <Input
                  type="text"
                  placeholder="HE170001"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('admin.users.form_password', 'Mật khẩu khởi tạo')} {!editingUserId && <span className="text-rose-500">*</span>}
              </label>
              <Input
                type="password"
                placeholder={editingUserId ? t('admin.users.pwd_placeholder_edit', 'Bỏ trống nếu không đổi mật khẩu') : '••••••••'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUserId}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setAddModal(false)}>
                {t('ui.cancel', 'Hủy bỏ')}
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
                {editingUserId ? t('ui.save_changes', 'Lưu thay đổi') : t('admin.users.form_submit', 'Tạo tài khoản')}
              </Button>
            </div>

            {/* Class Management Section (Only when editing) */}
            {editingUserId && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand-500" />
                  {t('admin.users.joined_classes', 'Danh sách lớp học tham gia')}
                </h3>

                {/* Add to class picker */}
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
                    value={selectedClassToAdd}
                    onChange={(e) => setSelectedClassToAdd(e.target.value)}
                  >
                    <option value="">-- {t('admin.users.select_class_to_add', 'Chọn lớp để thêm')} --</option>
                    {availableClasses.map((ac) => (
                      <option key={ac.id} value={ac.id}>
                        {ac.code} - {ac.subjectName || ac.name || t('admin.classes.col_code', 'Lớp')}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    disabled={!selectedClassToAdd}
                    onClick={() => {
                      if (!selectedClassToAdd) return
                      const found = availableClasses.find(c => c.id === selectedClassToAdd)
                      if (found) {
                        setUserClasses(prev => [...prev, { classId: found.id, classCode: found.code, subjectName: found.subjectName }])
                        setAddedClasses(prev => [...prev, found.id])
                        setSelectedClassToAdd('')
                      }
                    }}
                  >
                    {t('admin.users.add_to_class', 'Thêm vào lớp')}
                  </Button>
                </div>
                
                {loadingDetails ? (
                  <p className="text-xs text-slate-500 text-center py-4">{t('admin.users.loading_classes', 'Đang tải dữ liệu lớp học...')}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {userClasses.filter(c => !deletedClasses.includes(c.classId)).map((c, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                        <div>
                          <p className="text-sm font-bold font-mono text-brand-600">{c.classCode}</p>
                          <p className="text-xs text-slate-500">{c.subjectName || c.subjectCode || t('admin.classes.col_subject', 'Môn học')}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          type="button" 
                          onClick={() => setDeletedClasses(prev => [...prev, c.classId])}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {userClasses.filter(c => !deletedClasses.includes(c.classId)).length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-4">{t('admin.users.no_classes_available', 'Không có lớp học nào.')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </Modal>

        {/* Bulk Role Modal */}
        <Modal isOpen={bulkRoleModal} onClose={() => setBulkRoleModal(false)} title={t('admin.users.change_role_title', `Change Role for ${selectedIds.size} Users`).replace('{{count}}', String(selectedIds.size))}>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.users.select_new_role', 'Select new role:')}</span>
              <select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
              >
                <option value="STUDENT">{t('admin.users.role_student', 'Student (STUDENT)')}</option>
                <option value="LECTURER">{t('admin.users.role_lecturer', 'Lecturer (LECTURER)')}</option>
                <option value="ADMIN">{t('admin.users.role_admin', 'Admin (ADMIN)')}</option>
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkRoleModal(false)}>{t('ui.cancel', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={handleBulkUpdateRole} isLoading={updatingBulkRole}>
                {t('admin.users.update_role_btn', 'Update Role')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Bulk Assign Class Modal */}
        <Modal isOpen={bulkAssignModal} onClose={() => setBulkAssignModal(false)} title={t('admin.users.bulk_assign_title', `Assign Class for ${selectedIds.size} Users`).replace('{{count}}', String(selectedIds.size))}>
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('admin.users.select_class', 'Select class:')}</span>
              <select
                value={selectedClassToAssign}
                onChange={(e) => setSelectedClassToAssign(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
              >
                {availableClasses.map((ac) => (
                  <option key={ac.id} value={ac.id}>
                    {ac.code} - {ac.subjectName || ac.name || t('admin.classes.title', 'Class')}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setBulkAssignModal(false)}>{t('ui.cancel', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={handleBulkAssignClass} isLoading={assigningBulkClass}>
                {t('admin.users.confirm_assign_btn', 'Confirm Class Assignment')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Dedicated 1 User -> Multiple Classes Assignment Modal */}
        <Modal
          isOpen={assignUserModal}
          onClose={() => !savingUserClasses && setAssignUserModal(false)}
          title={t('admin.users.assign_modal_title', `Assign Classes for ${assignTargetUser?.name || assignTargetUser?.fullName || assignTargetUser?.email || 'User'}`).replace('{{name}}', assignTargetUser?.name || assignTargetUser?.fullName || assignTargetUser?.email || t('admin.users.default_name', 'User'))}
          description={t('admin.users.assign_modal_desc', `Select classes to assign teaching or enrollment for ${String(assignTargetUser?.role?.name || assignTargetUser?.role || 'User').toUpperCase()}.`).replace('{{role}}', String(assignTargetUser?.role?.name || assignTargetUser?.role || 'STUDENT').toUpperCase())}
        >
          <div className="space-y-4 max-h-[75vh] flex flex-col">
            {/* User Info Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {assignTargetUser?.name || assignTargetUser?.fullName || t('admin.users.default_name', 'User')}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {assignTargetUser?.email}
                </div>
              </div>
              <Badge variant={String(assignTargetUser?.role?.name || assignTargetUser?.role || '').toUpperCase() === 'LECTURER' ? 'blue' : 'default'}>
                {String(assignTargetUser?.role?.name || assignTargetUser?.role || 'STUDENT').toUpperCase()}
              </Badge>
            </div>

            {/* Current Classes */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('admin.users.current_classes', `Currently assigned / enrolled classes (${assignUserClasses.length}):`).replace('{{count}}', String(assignUserClasses.length))}
              </span>
              {loadingAssignUserClasses ? (
                <div className="p-3 text-center text-xs text-slate-400">{t('admin.users.loading_current_classes', 'Loading current classes list...')}</div>
              ) : assignUserClasses.length === 0 ? (
                <div className="p-2 text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900/40 rounded-lg">
                  {t('admin.users.no_current_classes', 'Not enrolled in or assigned to any classes.')}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  {assignUserClasses.map((c: any) => (
                    <span key={c.id || c.classId || c.code} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-orange-600 dark:text-orange-400">{c.code || c.classCode}</span>
                      {c.subjectName && <span className="text-slate-500 text-[10px]">({c.subjectName})</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Success Banner */}
            {assignUserSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{assignUserSuccess}</span>
              </div>
            )}

            {/* Error Banner */}
            {assignUserError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{assignUserError}</span>
              </div>
            )}

            {/* Class Selection Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('admin.users.select_classes_to_add', 'Select classes to assign:')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const selectableIds = availableClasses
                        .filter((c: any) => {
                          if (assignSeasonFilter !== 'all') {
                            const rawSem = c.semesterSeason || (c.semester && typeof c.semester === 'object' ? c.semester.season || c.semester.code || c.semester.label : c.semester) || ''
                            const sem = String(rawSem)
                            if (!sem.toLowerCase().includes(assignSeasonFilter.toLowerCase())) return false
                          }
                          if (assignClassSearch.trim()) {
                            const q = assignClassSearch.toLowerCase().trim()
                            const code = (c.code || '').toLowerCase()
                            const sName = (c.subjectName || c.name || '').toLowerCase()
                            if (!code.includes(q) && !sName.includes(q)) return false
                          }
                          return true
                        })
                        .map((c: any) => c.id)
                      setSelectedClassIdsToAssign(selectableIds)
                    }}
                    className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline font-semibold"
                  >
                    {t('admin.users.select_all', 'Select All')}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClassIdsToAssign([])}
                    className="text-[11px] text-slate-500 hover:underline font-semibold"
                  >
                    {t('admin.users.deselect_all', 'Deselect All')}
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="text"
                  placeholder={t('admin.users.search_class_placeholder', 'Search by class code, subject...')}
                  value={assignClassSearch}
                  onChange={(e) => setAssignClassSearch(e.target.value)}
                  className="h-8 text-xs"
                />
                <select
                  value={assignSeasonFilter}
                  onChange={(e) => setAssignSeasonFilter(e.target.value)}
                  className="h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="all">{t('admin.users.all_semesters', 'All Semesters')}</option>
                  {Array.from(new Set(availableClasses.map((c: any) => {
                    const rawSem = c.semesterSeason || (c.semester && typeof c.semester === 'object' ? c.semester.season || c.semester.code || c.semester.label : c.semester) || ''
                    return String(rawSem)
                  }).filter(Boolean))).map((s: any) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Checkbox List */}
              <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1 bg-white dark:bg-slate-900">
                {availableClasses
                  .filter((c: any) => {
                    if (assignSeasonFilter !== 'all') {
                      const rawSem = c.semesterSeason || (c.semester && typeof c.semester === 'object' ? c.semester.season || c.semester.code || c.semester.label : c.semester) || ''
                      const sem = String(rawSem)
                      if (!sem.toLowerCase().includes(assignSeasonFilter.toLowerCase())) return false
                    }
                    if (assignClassSearch.trim()) {
                      const q = assignClassSearch.toLowerCase().trim()
                      const code = (c.code || '').toLowerCase()
                      const sName = (c.subjectName || c.name || '').toLowerCase()
                      if (!code.includes(q) && !sName.includes(q)) return false
                    }
                    return true
                  })
                  .map((c: any) => {
                    const isAlreadyAssigned = assignUserClasses.some((ac: any) => (ac.classId || ac.id) === c.id || ac.code === c.code || ac.classCode === c.code)
                    const isSelected = selectedClassIdsToAssign.includes(c.id)

                    return (
                      <label
                        key={c.id}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassIdsToAssign(prev => [...prev, c.id])
                              } else {
                                setSelectedClassIdsToAssign(prev => prev.filter(id => id !== c.id))
                              }
                            }}
                          />
                          <div className="min-w-0 truncate">
                            <span className="font-mono font-bold text-slate-900 dark:text-white mr-1.5">{c.code}</span>
                            <span className="text-slate-500 truncate">{c.subjectName || c.name || t('admin.classes.title', 'Class')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {c.semesterSeason && (
                            <span className="text-[10px] text-slate-400 font-mono">{c.semesterSeason}</span>
                          )}
                          {isAlreadyAssigned && (
                            <Badge variant="success" className="text-[9px] px-1.5 py-0.5">{t('admin.users.assigned_badge', 'Assigned')}</Badge>
                          )}
                        </div>
                      </label>
                    )
                  })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                {t('admin.users.selected_count', `Selected: ${selectedClassIdsToAssign.length} classes`).replace('{{count}}', String(selectedClassIdsToAssign.length)).split(String(selectedClassIdsToAssign.length)).map((part, i, arr) => i < arr.length - 1 ? <React.Fragment key={i}>{part}<strong className="text-orange-600 dark:text-orange-400">{selectedClassIdsToAssign.length}</strong></React.Fragment> : part)}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignUserModal(false)} disabled={savingUserClasses}>
                  {t('ui.close', 'Close')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAssignUserClasses}
                  isLoading={savingUserClasses}
                  disabled={selectedClassIdsToAssign.length === 0}
                >
                  {t('admin.users.confirm_assign_count', `Confirm Assign (${selectedClassIdsToAssign.length}) Classes`).replace('{{count}}', String(selectedClassIdsToAssign.length))}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
        
        {/* Import Modal */}
        <Modal isOpen={importModal} onClose={() => !importing && setImportModal(false)} title={t('admin.users.import_modal_title', 'Import Data from Excel')}>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{t('admin.users.import_select_type', 'Select the data type you want to import:')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setImportType('student')}
                className={`p-3 rounded-xl border text-sm text-left transition-all ${importType === 'student' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-800 hover:border-brand-500/50'}`}
              >
                <div className="font-bold mb-1">{t('admin.users.role_student', 'Student (STUDENT)').split(' (')[0]}</div>
                <div className="text-xs text-slate-500">{t('admin.users.import_student_desc', 'Student ID, Full Name, Email, Major, ...')}</div>
              </button>
              <button
                onClick={() => setImportType('lecturer')}
                className={`p-3 rounded-xl border text-sm text-left transition-all ${importType === 'lecturer' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-800 hover:border-brand-500/50'}`}
              >
                <div className="font-bold mb-1">{t('admin.users.role_lecturer', 'Lecturer (LECTURER)').split(' (')[0]}</div>
                <div className="text-xs text-slate-500">{t('admin.users.import_lecturer_desc', 'Lecturer ID, Full Name, Email, Department, ...')}</div>
              </button>
              <button
                onClick={() => setImportType('assignment')}
                className={`p-3 rounded-xl border text-sm text-left transition-all ${importType === 'assignment' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'border-slate-200 dark:border-slate-800 hover:border-brand-500/50'}`}
              >
                <div className="font-bold mb-1">{t('admin.users.import_assign_title', 'Class Assignment')}</div>
                <div className="text-xs text-slate-500">{t('admin.users.import_assign_desc', 'Assign students/lecturers into classes')}</div>
              </button>
            </div>

            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-xs space-y-2">
              <p>{t('admin.users.import_note', 'Note: Please ensure the Excel file (.xlsx) strictly conforms to the required column schema.')}</p>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setImportModal(false)}>
                {t('ui.cancel', 'Cancel')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={importing}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('admin.users.upload_excel_btn', 'Proceed to Upload File')}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
