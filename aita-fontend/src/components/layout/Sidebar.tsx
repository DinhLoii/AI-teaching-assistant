'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import type { NavItem } from '@/types'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Library,
  FileSignature,
  BarChart3,
  FileText,
  Bot,
  Settings,
  FileCheck,
  Bell,
  UserCircle,
  GraduationCap,
  LogOut,
  Sparkles,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  BookOpen,
  Library,
  FileSignature,
  BarChart3,
  FileText,
  Bot,
  Settings,
  FileCheck,
  Bell,
  UserCircle,
  GraduationCap,
}

interface SidebarProps {
  navItems: NavItem[]
  title: string
  roleLabel: string
  collapsed?: boolean
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ navItems, title, roleLabel, collapsed = false, onNavigate, className }: SidebarProps) {
  const pathname = usePathname()
  const { user, role, logout } = useAuth()
  const { t } = useLanguage()

  // Group by category
  const categories = React.useMemo(() => {
    const map = new Map<string, NavItem[]>()
    navItems.forEach((item) => {
      const cat = item.category || 'Khác'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    })
    return Array.from(map.entries())
  }, [navItems])

  return (
    <aside aria-label={title} className={cn('border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 transition-colors', collapsed ? 'w-20' : 'w-64', className)}>
      <div>
        {/* Logo & Portal Branding */}
        <div className={cn('border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3', collapsed ? 'p-5' : 'p-6')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F26F21] to-[#FB923C] flex items-center justify-center text-white shadow-lg shadow-orange-500/25 ring-2 ring-orange-400/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className={collapsed ? 'hidden' : undefined}>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">AITA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20">
                FPT
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {role === 'admin' ? t('nav.role_admin', 'Quản trị viên') : role === 'lecturer' ? t('nav.role_lecturer', 'Giảng viên') : role === 'student' ? t('nav.role_student', 'Sinh viên') : t(roleLabel)}
            </p>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-175px)] custom-scrollbar">
          {categories.map(([category, items]) => (
            <div key={category} className="space-y-1">
              <div className={cn('px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500', collapsed && 'sr-only')}>
                {t(category)}
              </div>
              {items.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || LayoutDashboard
                const isGradingMatch = item.id === 'grading-assignments' && Boolean(pathname?.startsWith('/lecturer/assignments/'))
                const isActive =
                  pathname === item.path || isGradingMatch ||
                  (item.path !== '/admin' &&
                    item.path !== '/lecturer' &&
                    item.path !== '/student' &&
                    Boolean(pathname?.startsWith(item.path)))

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={onNavigate}
                    title={collapsed ? t(item.label) : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                      isActive
                        ? 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                    )}
                  >
                    <IconComponent
                      className={cn(
                        'w-4 h-4 transition-colors shrink-0',
                        isActive
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                      )}
                    />
                    <span className={collapsed ? 'sr-only' : 'truncate'}>{t(item.label)}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 transition-colors">
        <div className="flex items-center justify-between gap-3">
          <Link href="/profile" onClick={onNavigate} aria-label={t('Hồ sơ cá nhân', 'Hồ sơ cá nhân')} className={cn('flex items-center gap-2.5 min-w-0', collapsed && 'hidden')}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F26F21] to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.fullName || t('admin.users.default_name', 'Người dùng')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            title={t('nav.logout', 'Đăng xuất')}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
