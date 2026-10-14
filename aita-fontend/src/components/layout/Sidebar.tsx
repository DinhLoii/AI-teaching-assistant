'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useLanguage } from '@/providers/language-provider'
import { useNotifications } from '@/providers/notification-provider'
import { AnonymousAvatar } from '@/components/ui/avatar'
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
  Layers,
  Shield,
  Briefcase,
  ArrowLeftRight,
  ArrowLeft,
  Cpu,
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
  Sparkles,
  Layers,
  Shield,
  Briefcase,
  ArrowLeftRight,
  Cpu,
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
  const { unreadCount } = useNotifications()

  const isUserPortal = Boolean(pathname?.startsWith('/student') || pathname === '/profile')

  // Group by category
  const categories = React.useMemo(() => {
    const items = [...navItems]

    if (isUserPortal) {
      if (role === 'lecturer') {
        if (!items.some(i => i.id === 'teacher-system')) {
          items.push({
            id: 'teacher-system',
            label: 'Hệ thống giáo viên',
            path: '/lecturer',
            icon: 'Briefcase',
            category: 'Hệ thống quản lý',
          })
        }
      } else if (role === 'admin') {
        if (!items.some(i => i.id === 'admin-system')) {
          items.push({
            id: 'admin-system',
            label: 'Hệ thống admin',
            path: '/admin',
            icon: 'Shield',
            category: 'Hệ thống quản lý',
          })
        }
      }
    }

    const map = new Map<string, NavItem[]>()
    items.forEach((item) => {
      const cat = item.category || 'Khác'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    })
    return Array.from(map.entries())
  }, [navItems, isUserPortal, role])

  return (
    <aside
      aria-label={title}
      className={cn(
        'border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/90 backdrop-blur-2xl flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30 transition-all duration-200',
        collapsed ? 'w-20' : 'w-72',
        className
      )}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Header: FPT Logo Only */}
        <div className={cn('border-b border-slate-200/80 dark:border-slate-800/80 flex items-center shrink-0', collapsed ? 'p-4 justify-center' : 'px-6 py-5')}>
          <Link href={role ? `/${role}` : '/login'} className="flex items-center group">
            <Image
              src="/fpt-logo.png"
              alt="Đại Học FPT"
              width={240}
              height={95}
              className={cn('object-contain transition-transform duration-200 group-hover:scale-105', collapsed ? 'h-8 w-auto' : 'h-11 sm:h-12 w-auto')}
              priority
            />
          </Link>
        </div>

        {/* Navigation Categories */}
        <div className="p-3.5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {categories.map(([category, items]) => (
            <div key={category} className="space-y-1">
              <div className={cn('px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500', collapsed && 'sr-only')}>
                {t(category)}
              </div>
              {items.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || LayoutDashboard
                const isGradingMatch = item.id === 'grading-assignments' && Boolean(pathname?.startsWith('/lecturer/assignments/'))
                const isClassesMatch = item.id === 'classes' && (Boolean(pathname?.startsWith('/student/classes')) || Boolean(pathname?.startsWith('/student/courses')))
                const isActive =
                  pathname === item.path || isGradingMatch || isClassesMatch ||
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
                      'flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/15 via-orange-500/10 to-transparent text-orange-600 dark:text-orange-400 font-bold shadow-xs border-l-[3px] border-orange-500 pl-3.5'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                    )}
                  >
                    <IconComponent
                      className={cn(
                        'w-[18px] h-[18px] transition-colors shrink-0',
                        isActive
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                      )}
                    />
                    <span className={collapsed ? 'sr-only' : 'truncate'}>{t(item.label)}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span
                        className={cn(
                          'ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white shadow-xs',
                          collapsed && 'sr-only'
                        )}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Portal Switcher + User Profile */}
      <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800/80">
        {/* Switch back to Main / User Portal when in Admin or Teacher portal */}
        {!isUserPortal && (role === 'admin' || role === 'lecturer') && (
          <div className="p-2.5 px-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <Link
              href="/student"
              onClick={onNavigate}
              title={collapsed ? t('nav.back_to_user', 'Quay về hệ thống trang chủ') : undefined}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                'border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-2xs',
                collapsed && 'justify-center px-2'
              )}
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform group-hover:-translate-x-0.5" />
              <span className={cn('truncate', collapsed && 'sr-only')}>
                {t('nav.back_to_user', 'Quay về hệ thống trang chủ')}
              </span>
            </Link>
          </div>
        )}

        {/* User Footer Profile & Logout */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 transition-colors">
          <div className="flex items-center justify-between gap-3">
            <Link href="/profile" onClick={onNavigate} aria-label={t('Hồ sơ cá nhân', 'Hồ sơ cá nhân')} className={cn('flex items-center gap-2.5 min-w-0', collapsed && 'hidden')}>
              <AnonymousAvatar
                src={(user as any)?.avatar || (user as any)?.avatarUrl || (user as any)?.profile?.avatar}
                alt={user?.fullName || 'User'}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user?.fullName || t('admin.users.default_name', 'Người dùng')}
                </p>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-mono">{user?.email || ''}</p>
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
      </div>
    </aside>

  )
}
