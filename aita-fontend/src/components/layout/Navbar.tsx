'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useLanguage } from '@/providers/language-provider'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'
import { CampusSelector } from '@/components/layout/CampusSelector'
import { Shield, School, GraduationCap, Sun, Moon, Menu, Bell } from 'lucide-react'
import { useNotifications } from '@/providers/notification-provider'

interface NavbarProps {
  title?: string
  subtitle?: string
  onMenu?: () => void
  onCollapse?: () => void
  collapsed?: boolean
}

function getMajorInfo(role: string | null | undefined, studentCode?: string, isVi: boolean = true) {
  if (role === 'lecturer') {
    return {
      major: isVi ? 'Kỹ thuật phần mềm' : 'Software Engineering',
      majorCode: 'SE',
      department: isVi ? 'Khoa CNTT' : 'IT Faculty',
      subInfo: isVi ? 'Giảng viên chuyên ngành' : 'Lecturer',
    }
  }
  if (role === 'admin') {
    return {
      major: isVi ? 'Ban Đào tạo' : 'Academic Affairs',
      majorCode: 'FPTU',
      department: isVi ? 'Quản trị hệ thống' : 'System Admin',
      subInfo: isVi ? 'Quản trị viên' : 'Administrator',
    }
  }

  // Student role:
  const code = (studentCode || '').toUpperCase()
  let major = isVi ? 'Kỹ thuật phần mềm' : 'Software Engineering'
  let majorCode = 'SE'

  if (code.startsWith('IA')) {
    major = isVi ? 'An toàn thông tin' : 'Information Assurance'
    majorCode = 'IA'
  } else if (code.startsWith('AI')) {
    major = isVi ? 'Trí tuệ nhân tạo' : 'Artificial Intelligence'
    majorCode = 'AI'
  } else if (code.startsWith('GD')) {
    major = isVi ? 'Thiết kế mỹ thuật số' : 'Graphic Design'
    majorCode = 'GD'
  } else if (code.startsWith('IS')) {
    major = isVi ? 'Hệ thống thông tin' : 'Information Systems'
    majorCode = 'IS'
  }

  return {
    major: `${major} (${majorCode})`,
    majorName: major,
    majorCode,
    classCode: 'SE1701',
    cohort: 'K17',
    semester: 'Spring 2026',
  }
}

export function Navbar({ title, subtitle, onMenu, onCollapse, collapsed }: NavbarProps) {
  const { user, role } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, language } = useLanguage()
  const { unreadCount, hasNew, isConnected } = useNotifications()
  const isVi = language === 'vi'

  // Format Display Name & ID for User
  const displayName = user?.fullName || user?.name || (role === 'student' ? 'Nguyễn Văn An' : role === 'lecturer' ? 'TS. Trần Văn Nam' : 'Quản trị viên')
  const rawId = user?.studentCode || user?.lecturerCode || user?.externalId || user?.id
  const displayId = rawId ? (rawId.length > 12 ? rawId.slice(0, 10).toUpperCase() : rawId) : (role === 'student' ? 'SE170245' : role === 'lecturer' ? 'GV1042' : 'ADM001')
  const idPrefix = role === 'student' ? 'MSSV' : role === 'lecturer' ? 'MSGV' : 'ID'

  const majorInfo = getMajorInfo(role, displayId, isVi)

  return (
    <header className="min-h-16 gap-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl px-3 md:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button type="button" aria-label={t('ui.open_menu', 'Mở menu điều hướng')} onClick={onMenu} className="p-2 lg:hidden">
          <Menu size={20} />
        </button>

        {/* User Identity Display: Tên, Chuyên ngành & Mã số SV (Không avatar) */}
        <Link
          href="/profile"
          title={t('nav.view_profile', 'Xem thông tin tài khoản')}
          className="group flex flex-col justify-center min-w-0 transition-all select-none text-left py-1"
        >
          {/* Line 1: Name + Major Tag */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate max-w-[150px] sm:max-w-[220px]">
              {displayName}
            </span>
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 tracking-wide">
              {majorInfo.major}
            </span>
          </div>

          {/* Line 2: MSSV, Class & Semester */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
            <span className="font-mono text-[11px] tracking-wider shrink-0">
              {idPrefix}: <span className="font-bold text-slate-800 dark:text-slate-200">{displayId}</span>
            </span>
            {role === 'student' && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-xs font-light">•</span>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {majorInfo.classCode}
                </span>
                <span className="text-slate-300 dark:text-slate-700 text-xs font-light hidden sm:inline">•</span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                  {isVi ? 'Kỳ' : 'Sem'} {majorInfo.semester}
                </span>
              </>
            )}
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Campus Display */}
        <CampusSelector />

        {/* Language Switcher */}
        <LanguageDropdown />

        {/* Notification Bell with Real-time WebSocket Counter */}
        <Link
          href={role ? `/${role}/notifications` : '/student/notifications'}
          title={
            unreadCount > 0
              ? `${unreadCount} ${t('nav.unread_notifs', 'thông báo chưa đọc')}`
              : t('nav.notifications', 'Thông báo')
          }
          className="relative h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-all shadow-xs group"
        >
          <Bell
            size={17}
            className={`transition-transform duration-200 group-hover:scale-110 ${
              hasNew ? 'animate-bounce text-orange-600 dark:text-orange-400' : ''
            }`}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm shadow-orange-500/40 ring-2 ring-white dark:ring-slate-950 animate-in zoom-in-50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {/* Subtle live WebSocket connection dot */}
          {isConnected && (
            <span
              title="Real-time WebSocket connected"
              className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900"
            />
          )}
        </Link>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? t('nav.theme.dark', 'Chế độ tối') : t('nav.theme.light', 'Chế độ sáng')}
          className="h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-all shadow-xs"
        >
          {theme === 'light' ? (
            <Moon size={16} className="text-slate-600" />
          ) : (
            <Sun size={16} className="text-amber-400" />
          )}
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Current Role Badge */}
        {role && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-xs font-bold text-orange-600 dark:text-orange-400">
            {role === 'admin' && <Shield className="w-3.5 h-3.5" />}
            {role === 'lecturer' && <School className="w-3.5 h-3.5" />}
            {role === 'student' && <GraduationCap className="w-3.5 h-3.5" />}
            <span>
              {role === 'admin' ? t('nav.role_admin', 'Quản trị') : role === 'lecturer' ? t('nav.role_lecturer', 'Giảng viên') : t('nav.role_student', 'Sinh viên')}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
