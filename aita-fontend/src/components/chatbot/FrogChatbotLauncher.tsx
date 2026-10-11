'use client'

import * as React from 'react'
import Image from 'next/image'

interface FrogChatbotLauncherProps {
  onClick: () => void
  isVi?: boolean
  className?: string
}

export function FrogChatbotLauncher({
  onClick,
  isVi = true,
  className = '',
}: FrogChatbotLauncherProps) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col items-center select-none ${className}`}
    >
      {/* ── Interactive Mascot Button ── */}
      <button
        type="button"
        onClick={onClick}
        aria-label={isVi ? 'Hỏi trợ lý AI Tutor Cóc FPT' : 'Ask AI Tutor Toad'}
        className="group relative flex flex-col items-center justify-center focus:outline-none transition-transform duration-300"
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => {
          ;(e.currentTarget as HTMLElement).style.cursor = 'grabbing'
        }}
        onMouseUp={(e) => {
          ;(e.currentTarget as HTMLElement).style.cursor = 'grab'
        }}
      >
        {/* ── Hover Speech Bubble / Tooltip ── */}
        <div className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center px-3.5 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl backdrop-blur-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-x-2 group-hover:translate-x-0 border border-slate-700/60 z-30">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-orange-400">AI Tutor Cóc FPT</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                24/7
              </span>
            </div>
            <span className="text-[11px] text-slate-300 font-medium">
              {isVi ? 'Bạn cần giải đáp bài tập nào?' : 'How can I assist your assignment?'}
            </span>
          </div>
          {/* Arrow */}
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-slate-900/95 dark:bg-slate-800/95 rotate-45 border-r border-t border-slate-700/60" />
        </div>

        {/* ── Ambient Radial Aura Glow ── */}
        <div className="absolute inset-0 -m-3 rounded-full bg-gradient-to-tr from-orange-500/25 via-amber-400/20 to-transparent blur-xl opacity-50 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />

        {/* ── Floating Frog Mascot Avatar (Pure Icon) ── */}
        <div className="relative animate-frog-float group-hover:scale-110 active:scale-95 transition-transform duration-300 flex items-center justify-center">
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 drop-shadow-[0_12px_24px_rgba(250, 112, 20,0.3)] group-hover:drop-shadow-[0_18px_32px_rgba(250, 112, 20,0.5)] transition-all duration-300">
            <Image
              src="/mascot-clean.png"
              alt="FPT Toad AI Tutor"
              fill
              sizes="88px"
              priority
              className="object-contain pointer-events-none"
            />
          </div>
        </div>

        {/* ── Floor Breathing Shadow Underneath ── */}
        <div className="w-12 h-2.5 mt-1 bg-slate-900/30 dark:bg-black/60 blur-[3px] rounded-full animate-frog-shadow pointer-events-none" />
      </button>
    </div>
  )
}
