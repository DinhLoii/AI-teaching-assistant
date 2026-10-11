'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MapPin, ChevronDown, Check, Building2 } from 'lucide-react'
import { CAMPUSES, getActiveCampus, setActiveCampus, CAMPUS_CHANGE_EVENT, type CampusInfo } from '@/lib/campus'
import { useLanguage } from '@/providers/language-provider'

interface Props {
  variant?: 'compact' | 'full'
  className?: string
}

export function CampusSelector({ variant = 'compact', className = '' }: Props) {
  const { language } = useLanguage()
  const isVi = language === 'vi'
  const [campus, setCampusState] = useState<CampusInfo>(CAMPUSES[0])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCampusState(getActiveCampus())

    const handleCampusChange = (e: any) => {
      if (e.detail) {
        setCampusState(e.detail)
      } else {
        setCampusState(getActiveCampus())
      }
    }

    window.addEventListener(CAMPUS_CHANGE_EVENT, handleCampusChange)
    window.addEventListener('storage', handleCampusChange)
    return () => {
      window.removeEventListener(CAMPUS_CHANGE_EVENT, handleCampusChange)
      window.removeEventListener('storage', handleCampusChange)
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (item: CampusInfo) => {
    setActiveCampus(item.id)
    setCampusState(item)
    setOpen(false)
  }

  const displayName = isVi ? campus.nameVi : campus.name
  const shortDisplay = campus.shortName

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          h-10 px-3 flex items-center gap-2 rounded-2xl border transition-all duration-150
          border-slate-200/80 hover:border-orange-500/40 bg-white/90 hover:bg-white shadow-xs
          dark:border-slate-800 dark:hover:border-orange-500/40 dark:bg-slate-900/90 dark:hover:bg-slate-900
          text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400
          group cursor-pointer select-none
        "
        aria-haspopup="listbox"
        aria-expanded={open}
        title={displayName}
      >
        <div className="w-5 h-5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
          <MapPin size={13} className="text-orange-600 dark:text-orange-400" />
        </div>

        <div className="flex flex-col items-start leading-tight text-left">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Campus
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
            <span className="hidden xl:inline">{displayName}</span>
            <span className="xl:hidden">{shortDisplay}</span>
          </span>
        </div>

        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold ml-0.5">
          {campus.code}
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
            absolute right-0 top-full mt-2 z-50 w-72
            rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl
            shadow-xl shadow-slate-300/40
            dark:border-slate-800 dark:bg-[#0f1117]/95
            dark:shadow-black/60
            overflow-hidden animate-fade-in-up
          "
        >
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-orange-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {isVi ? 'Cơ sở đào tạo FPT' : 'FPT University Campuses'}
              </p>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              {isVi ? 'Trực tuyến' : 'Live'}
            </span>
          </div>

          <div className="p-1.5 space-y-1">
            {CAMPUSES.map((item) => {
              const isActive = item.id === campus.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`
                    w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5
                    text-left transition-all duration-150 cursor-pointer
                    ${
                      isActive
                        ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <MapPin
                      size={14}
                      className={`shrink-0 mt-0.5 ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold truncate leading-tight">
                          {isVi ? item.nameVi : item.name}
                        </p>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                          {item.code}
                        </span>
                      </div>
                      {item.address && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 max-w-[200px]">
                          {item.address}
                        </p>
                      )}
                    </div>
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
