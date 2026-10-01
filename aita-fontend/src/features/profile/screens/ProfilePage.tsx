'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { STUDENT_NAV, LECTURER_NAV, ADMIN_NAV } from '@/config/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'
import { authApi } from '@/lib/api/modules/auth'
import { loginDestination } from '@/lib/auth/redirect'
import { useLanguage } from '@/providers/language-provider'
import {
  User,
  Mail,
  Shield,
  Key,
  Lock,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  School,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, role, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const [oldPassword, setOldPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [changingPass, setChangingPass] = React.useState(false)
  const [passMessage, setPassMessage] = React.useState<{ text: string; error?: boolean } | null>(null)
  
  const [showOldPassword, setShowOldPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = React.useState(false)
  const [fullName, setFullName] = React.useState(user?.fullName || '')
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [profileMessage, setProfileMessage] = React.useState<{ text: string; error?: boolean } | null>(null)

  React.useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName)
    }
  }, [user?.fullName])

  const navItems = role === 'admin' ? ADMIN_NAV : role === 'lecturer' ? LECTURER_NAV : STUDENT_NAV
  const roleTitle = role === 'admin' ? t('profile.role_admin', 'Quản trị viên') : role === 'lecturer' ? t('profile.role_lecturer', 'Giảng viên') : t('profile.role_student', 'Sinh viên')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPassMessage({ text: t('profile.pwd_mismatch', 'Mật khẩu xác nhận không trùng khớp!'), error: true })
      return
    }
    if (newPassword.length < 6) {
      setPassMessage({ text: t('profile.pwd_length', 'Mật khẩu mới phải có tối thiểu 6 ký tự!'), error: true })
      return
    }

    setChangingPass(true)
    setPassMessage(null)
    try {
      await authApi.changePassword({ oldPassword, newPassword })
      await refreshProfile()
      setPassMessage({ text: t('profile.pwd_success', 'Đổi mật khẩu thành công!'), error: false })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (searchParams?.get('changePassword') === 'required') {
        setTimeout(() => {
          router.replace(loginDestination('/', role ?? 'student'))
        }, 1500)
      }
    } catch (err: any) {
      setPassMessage({ text: err?.message || t('profile.pwd_error', 'Lỗi khi đổi mật khẩu.'), error: true })
    } finally {
      setChangingPass(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMessage(null)
    try {
      const fd = new FormData()
      fd.append('fullName', fullName)
      // Here you could also append an avatar file if a file input was implemented
      await authApi.updateProfile(fd)
      await refreshProfile()
      setProfileMessage({ text: t('profile.update_success', 'Cập nhật hồ sơ thành công!'), error: false })
      setIsEditingProfile(false)
    } catch (err: any) {
      setProfileMessage({ text: err?.message || t('profile.update_error', 'Lỗi khi cập nhật hồ sơ.'), error: true })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <DashboardLayout
      navItems={navItems}
      title="AITA Profile"
      roleLabel={roleTitle}
      headerTitle={t('profile.header_title', 'Hồ sơ tài khoản')}
      headerSubtitle={t('profile.header_subtitle', 'Xem thông tin định danh và quản lý bảo mật tài khoản')}
    >
      <div className="space-y-8 max-w-4xl">
        {/* User Card */}
        <div className="rounded-3xl p-8 bg-gradient-to-r from-orange-50 via-amber-50/60 to-blue-50/70 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-950 border border-orange-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs dark:shadow-xl transition-colors">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-orange-500/20 shrink-0">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.fullName || t('admin.users.default_name', 'Người dùng')}</h2>
                <Badge variant="orange" className="text-[10px] uppercase">
                  {role || 'student'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{user?.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{t('profile.user_code', 'Mã định danh:')} {(user as any)?.code || (user as any)?.studentCode || 'HE170001'}</p>
            </div>
          </div>
          <div className="shrink-0 mt-4 md:mt-0">
            <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(!isEditingProfile)}>
              {isEditingProfile ? t('profile.cancel_edit', 'Hủy cập nhật') : t('profile.edit_profile', 'Sửa hồ sơ')}
            </Button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditingProfile && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('profile.edit_title', 'Chỉnh sửa hồ sơ')}</h3>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              {profileMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    profileMessage.error
                      ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                  }`}
                >
                  {profileMessage.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('profile.full_name', 'Họ và tên')}</label>
                <Input
                  type="text"
                  placeholder={t('profile.full_name_placeholder', 'Nhập họ và tên...')}
                  icon={<User className="w-4 h-4 text-slate-400" />}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Later we could add an avatar upload input here */}
              
              <Button variant="primary" size="md" type="submit" isLoading={savingProfile}>
                <span>{t('profile.save_profile', 'Lưu hồ sơ')}</span>
              </Button>
            </form>
          </Card>
        )}

        {/* Change Password Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('profile.change_pwd_title', 'Đổi mật khẩu tài khoản')}</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {passMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passMessage.error
                    ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                }`}
              >
                {passMessage.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{passMessage.text}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('profile.current_pwd', 'Mật khẩu hiện tại')}</label>
              <Input
                type={showOldPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4 text-slate-400" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowOldPassword((prev) => !prev)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('profile.new_pwd', 'Mật khẩu mới')}</label>
              <Input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4 text-slate-400" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('profile.confirm_pwd', 'Xác nhận mật khẩu mới')}</label>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={<Lock className="w-4 h-4 text-slate-400" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button variant="primary" size="md" type="submit" isLoading={changingPass}>
              <span>{t('profile.update_pwd_btn', 'Cập nhật mật khẩu')}</span>
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  )
}
