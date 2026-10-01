'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Globe } from 'lucide-react'
import { useLanguage, LANGUAGES, type Language } from '@/providers/language-provider'

interface Props {
  variant?: 'full' | 'compact'
}

export function LanguageDropdown({ variant = 'compact' }: Props) {
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]

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

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center justify-center gap-1.5 rounded-xl border transition-all duration-150
          text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white
          border-slate-200 hover:border-slate-300 bg-white/80 hover:bg-white shadow-xs
          dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-900
          ${variant === 'full' ? 'h-9 px-3.5 text-sm min-w-[140px]' : 'h-9 px-2.5 min-w-[56px]'}
        `}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current.name}
      >
        <span className="text-base leading-none select-none">{current.flag}</span>
        <span className="font-extrabold text-[11px] tracking-wider leading-none select-none">
          {current.label}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          role="listbox"
          className="
            absolute right-0 top-full mt-2 z-50 w-44
            rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl
            shadow-xl shadow-slate-200/50
            dark:border-slate-800 dark:bg-[#0f1117]/95
            dark:shadow-black/50
            overflow-hidden animate-fade-in-up
          "
        >
          <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800/80">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t('ui.language')}
            </p>
          </div>

          <div className="p-1.5 space-y-0.5">
            {LANGUAGES.map((lang) => {
              const isActive = lang.code === language
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    w-full flex items-center gap-2.5 rounded-xl px-3 py-2
                    text-xs font-semibold text-left
                    transition-colors duration-150
                    ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                    }
                  `}
                >
                  <span className="text-base leading-none w-5 text-center shrink-0">
                    {lang.flag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="leading-tight truncate">{lang.name}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{lang.label}</p>
                  </div>
                  {isActive && <Check size={14} className="shrink-0 text-orange-500" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
