'use client'

import * as React from 'react'
import Link from 'next/link'
import { useLanguage } from '@/providers/language-provider'

export function PublicFooter() {
  const { language } = useLanguage()
  const isVi = language === 'vi'

  return (
    <footer className="border-t border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950 py-8 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© 2026 AI Teaching Assistant (AITA) — Trường Đại Học FPT. Thiết kế và phát triển phục vụ công tác giảng dạy & học tập.</p>
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-orange-500 transition-colors">{isVi ? 'Trang chủ' : 'Home'}</Link>
          <Link href="/features" className="hover:text-orange-500 transition-colors">{isVi ? 'Tính năng' : 'Features'}</Link>
          <Link href="/about" className="hover:text-orange-500 transition-colors">{isVi ? 'Về dự án' : 'About'}</Link>
        </div>
      </div>
    </footer>
  )
}
