'use client'

import * as React from 'react'
import Link from 'next/link'
import { Sparkles, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageDropdown } from '@/components/i18n/LanguageDropdown'
import { LiveClock } from '@/features/notes/components/LiveClock'
import { useTheme } from '@/providers/theme-provider'
import { useLanguage } from '@/providers/language-provider'

export function PublicHeader() {
  const { theme, toggleTheme } = useTheme()
  const { language, t } = useLanguage()
  const isVi = language === 'vi'

  return (
    <header className="h-20 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/60 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 w-full transition-colors">
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F26F21] to-[#FB923C] flex items-center justify-center text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">AITA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/30">
                FPT University
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">AI Teaching Assistant</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Link href="/" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
            {isVi ? 'Trang chủ' : 'Home'}
          </Link>
          <Link href="/features" className="hover:text-orange-500 transition-colors">
            {isVi ? 'Tính năng hệ thống' : 'Features'}
          </Link>
          <Link href="/about" className="hover:text-orange-500 transition-colors">
            {isVi ? 'Giới thiệu' : 'About'}
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <div className="hidden xl:block">
            <LiveClock />
          </div>
          <LanguageDropdown />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Bật giao diện tối' : 'Bật giao diện sáng'}
            className="h-10 w-10 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-xs"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
          </button>
          <Link href="/login">
            <Button size="sm" className="bg-[#F26F21] hover:bg-[#D95C14] text-white shadow-md shadow-orange-500/20">
              {isVi ? 'Đăng nhập' : 'Sign in'}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
