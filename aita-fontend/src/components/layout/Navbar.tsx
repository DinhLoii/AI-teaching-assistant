'use client'

import * as React from 'react'
import Link from 'next/link'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useLanguage } from '@/providers/language-provider'
import { useNotifications } from '@/providers/notification-provider'
import { LiveClock } from '@/features/notes/components/LiveClock'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'
import { Bell, Shield, School, GraduationCap, Sun, Moon, Menu, PanelLeftClose } from 'lucide-react'

interface NavbarProps {
  title?: string
  subtitle?: string
  onMenu?: () => void
  onCollapse?: () => void
  collapsed?: boolean
}

export function Navbar({ title, subtitle, onMenu, onCollapse, collapsed }: NavbarProps) {
  const { role } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <header className="min-h-16 gap-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl px-3 md:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <button type="button" aria-label={t('ui.open_menu', 'Mở menu điều hướng')} onClick={onMenu} className="p-2 lg:hidden"><Menu size={20} /></button>
      <button type="button" aria-label={collapsed ? t('ui.expand_nav', 'Mở rộng thanh điều hướng') : t('ui.collapse_nav', 'Thu gọn thanh điều hướng')} onClick={onCollapse} className="hidden p-2 lg:block"><PanelLeftClose size={20} /></button>
      <div className="min-w-0 flex-1">
        {title && (
          <h1 className="truncate text-sm md:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="hidden xl:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Realtime Clock */}
        <div className="hidden xl:block"><LiveClock /></div>

        {/* Language Switcher */}
        <LanguageDropdown />

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

        {/* Live Notification Bell */}
        <NotificationBell role={role} t={t} />
      </div>
    </header>
  )
}

// ─── Live notification bell ────────────────────────────────────────────────────────────

function NotificationBell({
  role,
  t,
}: {
  role: string | null
  t: (k: string, fallback: string) => string
}) {
  const { unreadCount, hasNew, clearNew } = useNotifications()

  React.useEffect(() => {
    if (hasNew) {
      const timer = setTimeout(clearNew, 4000)
      return () => clearTimeout(timer)
    }
  }, [hasNew, clearNew])

  return (
    <Link
      href={`/${role || 'student'}/notifications`}
      className="p-2.5 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-transparent hover:border-orange-200 dark:hover:border-orange-500/30 transition-all relative group"
      title={t('nav.notifications', 'Thông báo')}
    >
      {/* Bell — wiggle animation on new notification */}
      <Bell
        className={`w-4 h-4 transition-transform ${hasNew ? 'animate-[wiggle_0.4s_ease-in-out_3]' : ''}`}
      />

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <span
          className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-[#F26F21] text-white text-[9px] font-bold leading-none shadow-sm shadow-orange-500/40 ring-2 ring-white dark:ring-slate-950 transition-all ${hasNew ? 'animate-[pop_0.3s_cubic-bezier(0.36,0.07,0.19,0.97)_both]' : ''}`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Ping ring when brand-new notification arrived */}
      {hasNew && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-400/60 animate-ping pointer-events-none" />
      )}
    </Link>
  )
}
