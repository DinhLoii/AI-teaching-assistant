'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useLanguage, type Language } from '@/providers/language-provider'
import { VietnamFlag, UsaFlag } from '@/components/ui/flags'

interface Props {
  variant?: 'full' | 'compact'
  className?: string
}

export function LanguageDropdown({ variant = 'compact', className = '' }: Props) {
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (code: Language) => {
    setLanguage(code)
    setOpen(false)
  }

  const isVi = language === 'vi'

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Trigger Button: Hiển thị lá cờ SVG & tên đầy đủ không viết tắt */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          h-10 px-3 flex items-center gap-2.5 rounded-2xl border transition-all duration-150
          border-slate-200/80 hover:border-orange-500/40 bg-white/90 hover:bg-white shadow-xs
          dark:border-slate-800 dark:hover:border-orange-500/40 dark:bg-slate-900/90 dark:hover:bg-slate-900
          text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400
          cursor-pointer select-none group
        "
        aria-haspopup="listbox"
        aria-expanded={open}
        title={isVi ? 'Đang chọn Tiếng Việt' : 'English selected'}
      >
        <span className="flex items-center shrink-0">
          {isVi ? <VietnamFlag className="w-5 h-3.5" /> : <UsaFlag className="w-5 h-3.5" />}
        </span>

        <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {isVi ? 'Tiếng Việt' : 'English'}
        </span>

        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ml-0.5 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          role="listbox"
          className="
            absolute right-0 top-full mt-2 z-50 w-56
            rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl
            shadow-xl shadow-slate-300/40
            dark:border-slate-800 dark:bg-[#0f1117]/95
            dark:shadow-black/60
            overflow-hidden animate-fade-in-up
          "
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {isVi ? 'Chọn ngôn ngữ' : 'Select language'}
            </p>
          </div>

          <div className="p-1.5 space-y-1">
            {/* Tiếng Việt - Lá cờ Việt Nam */}
            <button
              type="button"
              onClick={() => handleSelect('vi')}
              className={`
                w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5
                text-left transition-all duration-150 cursor-pointer
                ${
                  isVi
                    ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <VietnamFlag className="w-5 h-3.5" />
                <div>
                  <p className="text-xs font-bold leading-tight">Tiếng Việt</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Việt Nam</p>
                </div>
              </div>
              {isVi && <Check size={14} className="shrink-0 text-orange-500" />}
            </button>

            {/* English - Lá cờ Mỹ */}
            <button
              type="button"
              onClick={() => handleSelect('en')}
              className={`
                w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5
                text-left transition-all duration-150 cursor-pointer
                ${
                  !isVi
                    ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UsaFlag className="w-5 h-3.5" />
                <div>
                  <p className="text-xs font-bold leading-tight">English</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Mỹ (United States)</p>
                </div>
              </div>
              {!isVi && <Check size={14} className="shrink-0 text-orange-500" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
