'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { Modal } from '@/components/ui/modal'
import type { NavItem, UserRole } from '@/types'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/providers/language-provider'

interface DashboardLayoutProps {
  navItems: NavItem[]
  title: string
  roleLabel: string
  requiredRole?: UserRole
  headerTitle?: string
  headerSubtitle?: string
  children: React.ReactNode
}

function hasPermission(userRole?: UserRole | null, reqRole?: UserRole): boolean {
  if (!reqRole) return true
  if (!userRole) return false
  if (userRole === 'admin') return true
  if (userRole === 'lecturer') return reqRole === 'lecturer'
  if (userRole === 'student') return reqRole === 'student'
  return false
}

export function DashboardLayout({
  navItems,
  title,
  roleLabel,
  requiredRole,
  headerTitle,
  headerSubtitle,
  children,
}: DashboardLayoutProps) {
  const { user, role, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      } else if (user?.requirePasswordChange && pathname !== '/profile') {
        router.replace('/profile?changePassword=required')
      } else if (requiredRole && !hasPermission(role, requiredRole)) {
        // Redirect unauthorized access to the user's role-specific home portal
        const roleHome = role === 'admin' ? '/admin' : role === 'lecturer' ? '/lecturer' : '/student'
        router.replace(roleHome)
      }
    }
  }, [loading, isAuthenticated, role, requiredRole, router, user?.requirePasswordChange, pathname])

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/20 animate-bounce">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400">{t('ui.preparing_env', 'Đang chuẩn bị môi trường AITA...')}</p>
      </div>
    )
  }

  if (!isAuthenticated || (requiredRole && !hasPermission(role, requiredRole)) || (user?.requirePasswordChange && pathname !== '/profile')) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/20 animate-bounce">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400">{t('ui.authenticating', 'Đang xác thực và chuyển hướng quyền truy cập...')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      <div className="hidden lg:block"><Sidebar navItems={navItems} title={title} roleLabel={roleLabel} collapsed={collapsed} /></div>
      <Modal isOpen={mobileOpen} onClose={() => setMobileOpen(false)} title={t('ui.navigation', 'Điều hướng')} maxWidth="sm"><Sidebar navItems={navItems} title={title} roleLabel={roleLabel} onNavigate={() => setMobileOpen(false)} className="h-auto w-full border-0" /></Modal>
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={headerTitle} subtitle={headerSubtitle} onMenu={() => setMobileOpen(true)} onCollapse={() => setCollapsed(value => !value)} collapsed={collapsed} />
        <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
