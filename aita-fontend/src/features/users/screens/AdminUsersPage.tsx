'use client'

import { RefreshAction } from '@/components/actions/RefreshAction'

import * as React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ADMIN_NAV } from '@/config/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnchoredMenu } from '@/components/ui/anchored-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/feedback'
import { usersApi } from '@/lib/api/modules/users'
import { classesApi } from '@/lib/api/modules/classes'
import { getAvailableAcademicSeasons } from '@/lib/seasons'
import { cn, formatDate } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import { useSearchParams } from 'next/navigation'
import {
  User,
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
  Eye,
  Phone,
  Building,
  Sparkles,
  MapPin,
  CreditCard,
  QrCode,
  Fingerprint,
  UserCheck,
  Briefcase,
  BookOpen,
  ChevronRight,
  Filter,
  X,
  Layers,
  Check,
  Plus,
  MoreVertical,
} from 'lucide-react'

// Facebook-style anonymous avatar or profile image in neutral circle frame
function AnonymousAvatar({
  src,
  alt,
  size = 'md',
  className,
}: {
  src?: string | null
  alt?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setHasError(false)
  }, [src])

  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }[size]

  const iconDimensions = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  }[size]

  return (
    <div
      className={cn(
        dimensions,
        'rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden',
        className
      )}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt || 'Avatar'}
          className="w-full h-full object-cover rounded-full"
          onError={() => setHasError(true)}
        />
      ) : (
        <User className={cn(iconDimensions, 'text-slate-400 dark:text-slate-500 fill-slate-300/80 dark:fill-slate-600')} />
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')

  const [users, setUsers] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [roleFilter, setRoleFilter] = React.useState(roleParam ? roleParam.toUpperCase() : 'STUDENT')
  const [cohortFilter, setCohortFilter] = React.useState('all')
  const [majorFilter, setMajorFilter] = React.useState('all')
  const [campusFilter, setCampusFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'locked'>('all')
  const [teachingStatusFilter, setTeachingStatusFilter] = React.useState<'all' | 'assigned' | 'unassigned'>('all')
  const [availableClasses, setAvailableClasses] = React.useState<any[]>([])
  const [selectedLecturerDetail, setSelectedLecturerDetail] = React.useState<any | null>(null)
  const [lecturerDetailModal, setLecturerDetailModal] = React.useState(false)
  const [unassigningClassId, setUnassigningClassId] = React.useState<string | null>(null)
  const [selectedStudentDetail, setSelectedStudentDetail] = React.useState<any | null>(null)
  const [studentDetailModal, setStudentDetailModal] = React.useState(false)
  const [studentClasses, setStudentClasses] = React.useState<any[]>([])
  const [loadingStudentClasses, setLoadingStudentClasses] = React.useState(false)
  const [unassigningStudentClassId, setUnassigningStudentClassId] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const { isAuthenticated, loading: authLoading, role } = useAuth()
  const { t } = useLanguage()

  // Sync with URL roleParam
  React.useEffect(() => {
    if (roleParam) {
      setRoleFilter(roleParam.toUpperCase())
    }
  }, [roleParam])

  const isLecturerView = roleFilter === 'LECTURER' || roleParam === 'lecturer'
  const isStudentView = roleFilter === 'STUDENT' || roleParam === 'student'

  // 3-Dots Action Menu & Center Confirmation Modals State
  const [activeActionMenuId, setActiveActionMenuId] = React.useState<string | null>(null)
  const [actionMenuAnchor, setActionMenuAnchor] = React.useState<HTMLButtonElement | null>(null)
  const [lockTargetUser, setLockTargetUser] = React.useState<any | null>(null)
  const [lockingUser, setLockingUser] = React.useState(false)
  const [deleteTargetUser, setDeleteTargetUser] = React.useState<any | null>(null)
  const [deletingUser, setDeletingUser] = React.useState(false)

  const openUserDetailModal = (u: any) => {
    const roleName = String(u.role?.name || u.role || '').toUpperCase()
    if (roleName === 'LECTURER') {
      openLecturerDetailModal(u)
    } else {
      openStudentDetailModal(u)
    }
  }

  const confirmToggleLock = async () => {
    if (!lockTargetUser) return
    setLockingUser(true)
    const isLocked = String(lockTargetUser.status).toLowerCase() === 'locked'
    try {
      await usersApi.toggleUserLock(lockTargetUser.id, !isLocked)
      setLockTargetUser(null)
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || t('ui.error_occurred', 'Thao tác thất bại.'))
    } finally {
      setLockingUser(false)
    }
  }

  const confirmDeleteUser = async () => {
    if (!deleteTargetUser) return
    setDeletingUser(true)
    try {
      await usersApi.deleteUser(deleteTargetUser.id)
      setDeleteTargetUser(null)
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || t('admin.users.delete_error', 'Không thể xóa người dùng.'))
    } finally {
      setDeletingUser(false)
    }
  }

  // Load all available classes once on mount for lecturer assignments & workload mapping
  React.useEffect(() => {
    classesApi.getClasses(1, 1000).then((res: any) => {
      const data = Array.isArray(res) ? res : res?.data || res?.items || []
      setAvailableClasses(data)
    }).catch(() => [])
  }, [])

  // Helper to get classes assigned to a lecturer
  const getLecturerClasses = React.useCallback((lecturerId: string) => {
    return availableClasses.filter((c: any) => {
      const matchLecturer = (c.lecturers || []).some((l: any) => l.id === lecturerId || l.email === lecturerId)
      const matchInstructor = (c.instructors || []).some((i: any) => i.id === lecturerId || i.email === lecturerId)
      const matchSingle = c.instructorId === lecturerId || c.lecturerId === lecturerId
      return matchLecturer || matchInstructor || matchSingle
    })
  }, [availableClasses])

  const openLecturerDetailModal = (u: any) => {
    setSelectedLecturerDetail(u)
    setLecturerDetailModal(true)
  }

  const openStudentDetailModal = async (u: any) => {
    setSelectedStudentDetail(u)
    setStudentDetailModal(true)
    setLoadingStudentClasses(true)
    try {
      const details = await usersApi.getUser(u.id)
      setStudentClasses(details?.enrolledClasses || [])
    } catch (err) {
      console.error('Failed to load student classes:', err)
      setStudentClasses([])
    } finally {
      setLoadingStudentClasses(false)
    }
  }

  const handleUnenrollClassFromStudent = async (classId: string) => {
    if (!selectedStudentDetail) return
    setUnassigningStudentClassId(classId)
    try {
      await usersApi.updateUser(selectedStudentDetail.id, {
        deletedClasses: [classId],
      } as any)
      const details = await usersApi.getUser(selectedStudentDetail.id)
      setStudentClasses(details?.enrolledClasses || [])
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || 'Không thể rút sinh viên khỏi lớp này.')
    } finally {
      setUnassigningStudentClassId(null)
    }
  }

  const handleUnassignClassFromLecturer = async (classId: string) => {
    setUnassigningClassId(classId)
    try {
      await classesApi.updateClass(classId, { lecturerId: null as any } as any)
      const res: any = await classesApi.getClasses(1, 1000)
      const data = Array.isArray(res) ? res : res?.data || res?.items || []
      setAvailableClasses(data)
      await loadUsers()
    } catch (err: any) {
      alert(err?.message || 'Không thể hủy phân công lớp này.')
    } finally {
      setUnassigningClassId(null)
    }
  }

  // Add User Modal
  const [addModal, setAddModal] = React.useState(false)
  const [formData, setFormData] = React.useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    code: '',
    phone: '',
    campus: 'FPT University Quy Nhơn',
    department: 'Kỹ thuật phần mềm (SE)',
    status: 'ACTIVE',
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

  const loadUsers = React.useCallback(async (background = false) => {
    if (authLoading || !isAuthenticated || role !== 'admin') return
    if (!background) setLoading(true)
    setLoadError(null)
    try {
      const res = await usersApi.getUsers(roleFilter, page, 50, search)
      const data = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || []
      setUsers(data)
    } catch (err: any) {
      if (background) throw err
      console.error('Failed to load users:', err)
      setLoadError(err?.message || t('admin.users.load_error', 'Không thể kết nối máy chủ để tải danh sách người dùng.'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [authLoading, isAuthenticated, role, roleFilter, page, search, t, setLoading, setLoadError, setUsers])


  // User metrics calculation
  const stats = React.useMemo(() => {
    const total = users.length
    const lecturers = users.filter((u: any) => String(u.role?.name || u.role || '').toUpperCase() === 'LECTURER').length
    const students = users.filter((u: any) => String(u.role?.name || u.role || '').toUpperCase() === 'STUDENT').length
    const active = users.filter((u: any) => String(u.status || '').toLowerCase() !== 'locked').length
    const locked = users.filter((u: any) => String(u.status || '').toLowerCase() === 'locked').length
    const k17 = users.filter((u: any) => String(u.code || u.studentCode || '').toUpperCase().includes('17')).length
    const k18 = users.filter((u: any) => String(u.code || u.studentCode || '').toUpperCase().includes('18')).length
    const k19 = users.filter((u: any) => String(u.code || u.studentCode || '').toUpperCase().includes('19')).length
    return { total, lecturers, students, active, locked, k17, k18, k19 }
  }, [users])

  // Dedicated Lecturer metrics calculation
  const lecturerStats = React.useMemo(() => {
    const lecturerList = users.filter((u: any) => String(u.role?.name || u.role || '').toUpperCase() === 'LECTURER')
    const withClasses = lecturerList.filter((u: any) => getLecturerClasses(u.id).length > 0).length
    const withoutClasses = Math.max(0, lecturerList.length - withClasses)
    const totalClassesAssigned = availableClasses.filter((c: any) => (c.lecturers?.length || 0) > 0 || c.instructorId).length
    const seCount = lecturerList.filter((u: any) => (u.department || '').toLowerCase().includes('se') || (u.department || '').toLowerCase().includes('phần mềm') || (u.code || '').includes('SE')).length
    const aiCount = lecturerList.filter((u: any) => (u.department || '').toLowerCase().includes('ai') || (u.department || '').toLowerCase().includes('trí tuệ') || (u.code || '').includes('AI')).length
    const iaCount = lecturerList.filter((u: any) => (u.department || '').toLowerCase().includes('ia') || (u.department || '').toLowerCase().includes('an toàn') || (u.code || '').includes('IA')).length
    return {
      total: lecturerList.length,
      withClasses,
      withoutClasses,
      totalClassesAssigned,
      seCount,
      aiCount,
      iaCount
    }
  }, [users, availableClasses, getLecturerClasses])

  const filteredUsers = React.useMemo(() => {
    return users.filter((u: any) => {
      const code = String(u.code || u.studentCode || u.lecturerCode || '').toUpperCase()
      const name = String(u.fullName || u.name || '').toLowerCase()
      const email = String(u.email || '').toLowerCase()
      const phone = String(u.phone || '').toLowerCase()
      const dept = String(u.department || '').toLowerCase()
      const q = search.trim().toLowerCase()

      if (q && !name.includes(q) && !email.includes(q) && !code.toLowerCase().includes(q) && !phone.includes(q) && !dept.includes(q)) {
        return false
      }

      if (cohortFilter !== 'all') {
        const cohortNum = cohortFilter.replace('K', '')
        if (!code.includes(cohortNum)) return false
      }

      if (majorFilter !== 'all') {
        const matchesMajor = code.includes(majorFilter) || dept.includes(majorFilter.toLowerCase())
        if (!matchesMajor) return false
      }

      if (isLecturerView && teachingStatusFilter !== 'all') {
        const classes = getLecturerClasses(u.id)
        if (teachingStatusFilter === 'assigned' && classes.length === 0) return false
        if (teachingStatusFilter === 'unassigned' && classes.length > 0) return false
      }

      if (campusFilter !== 'all') {
        const campus = String(u.campus || '').toLowerCase()
        if (!campus.includes(campusFilter.toLowerCase())) return false
      }

      if (statusFilter !== 'all') {
        const isLocked = String(u.status || '').toLowerCase() === 'locked'
        if (statusFilter === 'active' && isLocked) return false
        if (statusFilter === 'locked' && !isLocked) return false
      }

      return true
    })
  }, [users, search, cohortFilter, majorFilter, campusFilter, statusFilter, isLecturerView, teachingStatusFilter, getLecturerClasses])

  React.useEffect(() => {
    if (authLoading || !isAuthenticated || role !== 'admin') return
    loadUsers()
  }, [authLoading, isAuthenticated, role, loadUsers])

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError(null)

    if (!editingUserId && (!formData.password || formData.password.trim().length < 6)) {
      setModalError(t('admin.users.password_min_length', 'Mật khẩu khởi tạo phải có ít nhất 6 ký tự.'))
      setSubmitting(false)
      return
    }

    try {
      if (editingUserId) {
        await usersApi.updateUser(editingUserId, {
          fullName: formData.fullName,
          email: formData.email,
          ...(formData.password ? { password: formData.password } : {}),
          role: formData.role.toUpperCase() as any,
          phone: formData.phone || undefined,
          campus: formData.campus || undefined,
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
          phone: formData.phone || undefined,
          campus: formData.campus || undefined,
          ...(formData.role.toUpperCase() === 'LECTURER' ? { lecturerCode: formData.code } : formData.role.toUpperCase() === 'STUDENT' ? { studentCode: formData.code } : {}),
        } as any)
      }
      setAddModal(false)
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: isLecturerView ? 'LECTURER' : 'STUDENT',
        code: isLecturerView ? 'GV_' : '',
        phone: '',
        campus: 'FPT University Quy Nhơn',
        department: isLecturerView ? 'Bộ môn Kỹ thuật phần mềm (SE)' : 'Kỹ thuật phần mềm (SE)',
        status: 'ACTIVE',
      })
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
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: isLecturerView ? 'LECTURER' : 'STUDENT',
      code: isLecturerView ? 'GV_' : '',
      phone: '',
      campus: 'FPT University Quy Nhơn',
      department: isLecturerView ? 'Bộ môn Kỹ thuật phần mềm (SE)' : 'Kỹ thuật phần mềm (SE)',
      status: 'ACTIVE',
    })
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

    const roleName = (u.role?.name || u.role || 'STUDENT').toUpperCase()
    setFormData({
      fullName: u.name || u.fullName || u.FullName || '',
      email: u.email || u.Email || '',
      password: '',
      role: roleName,
      code: u.studentCode || u.StudentCode || u.lecturerCode || u.LecturerCode || '',
      phone: u.phone || u.Phone || '',
      campus: u.campus || 'FPT University Quy Nhơn',
      department: roleName === 'LECTURER' ? 'Bộ môn Công nghệ Thông tin' : 'Kỹ thuật phần mềm (SE)',
      status: u.status || 'ACTIVE',
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

  const pageTitle = isLecturerView
    ? 'Quản lý Giảng viên Campus'
    : isStudentView
    ? 'Quản lý Sinh viên Toàn trường'
    : 'Quản lý Tài khoản & Phân quyền'

  const pageSubtitle = isLecturerView
    ? 'Hồ sơ đội ngũ giảng viên, bộ môn đào tạo, mã số GV và phân công lớp giảng dạy'
    : isStudentView
    ? 'Danh bạ sinh viên theo khóa K17 - K19, chuyên ngành đào tạo và tình trạng học tập'
    : 'Quản trị tập trung danh sách sinh viên, giảng viên và cán bộ quản trị tại các Campus'

  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      title="AITA Admin"
      roleLabel={t('profile.role_admin', 'Quản trị viên')}
      requiredRole="admin"
      headerTitle={pageTitle}
      headerSubtitle={pageSubtitle}
    >
      <div className="space-y-6 w-full pb-12">
        {/* Hidden Excel File Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls, .csv"
          onChange={handleExcelImport}
          className="hidden"
        />

        {/* ── LECTURER EXECUTIVE KPI SUMMARY ── */}
        {isLecturerView && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng Giảng viên */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tổng Giảng viên
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.lecturers}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Cơ hữu & Thỉnh giảng Campus</span>
              </div>
            </div>

            {/* Card 2: Đang đứng lớp */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Đang đứng lớp
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {lecturerStats.withClasses}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Đã được xếp lớp phụ trách</span>
              </div>
            </div>

            {/* Card 3: Chờ phân công lớp */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Chờ phân công
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {lecturerStats.withoutClasses}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Cần gán lớp học phần</span>
              </div>
            </div>

            {/* Card 4: Lớp học đã có GV */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Lớp có GV phụ trách
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <School className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {lecturerStats.totalClassesAssigned}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Lớp học phần đang triển khai</span>
              </div>
            </div>
          </div>
        )}

        {/* ── STUDENT EXECUTIVE KPI SUMMARY ── */}
        {isStudentView && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng Sinh viên */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tổng Sinh viên
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.students}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Sinh viên đang theo học Campus</span>
              </div>
            </div>

            {/* Card 2: Khóa K17 */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Khóa K17 (Năm 4)
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.k17}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Giai đoạn làm đồ án & tốt nghiệp</span>
              </div>
            </div>

            {/* Card 3: Khóa K18 */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Khóa K18 (Năm 3)
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.k18}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Học phần chuyên ngành FPT</span>
              </div>
            </div>

            {/* Card 4: Khóa K19 */}
            <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30 shadow-xs hover:shadow-md transition-all group">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-tr from-orange-400/15 via-amber-300/15 to-transparent rounded-full blur-2xl group-hover:from-orange-400/25 group-hover:via-amber-300/25 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Khóa K19 (Năm 2)
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
                  <School className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.k19}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span>Học phần cơ sở & kiến thức nền</span>
              </div>
            </div>
          </div>
        )}

        {/* ── DIRECTORY SWITCHER TABS & ACTION TOOLBAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {isStudentView ? (
            <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
              <button
                onClick={() => { setCohortFilter('all'); setMajorFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  cohortFilter === 'all' && majorFilter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Tất cả sinh viên</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  cohortFilter === 'all' && majorFilter === 'all'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.students}
                </span>
              </button>

              <button
                onClick={() => { setCohortFilter('K17'); setMajorFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  cohortFilter === 'K17'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <span>Khóa K17</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  cohortFilter === 'K17'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.k17}
                </span>
              </button>

              <button
                onClick={() => { setCohortFilter('K18'); setMajorFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  cohortFilter === 'K18'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <span>Khóa K18</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  cohortFilter === 'K18'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.k18}
                </span>
              </button>

              <button
                onClick={() => { setCohortFilter('K19'); setMajorFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  cohortFilter === 'K19'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <span>Khóa K19</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  cohortFilter === 'K19'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.k19}
                </span>
              </button>

              <button
                onClick={() => { setMajorFilter('SE'); setCohortFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  majorFilter === 'SE'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <span>Ngành SE</span>
              </button>

              <button
                onClick={() => { setMajorFilter('AI'); setCohortFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  majorFilter === 'AI'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <span>Ngành AI</span>
              </button>
            </div>
          ) : isLecturerView ? (
            <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
              <button
                onClick={() => { setTeachingStatusFilter('all'); setMajorFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  teachingStatusFilter === 'all' && majorFilter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Tất cả Giảng viên</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  teachingStatusFilter === 'all' && majorFilter === 'all'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.lecturers}
                </span>
              </button>

              <button
                onClick={() => { setTeachingStatusFilter('assigned'); setMajorFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  teachingStatusFilter === 'assigned'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Đang đứng lớp</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  teachingStatusFilter === 'assigned'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {lecturerStats.withClasses}
                </span>
              </button>

              <button
                onClick={() => { setTeachingStatusFilter('unassigned'); setMajorFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  teachingStatusFilter === 'unassigned'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Chờ xếp lớp</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  teachingStatusFilter === 'unassigned'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {lecturerStats.withoutClasses}
                </span>
              </button>

              <button
                onClick={() => { setMajorFilter('SE'); setTeachingStatusFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  majorFilter === 'SE'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <span>Bộ môn SE</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  majorFilter === 'SE'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {lecturerStats.seCount}
                </span>
              </button>

              <button
                onClick={() => { setMajorFilter('AI'); setTeachingStatusFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  majorFilter === 'AI'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <span>Bộ môn AI</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  majorFilter === 'AI'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {lecturerStats.aiCount}
                </span>
              </button>
            </div>
          ) : (
            <div className="inline-flex flex-wrap p-1.5 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 rounded-2xl border border-orange-100/90 dark:border-orange-900/30 shadow-xs gap-1">
              <button
                onClick={() => { setRoleFilter('all'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  roleFilter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tất cả</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  roleFilter === 'all'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.total}
                </span>
              </button>

              <button
                onClick={() => { setRoleFilter('STUDENT'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  roleFilter === 'STUDENT'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Sinh viên</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  roleFilter === 'STUDENT'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.students}
                </span>
              </button>

              <button
                onClick={() => { setRoleFilter('LECTURER'); setPage(1); }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  roleFilter === 'LECTURER'
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-white hover:bg-orange-50/60 dark:hover:bg-slate-800'
                )}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Giảng viên</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold',
                  roleFilter === 'LECTURER'
                    ? 'bg-white/20 text-white backdrop-blur-xs'
                    : 'bg-orange-100/80 dark:bg-slate-700 text-orange-700 dark:text-slate-300'
                )}>
                  {stats.lecturers}
                </span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportType(isStudentView ? 'student' : isLecturerView ? 'lecturer' : 'student')
                setImportModal(true)
              }}
              className="text-xs gap-1.5 cursor-pointer rounded-2xl h-10 px-4 font-semibold shadow-xs border border-orange-200/80 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/30 dark:from-slate-900 dark:to-slate-800 text-slate-700 dark:text-slate-200 hover:border-orange-300"
              title="Nhập dữ liệu Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Excel</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="text-xs gap-1.5 cursor-pointer rounded-2xl h-10 px-5 font-bold transition-all shadow-md active:scale-95 text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 shadow-orange-500/25"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isLecturerView ? 'Thêm Giảng viên' : isStudentView ? 'Thêm Sinh viên' : 'Tạo mới'}</span>
            </Button>

            <RefreshAction onRefresh={() => loadUsers(true)} disabled={loading} cachePaths={["/users"]} />
          </div>
        </div>

        {/* ── 3. ADVANCED FILTERS & SEARCH TOOLBAR ── */}
        <div className="p-4 sm:p-5 rounded-2xl shadow-xs space-y-3 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-orange-950/20 border border-orange-100/90 dark:border-orange-900/30">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={isLecturerView ? 'Tìm theo tên giảng viên, email, mã MSGV...' : isStudentView ? 'Tìm theo tên sinh viên, MSSV, email...' : 'Tìm kiếm theo tên, email, MSSV/MSGV, SĐT...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all focus:ring-2 focus:ring-orange-400/25 focus:border-orange-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Teaching Status Selector (for Lecturers) */}
              {isLecturerView && (
                <select
                  value={teachingStatusFilter}
                  onChange={(e) => setTeachingStatusFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-orange-400 cursor-pointer text-xs"
                >
                  <option value="all">Tất cả Tình trạng Lớp</option>
                  <option value="assigned">Đang đứng lớp ({lecturerStats.withClasses})</option>
                  <option value="unassigned">Chưa xếp lớp ({lecturerStats.withoutClasses})</option>
                </select>
              )}

              {/* Cohort Selector (only relevant for students or all) */}
              {!isLecturerView && (
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-orange-400 cursor-pointer text-xs"
                >
                  <option value="all">Tất cả Khóa</option>
                  <option value="K17">Khóa K17 (Năm 4 / Tốt nghiệp)</option>
                  <option value="K18">Khóa K18 (Năm 3 / Chuyên ngành)</option>
                  <option value="K19">Khóa K19 (Năm 2 / Cơ sở ngành)</option>
                </select>
              )}

              {/* Department / Major Selector */}
              <select
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-orange-400 cursor-pointer text-xs"
              >
                <option value="all">{isLecturerView ? 'Tất cả Bộ môn Đào tạo' : 'Tất cả Chuyên ngành'}</option>
                <option value="SE">{isLecturerView ? 'Bộ môn SE · Kỹ thuật Phần mềm' : 'SE · Kỹ thuật Phần mềm'}</option>
                <option value="IA">{isLecturerView ? 'Bộ môn IA · An toàn Thông tin' : 'IA · An toàn Thông tin'}</option>
                <option value="AI">{isLecturerView ? 'Bộ môn AI · Trí tuệ Nhân tạo' : 'AI · Trí tuệ Nhân tạo'}</option>
                <option value="IS">{isLecturerView ? 'Bộ môn IS · Hệ thống Thông tin' : 'IS · Hệ thống Thông tin'}</option>
                <option value="GD">{isLecturerView ? 'Bộ môn GD · Thiết kế Mỹ thuật Số' : 'GD · Thiết kế Mỹ thuật Số'}</option>
              </select>

              {/* Campus Selector */}
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-orange-400 cursor-pointer text-xs"
              >
                <option value="all">Tất cả Campus</option>
                <option value="Quy Nhơn">FPT Quy Nhơn</option>
                <option value="Cần Thơ">FPT Cần Thơ</option>
                <option value="Đà Nẵng">FPT Đà Nẵng</option>
                <option value="Hà Nội">FPT Hòa Lạc</option>
                <option value="TP.HCM">FPT TP.HCM</option>
              </select>

              {/* Status Selector */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:border-orange-400 cursor-pointer text-xs"
              >
                <option value="all">Tất cả Trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="locked">Đã khóa</option>
              </select>

              {/* Reset filter button if any active */}
              {(cohortFilter !== 'all' || majorFilter !== 'all' || campusFilter !== 'all' || statusFilter !== 'all' || teachingStatusFilter !== 'all' || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setCohortFilter('all')
                    setMajorFilter('all')
                    setCampusFilter('all')
                    setStatusFilter('all')
                    setTeachingStatusFilter('all')
                    setSearch('')
                  }}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Bulk Actions Floating Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl border text-xs bg-gradient-to-r from-orange-50/90 via-amber-50/80 to-orange-50/90 dark:from-orange-950/60 dark:to-amber-950/60 border-orange-200 dark:border-orange-900/60">
              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-800 dark:text-orange-300">
                  Đã chọn {selectedIds.size} người dùng
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkRoleModal(true)}
                  className="text-xs gap-1.5 h-8 bg-white dark:bg-slate-900"
                >
                  <Shield className="w-3.5 h-3.5 text-orange-500" />
                  <span>Đổi vai trò</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBulkAssign}
                  className="text-xs gap-1.5 h-8 bg-white dark:bg-slate-900"
                >
                  <School className="w-3.5 h-3.5 text-amber-500" />
                  <span>Gán lớp</span>
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  isLoading={bulkDeleting}
                  className="text-xs gap-1.5 h-8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa đã chọn</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. CONSOLIDATED ENTERPRISE DATA TABLE ── */}
        <Card className="rounded-2xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden border border-slate-200/80 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50">
                  <th className="py-3.5 pl-4 pr-3">{isLecturerView ? 'Giảng viên & Email' : isStudentView ? 'Sinh viên & Email' : 'Họ và tên & Email'}</th>
                  <th className="py-3.5 px-3">{isStudentView ? 'Mã sinh viên (MSSV)' : isLecturerView ? 'Mã giảng viên (MSGV)' : 'Mã định danh'}</th>
                  <th className="py-3.5 px-3">{isLecturerView ? 'Bộ môn công tác' : isStudentView ? 'Khóa đào tạo' : 'Vai trò'}</th>
                  <th className="py-3.5 px-3">{isLecturerView ? 'Lớp học phụ trách' : isStudentView ? 'Chuyên ngành đào tạo' : 'Chuyên ngành / Đơn vị'}</th>
                  <th className="py-3.5 px-3">Campus</th>
                  <th className="py-3.5 px-3">Trạng thái</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                        <span>Đang tải danh sách tài khoản...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          Không tìm thấy người dùng nào phù hợp
                        </p>
                        <p className="text-xs text-slate-400">
                          Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => {
                    const roleName = String(u.role?.name || u.role || 'STUDENT').toUpperCase()
                    const isLocked = String(u.status).toLowerCase() === 'locked'
                    const isLecturer = roleName === 'LECTURER'
                    const isStudent = roleName === 'STUDENT'
                    const isAdmin = roleName === 'ADMIN'

                    // Code formatting
                    const code = u.code || u.studentCode || u.lecturerCode || u.StudentCode || u.LecturerCode || '—'
                    const fullName = u.fullName || u.name || t('admin.users.default_name', 'Người dùng')
                    const avatarUrl = u.avatar || u.avatarUrl || u.Avatar || u.photo || u.image || u.profile?.avatar

                    return (
                      <tr
                        key={u.id}
                        className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        {/* User Identity: Avatar + Full Name + Email */}
                        <td className="py-3.5 pl-4 pr-3">
                          <div className="flex items-center gap-3">
                            <AnonymousAvatar
                              src={avatarUrl}
                              alt={fullName}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p
                                onClick={() => isLecturer ? openLecturerDetailModal(u) : isStudent ? openStudentDetailModal(u) : undefined}
                                className="font-semibold text-slate-900 dark:text-white truncate transition-colors text-xs hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              >
                                {fullName}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                <span>{u.email}</span>
                                {u.phone && <span>· {u.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Identifier Code */}
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border inline-block bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                            {code}
                          </span>
                        </td>

                        {/* Column 3: Department for Lecturers / Cohort for Students */}
                        <td className="py-3.5 px-3">
                          {isLecturerView ? (
                            <div className="flex items-center gap-2 max-w-[210px]">
                              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                <Building className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                {u.department || 'Bộ môn Kỹ thuật phần mềm (SE)'}
                              </span>
                            </div>
                          ) : isStudentView ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {code.includes('17') ? 'Khóa K17' : code.includes('18') ? 'Khóa K18' : code.includes('19') ? 'Khóa K19' : 'Sinh viên FPT'}
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block',
                                isAdmin
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                              )}
                            >
                              {isAdmin ? 'Quản trị viên' : 'Sinh viên'}
                            </span>
                          )}
                        </td>

                        {/* Column 4: Assigned Classes for Lecturers / Major for Students */}
                        <td className="py-3.5 px-3">
                          {isLecturerView ? (
                            (() => {
                              const classes = getLecturerClasses(u.id)
                              if (classes.length === 0) {
                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 inline-flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                                      Chưa xếp lớp
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => openAssignUserModal(u)}
                                      className="text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer"
                                    >
                                      + Gán lớp
                                    </button>
                                  </div>
                                )
                              }
                              return (
                                <div className="flex flex-wrap items-center gap-1.5 max-w-[240px]">
                                  {classes.slice(0, 3).map((c: any) => (
                                    <span
                                      key={c.id || c.code}
                                      title={`${c.code} - ${c.name || c.subjectName || ''} (${c.studentCount || 0} SV)`}
                                      className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors"
                                      onClick={() => openLecturerDetailModal(u)}
                                    >
                                      {c.code}
                                    </span>
                                  ))}
                                  {classes.length > 3 && (
                                    <button
                                      type="button"
                                      onClick={() => openLecturerDetailModal(u)}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                      title="Xem tất cả các lớp"
                                    >
                                      +{classes.length - 3}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openAssignUserModal(u)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                                    title="Phân công thêm lớp"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )
                            })()
                          ) : isStudentView ? (
                            <div className="flex items-center gap-2 max-w-[210px]">
                              <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                <GraduationCap className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                {u.department || 'Kỹ thuật Phần mềm (SE)'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                              {u.department || 'Kỹ thuật Phần mềm (SE)'}
                            </div>
                          )}
                        </td>

                        {/* Campus */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-xs truncate max-w-[150px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{u.campus || 'FPT Quy Nhơn'}</span>
                          </div>
                        </td>

                        {/* Account Status */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Đã khóa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Hoạt động
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quick Actions: 3-Dots Action Menu */}
                        <td className="py-3.5 pl-3 pr-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionMenuAnchor(e.currentTarget)
                                setActiveActionMenuId(activeActionMenuId === u.id ? null : u.id)
                              }}
                              className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                                activeActionMenuId === u.id
                                  ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 ring-2 ring-slate-300/50 dark:ring-slate-700/50"
                                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                              )}
                              title="Tùy chọn thao tác"
                              aria-label={`Thao tác với ${fullName}`}
                              aria-haspopup="menu"
                              aria-expanded={activeActionMenuId === u.id}
                              aria-controls={activeActionMenuId === u.id ? `user-actions-${u.id}` : undefined}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Options Dropdown Menu */}
                            {activeActionMenuId === u.id && (
                                <AnchoredMenu
                                  anchor={actionMenuAnchor}
                                  id={`user-actions-${u.id}`}
                                  label={`Thao tác với ${fullName}`}
                                  onClose={() => setActiveActionMenuId(null)}
                                >
                                  {/* Nhóm 1: Xem & Quản lý */}
                                  <div className="p-1 space-y-0.5">
                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        openUserDetailModal(u)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                                    >
                                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 transition-colors flex items-center justify-center">
                                        <Eye className="w-3.5 h-3.5" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Xem chi tiết hồ sơ</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Thông tin, mã số & liên hệ</p>
                                      </div>
                                    </button>

                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        openAssignUserModal(u)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                                    >
                                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 transition-colors flex items-center justify-center">
                                        <School className="w-3.5 h-3.5" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{isLecturer ? 'Phân công lớp dạy' : 'Gán vào lớp học'}</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Quản lý các lớp phụ trách</p>
                                      </div>
                                    </button>

                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        openEditModal(u)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                                    >
                                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 transition-colors flex items-center justify-center">
                                        <Edit className="w-3.5 h-3.5" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Chỉnh sửa thông tin</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Họ tên, email, bộ môn...</p>
                                      </div>
                                    </button>
                                  </div>

                                  {/* Nhóm 2: Khóa & Xóa */}
                                  <div className="p-1 space-y-0.5">
                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        setLockTargetUser(u)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                                    >
                                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 transition-colors flex items-center justify-center">
                                        {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">{isLocked ? 'Khôi phục quyền truy cập' : 'Tạm ngưng quyền truy cập'}</p>
                                      </div>
                                    </button>

                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null)
                                        setDeleteTargetUser(u)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                                    >
                                      <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 transition-colors flex items-center justify-center">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">Xóa tài khoản</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">Xóa vĩnh viễn khỏi hệ thống</p>
                                      </div>
                                    </button>
                                  </div>
                                </AnchoredMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary & Pagination */}
          <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Hiển thị <span className="font-bold text-slate-900 dark:text-white">{filteredUsers.length}</span> / {stats.total} tài khoản
              {selectedIds.size > 0 && ` · Đã chọn ${selectedIds.size}`}
            </div>

            {users.length > 0 && !loading && (
              <Pagination
                page={page}
                hasNext={users.length === 50}
                loading={loading}
                onChange={(nextPage) => setPage(nextPage)}
              />
            )}
          </div>
        </Card>

        {/* Dedicated Lecturer Profile & Teaching Classes Drawer Modal */}
        <Modal
          isOpen={lecturerDetailModal}
          onClose={() => setLecturerDetailModal(false)}
          maxWidth="4xl"
          title={
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-500/20">
                <Briefcase className="w-5 h-5" />
              </span>
              <span>Hồ sơ Giảng viên & Phân công Lớp học</span>
            </div>
          }
          description="Thông tin chi tiết đội ngũ giảng viên, bộ môn đào tạo và danh sách lớp học đang phụ trách."
        >
          {selectedLecturerDetail && (() => {
            const lecturerClasses = getLecturerClasses(selectedLecturerDetail.id)
            const totalStudents = lecturerClasses.reduce((sum: number, c: any) => sum + (c.studentCount || 0), 0)

            return (
              <div className="space-y-6">
                {/* Profile Card Header with Simple Neutral Frame */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <AnonymousAvatar
                        src={selectedLecturerDetail.avatar || selectedLecturerDetail.avatarUrl || selectedLecturerDetail.Avatar || selectedLecturerDetail.profile?.avatar}
                        alt={selectedLecturerDetail.fullName || selectedLecturerDetail.name}
                        size="lg"
                        className="ring-2 ring-slate-200 dark:ring-slate-700 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {selectedLecturerDetail.fullName || selectedLecturerDetail.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            Giảng viên Campus
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-900 dark:text-white">
                            MSGV: {selectedLecturerDetail.code || selectedLecturerDetail.lecturerCode || 'GV_CAMPUS'}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-900 dark:text-white">
                            {selectedLecturerDetail.department || 'Bộ môn Kỹ thuật phần mềm (SE)'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-800 dark:text-slate-200 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            {selectedLecturerDetail.email}
                          </span>
                          {selectedLecturerDetail.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              {selectedLecturerDetail.phone}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {selectedLecturerDetail.campus || 'FPT University Quy Nhơn'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Metrics in Banner */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200 dark:border-slate-700">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center min-w-[90px] shadow-2xs">
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {lecturerClasses.length}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Lớp phụ trách
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center min-w-[90px] shadow-2xs">
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {totalStudents}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Tổng sinh viên
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setLecturerDetailModal(false)
                          openAssignUserModal(selectedLecturerDetail)
                        }}
                        className="text-xs gap-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 text-white rounded-xl shadow-md shadow-orange-500/20 font-bold h-10 px-3.5 cursor-pointer"
                      >
                        <School className="w-4 h-4" />
                        <span>Gán lớp</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Teaching Classes Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-orange-600" />
                      <span>Danh sách lớp học đang phụ trách ({lecturerClasses.length})</span>
                    </h4>
                  </div>

                  {lecturerClasses.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                      <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Giảng viên này chưa được phân công lớp học nào
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Nhấn nút &ldquo;Gán lớp&rdquo; bên trên để phân công lớp học phần cho giảng viên.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-4">Mã lớp</th>
                            <th className="py-3 px-3">Môn học</th>
                            <th className="py-3 px-3">Học kỳ</th>
                            <th className="py-3 px-3">Sĩ số</th>
                            <th className="py-3 pr-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {lecturerClasses.map((cls: any) => (
                            <tr key={cls.id || cls.code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-orange-600 dark:text-orange-400">
                                {cls.code}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                {cls.name || cls.subjectName || cls.subject?.name || 'Môn học cơ sở'}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-semibold">
                                  {cls.semesterSeason || cls.semester?.season || cls.semester?.code || 'Chính khóa'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-900 dark:text-white">{cls.studentCount || 0}</span> sinh viên
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnassignClassFromLecturer(cls.id)}
                                  isLoading={unassigningClassId === cls.id}
                                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 h-7 px-2.5 border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold"
                                >
                                  Hủy gán
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setLecturerDetailModal(false)} className="rounded-xl">
                    Đóng
                  </Button>
                </div>
              </div>
            )
          })()}
        </Modal>

        {/* Dedicated Student Profile & Enrolled Classes Modal */}
        <Modal
          isOpen={studentDetailModal}
          onClose={() => setStudentDetailModal(false)}
          maxWidth="4xl"
          title={
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-500/20">
                <GraduationCap className="w-5 h-5" />
              </span>
              <span>Hồ sơ Sinh viên & Lớp học đang tham gia</span>
            </div>
          }
          description="Thông tin chi tiết hồ sơ sinh viên, niên khóa đào tạo, chuyên ngành và danh sách lớp học phần đã đăng ký."
        >
          {selectedStudentDetail && (() => {
            const code = selectedStudentDetail.code || selectedStudentDetail.studentCode || 'SV_CAMPUS'
            const cohort = code.includes('17') ? 'Khóa K17' : code.includes('18') ? 'Khóa K18' : code.includes('19') ? 'Khóa K19' : 'Sinh viên'

            return (
              <div className="space-y-6">
                {/* Profile Card Header with Simple Neutral Frame */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <AnonymousAvatar
                        src={selectedStudentDetail.avatar || selectedStudentDetail.avatarUrl || selectedStudentDetail.Avatar || selectedStudentDetail.profile?.avatar}
                        alt={selectedStudentDetail.fullName || selectedStudentDetail.name}
                        size="lg"
                        className="ring-2 ring-slate-200 dark:ring-slate-700 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {selectedStudentDetail.fullName || selectedStudentDetail.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            Sinh viên Campus
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-900 dark:text-white">
                            MSSV: {code}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-900 dark:text-white">
                            {cohort}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-900 dark:text-white">
                            {selectedStudentDetail.department || 'Kỹ thuật phần mềm (SE)'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-800 dark:text-slate-200 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            {selectedStudentDetail.email}
                          </span>
                          {selectedStudentDetail.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-500" />
                              {selectedStudentDetail.phone}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {selectedStudentDetail.campus || 'FPT University Quy Nhơn'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Metrics in Banner */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200 dark:border-slate-700">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center min-w-[90px] shadow-2xs">
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {studentClasses.length}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Lớp tham gia
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center min-w-[90px] shadow-2xs">
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          {cohort}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Khóa đào tạo
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setStudentDetailModal(false)
                          openAssignUserModal(selectedStudentDetail)
                        }}
                        className="text-xs gap-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 font-bold h-10 px-4 cursor-pointer"
                      >
                        <School className="w-4 h-4" />
                        <span>Gán lớp</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Enrolled Classes Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-orange-600" />
                      <span>Danh sách lớp học phần đang tham gia ({studentClasses.length})</span>
                    </h4>
                  </div>

                  {loadingStudentClasses ? (
                    <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Đang tải danh sách lớp học của sinh viên...</p>
                    </div>
                  ) : studentClasses.length === 0 ? (
                    <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                      <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Sinh viên chưa đăng ký lớp học phần nào
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Nhấn nút &ldquo;Gán lớp&rdquo; bên trên để thêm sinh viên vào lớp học.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            <th className="py-3 px-4">Mã lớp</th>
                            <th className="py-3 px-3">Môn học</th>
                            <th className="py-3 px-3">Học kỳ</th>
                            <th className="py-3 px-3">Giảng viên / Trạng thái</th>
                            <th className="py-3 pr-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {studentClasses.map((cls: any) => (
                            <tr key={cls.id || cls.classId || cls.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                {cls.code || cls.classCode}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                {cls.name || cls.subjectName || cls.subject?.name || 'Môn học cơ sở'}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px] font-semibold">
                                  {cls.semesterSeason || cls.semester?.season || cls.semester?.code || 'Chính khóa'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                                {cls.lecturerName || cls.instructorName ? (
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {cls.lecturerName || cls.instructorName}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">Đang cập nhật GV</span>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnenrollClassFromStudent(cls.id || cls.classId)}
                                  isLoading={unassigningStudentClassId === (cls.id || cls.classId)}
                                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 h-7 px-2.5 border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold cursor-pointer"
                                >
                                  Rút lớp
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setStudentDetailModal(false)} className="rounded-xl cursor-pointer">
                    Đóng
                  </Button>
                </div>
              </div>
            )
          })()}
        </Modal>

        {/* Create User Modal with Live Interactive Visual Profile Badge Preview */}
        <Modal
          isOpen={addModal}
          onClose={() => setAddModal(false)}
          maxWidth="5xl"
          title={
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 dark:bg-orange-500/20">
                {editingUserId ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              </span>
              <span>{editingUserId ? t('admin.users.edit_modal_title', 'Chỉnh sửa tài khoản người dùng') : t('admin.users.modal_title', 'Tạo tài khoản người dùng mới')}</span>
            </div>
          }
          description={editingUserId ? t('admin.users.edit_modal_desc', 'Cập nhật thông tin tài khoản và xem trước hồ sơ thẻ FPT trực tiếp.') : t('admin.users.modal_desc', 'Thêm sinh viên hoặc giảng viên vào cơ sở dữ liệu với bản xem trước thẻ nhận diện trực quan')}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form (7 cols) */}
            <form onSubmit={handleSubmitUser} className="lg:col-span-7 space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{t('admin.users.form_fullname', 'Họ và tên đầy đủ')} <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400">Hiển thị trên thẻ ID</span>
                </label>
                <Input
                  type="text"
                  placeholder={t('admin.users.default_name', 'Nguyễn Văn A')}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('admin.users.form_email', 'Email FPT Education')} <span className="text-rose-500">*</span>
                </label>
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
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('admin.users.form_role', 'Vai trò (Role)')}
                  </label>
                  {isStudentView ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 text-xs font-bold text-orange-700 dark:text-orange-300">
                      <GraduationCap className="w-4 h-4 text-[#FA7014]" />
                      <span>Sinh viên (STUDENT)</span>
                    </div>
                  ) : (
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value
                        setFormData({
                          ...formData,
                          role: newRole,
                          department: newRole === 'LECTURER' ? 'Bộ môn Kỹ thuật phần mềm' : newRole === 'ADMIN' ? 'Ban Công nghệ Thông tin FPT' : 'Kỹ thuật phần mềm (SE)',
                          code: formData.code || (newRole === 'STUDENT' ? 'SE180001' : newRole === 'LECTURER' ? 'GV_SE01' : 'ADM01'),
                        })
                      }}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="STUDENT">{t('admin.users.role_student', 'Sinh viên (STUDENT)')}</option>
                      <option value="LECTURER">{t('admin.users.role_lecturer', 'Giảng viên (LECTURER)')}</option>
                      <option value="ADMIN">{t('admin.users.role_admin', 'Quản trị viên (ADMIN)')}</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {formData.role === 'STUDENT' ? 'Mã sinh viên (Roll Number)' : formData.role === 'LECTURER' ? 'Mã giảng viên (Lecturer Code)' : 'Mã quản trị viên'}
                  </label>
                  <Input
                    type="text"
                    placeholder={formData.role === 'STUDENT' ? 'SE180123' : formData.role === 'LECTURER' ? 'GV_IT09' : 'ADM001'}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Số điện thoại liên hệ</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="0987 654 321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>Cơ sở Đào tạo (Campus)</span>
                  </label>
                  <select
                    value={formData.campus}
                    onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="FPT University Quy Nhơn">FPT University Quy Nhơn</option>
                    <option value="FPT University Hà Nội (Hòa Lạc)">FPT University Hà Nội (Hòa Lạc)</option>
                    <option value="FPT University TP. Hồ Chí Minh">FPT University TP. Hồ Chí Minh</option>
                    <option value="FPT University Đà Nẵng">FPT University Đà Nẵng</option>
                    <option value="FPT University Cần Thơ">FPT University Cần Thơ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3 h-3 text-slate-400" />
                  <span>Chuyên ngành / Bộ môn công tác</span>
                </label>
                <Input
                  type="text"
                  placeholder="Kỹ thuật phần mềm (SE) / Trí tuệ nhân tạo (AI)"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('admin.users.form_password', 'Mật khẩu khởi tạo')} {!editingUserId && <span className="text-rose-500">*</span>}
                  </label>
                  {!editingUserId && (
                    <span className="text-[10px] text-slate-400">Tối thiểu 6 ký tự</span>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder={editingUserId ? t('admin.users.pwd_placeholder_edit', 'Bỏ trống nếu không đổi mật khẩu') : '•••••••• (tối thiểu 6 ký tự)'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUserId}
                  minLength={editingUserId ? undefined : 6}
                />
              </div>

              {/* Class Management Section (Only when editing) */}
              {editingUserId && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <GraduationCap className="w-4 h-4 text-orange-500" />
                    {t('admin.users.joined_classes', 'Danh sách lớp học tham gia')}
                  </h3>

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
                        const found = availableClasses.find((c) => c.id === selectedClassToAdd)
                        if (found) {
                          setUserClasses((prev) => [...prev, { classId: found.id, classCode: found.code, subjectName: found.subjectName }])
                          setAddedClasses((prev) => [...prev, found.id])
                          setSelectedClassToAdd('')
                        }
                      }}
                    >
                      {t('admin.users.add_to_class', 'Thêm vào lớp')}
                    </Button>
                  </div>

                  {loadingDetails ? (
                    <p className="text-xs text-slate-500 text-center py-3">{t('admin.users.loading_classes', 'Đang tải dữ liệu lớp học...')}</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2">
                      {userClasses.filter((c) => !deletedClasses.includes(c.classId)).map((c, i) => (
                        <div key={i} className="flex justify-between items-center p-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                          <div>
                            <p className="text-xs font-bold font-mono text-orange-600 dark:text-orange-400">{c.classCode}</p>
                            <p className="text-[11px] text-slate-500">{c.subjectName || c.subjectCode || t('admin.classes.col_subject', 'Môn học')}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setDeletedClasses((prev) => [...prev, c.classId])}
                            className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      {userClasses.filter((c) => !deletedClasses.includes(c.classId)).length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-2">{t('admin.users.no_classes_available', 'Không có lớp học nào.')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setAddModal(false)}>
                  {t('ui.cancel', 'Hủy bỏ')}
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={submitting} className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 text-white rounded-xl shadow-md shadow-orange-500/20 font-bold px-4">
                  {editingUserId ? t('ui.save_changes', 'Lưu thay đổi') : t('admin.users.form_submit', 'Tạo tài khoản')}
                </Button>
              </div>
            </form>

            {/* Right Column: Live Visual Profile Card Preview (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/70 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-orange-600" />
                  Ảnh Thẻ Trực Quan (Live View)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Realtime Sync
                </span>
              </div>

              {/* FPT University Smart ID Badge Component */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl transition-all duration-300">
                {/* Header Band */}
                <div className="p-4 text-white relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/80">FPT UNIVERSITY</p>
                      <h4 className="text-xs font-extrabold tracking-tight text-white flex items-center gap-1">
                        <span>AITA SMART ID CARD</span>
                        <Sparkles className="w-3 h-3 text-amber-200 fill-amber-200" />
                      </h4>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                      <Fingerprint className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3.5">
                  <div className="flex items-center gap-3.5">
                    {/* Dynamic Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-md border-2 border-white dark:border-slate-800 bg-gradient-to-tr from-orange-500 to-amber-500">
                        {formData.fullName
                          ? formData.fullName.split(' ').slice(-2).map((n: string) => n[0]).join('').toUpperCase()
                          : (formData.role === 'LECTURER' ? 'GV' : formData.role === 'ADMIN' ? 'AD' : 'SV')}
                      </div>
                      <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Hoạt động">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      </span>
                    </div>

                    {/* Name & Role */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {formData.fullName.trim() || 'Nguyễn Văn A'}
                      </h3>
                      <p className="text-xs font-mono font-semibold text-orange-600 dark:text-orange-400 mt-0.5">
                        {formData.role === 'STUDENT' ? 'MSSV: ' : formData.role === 'LECTURER' ? 'MSGV: ' : 'MÃ QTV: '}
                        {formData.code || 'CHƯA CẤP'}
                      </p>
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                          {formData.role === 'LECTURER' ? (
                            <>
                              <School className="w-2.5 h-2.5" />
                              Giảng viên (Lecturer)
                            </>
                          ) : formData.role === 'ADMIN' ? (
                            <>
                              <Shield className="w-2.5 h-2.5" />
                              Quản trị viên (Admin)
                            </>
                          ) : (
                            <>
                              <GraduationCap className="w-2.5 h-2.5" />
                              Sinh viên (Student)
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Info Rows */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">{formData.email || 'email@fpt.edu.vn'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-[11px]">{formData.department || 'Chuyên ngành CNTT'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-[11px]">{formData.campus}</span>
                    </div>

                    {formData.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate text-[11px]">{formData.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Smart Barcode / Verification Strip */}
                  <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-0.5">
                        {[4, 2, 6, 3, 5, 2, 7, 4, 3, 6, 2, 5, 3, 4, 6, 2].map((w, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-800 dark:bg-slate-300 rounded-sm"
                            style={{ width: `${w}px`, height: '18px' }}
                          />
                        ))}
                      </div>
                      <p className="text-[9px] font-mono text-slate-400">ID • AITA-{formData.code || 'SYS2026'}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <QrCode className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center italic">
                Ảnh thẻ tự động cập nhật ngay khi bạn nhập thông tin bên cạnh.
              </p>
            </div>
          </div>
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
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {assignTargetUser?.name || assignTargetUser?.fullName || t('admin.users.default_name', 'User')}
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                  {assignTargetUser?.email}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {String(assignTargetUser?.role?.name || assignTargetUser?.role || 'STUDENT').toUpperCase()}
              </span>
            </div>

            {/* Current Classes */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {t('admin.users.current_classes', `Currently assigned / enrolled classes (${assignUserClasses.length}):`).replace('{{count}}', String(assignUserClasses.length))}
              </span>
              {loadingAssignUserClasses ? (
                <div className="p-3 text-center text-xs text-slate-700 dark:text-slate-300 font-medium">{t('admin.users.loading_current_classes', 'Loading current classes list...')}</div>
              ) : assignUserClasses.length === 0 ? (
                <div className="p-2.5 text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {t('admin.users.no_current_classes', 'Not enrolled in or assigned to any classes.')}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {assignUserClasses.map((c: any) => (
                    <span key={c.id || c.classId || c.code} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-900 dark:text-white">{c.code || c.classCode}</span>
                      {c.subjectName && <span className="text-slate-600 dark:text-slate-400 text-[10px]">({c.subjectName})</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Success Banner */}
            {assignUserSuccess && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{assignUserSuccess}</span>
              </div>
            )}

            {/* Error Banner */}
            {assignUserError && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{assignUserError}</span>
              </div>
            )}

            {/* Class Selection Controls */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
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
                            const sem = String(rawSem).toLowerCase().trim()
                            const filterVal = assignSeasonFilter.toLowerCase().trim()
                            const filterSeasonWord = filterVal.split(' ')[0]
                            const matches = sem.includes(filterVal) || filterVal.includes(sem) || (filterSeasonWord && sem.includes(filterSeasonWord))
                            if (!matches) return false
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
                  {getAvailableAcademicSeasons(
                    new Date(),
                    availableClasses.map((c: any) => {
                      const rawSem = c.semesterSeason || (c.semester && typeof c.semester === 'object' ? c.semester.season || c.semester.code || c.semester.label : c.semester) || ''
                      return String(rawSem)
                    }).filter(Boolean)
                  ).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkbox List */}
              <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 space-y-1 bg-white dark:bg-slate-900">
                {availableClasses
                  .filter((c: any) => {
                    if (assignSeasonFilter !== 'all') {
                      const rawSem = c.semesterSeason || (c.semester && typeof c.semester === 'object' ? c.semester.season || c.semester.code || c.semester.label : c.semester) || ''
                      const sem = String(rawSem).toLowerCase().trim()
                      const filterVal = assignSeasonFilter.toLowerCase().trim()
                      const filterSeasonWord = filterVal.split(' ')[0]
                      const matches = sem.includes(filterVal) || filterVal.includes(sem) || (filterSeasonWord && sem.includes(filterSeasonWord))
                      if (!matches) return false
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
                            ? 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
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
                            <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{c.subjectName || c.name || t('admin.classes.title', 'Class')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {c.semesterSeason && (
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">{c.semesterSeason}</span>
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
            <p className="text-sm font-medium text-slate-900 dark:text-white">{t('admin.users.import_select_type', 'Chọn loại dữ liệu bạn muốn nhập từ tệp:')}</p>
            <div className={cn("grid gap-3", isStudentView ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3")}>
              <button
                onClick={() => setImportType('student')}
                className={`p-3.5 rounded-xl border text-sm text-left transition-all cursor-pointer ${
                  importType === 'student'
                    ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 text-slate-900 dark:text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400'
                }`}
              >
                <div className="font-bold mb-1 flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span>Danh sách Sinh viên</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">Mã sinh viên (MSSV), Họ tên, Email, Chuyên ngành...</div>
              </button>

              {!isStudentView && (
                <button
                  onClick={() => setImportType('lecturer')}
                  className={`p-3.5 rounded-xl border text-sm text-left transition-all cursor-pointer ${
                    importType === 'lecturer'
                      ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 text-slate-900 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400'
                  }`}
                >
                  <div className="font-bold mb-1 flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5" />
                    </div>
                    <span>Đội ngũ Giảng viên</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">Mã giảng viên (MSGV), Họ tên, Email, Bộ môn...</div>
                </button>
              )}

              <button
                onClick={() => setImportType('assignment')}
                className={`p-3.5 rounded-xl border text-sm text-left transition-all cursor-pointer ${
                  importType === 'assignment'
                    ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-950/20 text-slate-900 dark:text-white shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400'
                }`}
              >
                <div className="font-bold mb-1 flex items-center gap-1.5 text-slate-900 dark:text-white">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
                    <School className="w-3.5 h-3.5" />
                  </div>
                  <span>Xếp lớp học sinh viên</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">Phân công sinh viên vào các lớp theo học kỳ</div>
              </button>
            </div>

            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
              <p className="font-semibold">{t('admin.users.import_note', 'Lưu ý: Vui lòng đảm bảo tệp Excel (.xlsx) tuân thủ đúng định dạng và thứ tự các cột quy định.')}</p>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setImportModal(false)} className="rounded-xl">
                {t('ui.cancel', 'Hủy')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={importing} className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 hover:from-orange-600 hover:via-amber-500 hover:to-orange-500 text-white rounded-xl shadow-md shadow-orange-500/20 font-bold px-4">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('admin.users.upload_excel_btn', 'Chọn tệp Excel tải lên')}
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── MODAL KHÓA / MỞ KHÓA TÀI KHOẢN (CĂN GIỮA, BO TRÒN NHẸ, TỶ LỆ CÂN ĐỐI) ── */}
        <Modal
          isOpen={!!lockTargetUser}
          onClose={() => !lockingUser && setLockTargetUser(null)}
          maxWidth="md"
          className="rounded-xl"
          title={
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shrink-0">
                {String(lockTargetUser?.status).toLowerCase() === 'locked' ? (
                  <Unlock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {String(lockTargetUser?.status).toLowerCase() === 'locked'
                  ? 'Mở khóa tài khoản người dùng'
                  : 'Tạm khóa tài khoản người dùng'}
              </span>
            </div>
          }
          description="Xác nhận thay đổi trạng thái kích hoạt và quyền truy cập hệ thống của tài khoản."
        >
          {lockTargetUser && (() => {
            const isCurrentlyLocked = String(lockTargetUser.status).toLowerCase() === 'locked'
            const roleName = String(lockTargetUser.role?.name || lockTargetUser.role || 'USER').toUpperCase()
            const code = lockTargetUser.code || lockTargetUser.studentCode || lockTargetUser.lecturerCode || '—'

            return (
              <div className="space-y-4">
                {/* User Preview Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
                  <AnonymousAvatar
                    src={lockTargetUser.avatar || lockTargetUser.avatarUrl || lockTargetUser.profile?.avatar}
                    alt={lockTargetUser.fullName || lockTargetUser.name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {lockTargetUser.fullName || lockTargetUser.name || 'Người dùng'}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {roleName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-mono truncate mt-0.5">
                      {lockTargetUser.email}
                    </p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono mt-0.5 font-medium">
                      Mã: {code} · Campus: {lockTargetUser.campus || 'FPT Quy Nhơn'}
                    </p>
                  </div>
                </div>

                {/* Explanation Notice - Neutral frame with clear black text */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white leading-relaxed">
                  {isCurrentlyLocked ? (
                    <p>
                      Tài khoản sẽ được chuyển về trạng thái <strong>Hoạt động</strong>. Người dùng có thể đăng nhập ngay lập tức và tiếp tục tham gia các hoạt động học tập, giảng dạy.
                    </p>
                  ) : (
                    <p>
                      Tài khoản sẽ chuyển sang trạng thái <strong>Đã khóa</strong>. Người dùng sẽ bị thu hồi phiên đăng nhập hiện tại và không thể truy cập hệ thống cho đến khi được mở khóa lại.
                    </p>
                  )}
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLockTargetUser(null)}
                    disabled={lockingUser}
                    className="rounded-xl px-4"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={confirmToggleLock}
                    isLoading={lockingUser}
                    className={cn(
                      "rounded-xl px-4 font-bold shadow-md text-white cursor-pointer",
                      isCurrentlyLocked
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                        : "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    )}
                  >
                    {isCurrentlyLocked ? 'Xác nhận mở khóa' : 'Xác nhận khóa tài khoản'}
                  </Button>
                </div>
              </div>
            )
          })()}
        </Modal>

        {/* ── MODAL XÓA TÀI KHOẢN (CĂN GIỮA, BO TRÒN NHẸ, TỶ LỆ CÂN ĐỐI) ── */}
        <Modal
          isOpen={!!deleteTargetUser}
          onClose={() => !deletingUser && setDeleteTargetUser(null)}
          maxWidth="md"
          className="rounded-xl"
          title={
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Xác nhận xóa tài khoản người dùng
              </span>
            </div>
          }
          description="Hành động này mang tính vĩnh viễn và không thể hoàn tác sau khi thực hiện."
        >
          {deleteTargetUser && (
            <div className="space-y-4">
              {/* User Preview Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3.5">
                <AnonymousAvatar
                  src={deleteTargetUser.avatar || deleteTargetUser.avatarUrl || deleteTargetUser.profile?.avatar}
                  alt={deleteTargetUser.fullName || deleteTargetUser.name}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {deleteTargetUser.fullName || deleteTargetUser.name || 'Người dùng'}
                  </p>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-mono truncate mt-0.5">
                    {deleteTargetUser.email}
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono mt-0.5 font-medium">
                    Mã: {deleteTargetUser.code || deleteTargetUser.studentCode || deleteTargetUser.lecturerCode || '—'}
                  </p>
                </div>
              </div>

              {/* Warning Box - Neutral frame with clear black text */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <p>
                  Tài khoản này và các liên kết quyền hạn sẽ bị <strong>xóa hoàn toàn</strong> khỏi hệ thống. Nếu tài khoản đang phụ trách giảng dạy hoặc có bài nộp, dữ liệu có thể bị ảnh hưởng.
                </p>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTargetUser(null)}
                  disabled={deletingUser}
                  className="rounded-xl px-4"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={confirmDeleteUser}
                  isLoading={deletingUser}
                  className="rounded-xl px-4 font-bold shadow-md shadow-rose-600/20 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                >
                  Xác nhận xóa vĩnh viễn
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}
