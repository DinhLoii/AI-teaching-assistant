'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ListTodo,
  Zap,
} from 'lucide-react'
import { useNotes } from '@/features/notes/hooks/useNotes'
import { useLanguage } from '@/providers/language-provider'

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

/* ── Urgency Pill Component ─────────────────────────────────── */
function UrgencyPill({
  urgency,
  nearestMinutes,
  totalPending,
}: {
  urgency: string
  nearestMinutes: number
  totalPending: number
}) {
  if (totalPending === 0) return null

  const config = {
    critical: {
      bg: 'bg-red-500/15 dark:bg-red-500/25',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-300/60 dark:border-red-500/30',
      label: 'OVERDUE',
    },
    imminent: {
      bg: 'bg-orange-500/15 dark:bg-orange-500/25',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-300/60 dark:border-orange-500/30',
      label: `${nearestMinutes}m`,
    },
    warning: {
      bg: 'bg-amber-500/15 dark:bg-amber-500/25',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-300/60 dark:border-amber-500/30',
      label: `${nearestMinutes}m`,
    },
    normal: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      label: `${totalPending}`,
    },
  }[urgency] ?? { bg: '', text: '', border: '', label: '' }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase border ${config.bg} ${config.text} ${config.border} transition-colors`}
    >
      {urgency === 'critical' && <AlertCircle size={9} />}
      {(urgency === 'imminent' || urgency === 'warning') && <Zap size={9} />}
      {config.label}
    </span>
  )
}

/* ── Quick Notes Panel ──────────────────────────────────────── */
function QuickNotesPanel({
  notes,
  onToggleStatus,
  onDelete,
  onClose,
  t,
}: {
  notes: Array<{
    id: string
    dateStr: string
    timeStr: string
    content: string
    status: 'pending' | 'completed'
  }>
  onToggleStatus: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
  t: (k: string, fallback?: string) => string
}) {
  return (
    <div className="absolute top-full right-0 mt-3 w-84 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] dark:border-slate-800 dark:bg-[#0f1117]/95 z-50 overflow-hidden animate-fade-in-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-[#F26F21] dark:bg-orange-500/20 dark:text-orange-400">
            <ListTodo size={14} />
          </div>
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
            {t('notes.pending_title', 'Pending Notes')}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-9 text-slate-400">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-2.5">
              <CheckCircle2 size={24} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('notes.empty', 'Great! No pending notes.')}
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isOverdue = (() => {
              const now = new Date()
              const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString()
              const currentComparable = nowIso.replace('T', ' ').substring(0, 16)
              return currentComparable > `${note.dateStr} ${note.timeStr}`
            })()

            return (
              <div
                key={note.id}
                className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  isOverdue
                    ? 'bg-red-50/80 border-red-200 dark:bg-red-950/30 dark:border-red-800/50'
                    : 'bg-white border-slate-200/80 shadow-xs dark:bg-[#161b27] dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500'
                }`}
              >
                <button
                  onClick={() => onToggleStatus(note.id)}
                  className={`mt-0.5 shrink-0 h-5 w-5 rounded flex items-center justify-center border transition-colors ${
                    isOverdue
                      ? 'border-red-400 bg-red-100 text-red-500 dark:border-red-500 dark:bg-red-900/30'
                      : 'border-slate-300 bg-slate-50 text-transparent hover:border-orange-500 dark:border-slate-600 dark:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 size={12} strokeWidth={3} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={10} className={isOverdue ? 'text-red-500' : 'text-orange-500'} />
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {note.dateStr.substring(5)} {note.timeStr}
                    </span>
                    {isOverdue && (
                      <span className="text-[8px] font-black text-red-500 bg-red-100 dark:bg-red-900/40 px-1 py-0.5 rounded uppercase tracking-wider">
                        {t('notes.overdue', 'Overdue')}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] leading-snug break-words text-slate-800 dark:text-slate-200">
                    {note.content}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-slate-400 hover:text-red-500 transition-all p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export interface LiveClockProps {
  showNotes?: boolean
}

export function LiveClock({ showNotes = true }: LiveClockProps) {
  const { language, t } = useLanguage()
  const [time, setTime] = useState<Date | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickNotes, setShowQuickNotes] = useState(false)

  const { notes, addNote, deleteNote, toggleNoteStatus, getNotesForDate, getCurrentStatus } = useNotes()

  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newNoteTime, setNewNoteTime] = useState('09:00')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isAddingMode, setIsAddingMode] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setShowQuickNotes(false)
        setSelectedDate(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // If time is not yet hydrated, show stable placeholder
  const activeTime = time || new Date()

  const WEEKDAY_LABELS: Record<string, string[]> = {
    en: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    vi: ['CHỦ NHẬT', 'THỨ BẢY', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU'], // Adjust indexing below
  }
  // Standard getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const VI_DAYS = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY']
  const EN_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

  const dayNameStr = language === 'vi' ? VI_DAYS[activeTime.getDay()] : EN_DAYS[activeTime.getDay()]
  const dd = String(activeTime.getDate()).padStart(2, '0')
  const mm = String(activeTime.getMonth() + 1).padStart(2, '0')
  const yyyy = activeTime.getFullYear()
  const dateStr = `${dayNameStr} ${dd}/${mm}/${yyyy}`

  const hh = String(activeTime.getHours()).padStart(2, '0')
  const min = String(activeTime.getMinutes()).padStart(2, '0')
  const ss = String(activeTime.getSeconds()).padStart(2, '0')
  const timeFormatted = `${hh} : ${min} : ${ss}`

  const currentYear = activeTime.getFullYear()
  const currentMonth = activeTime.getMonth()
  const currentDay = activeTime.getDate()

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blankDays = Array.from({ length: firstDay }, (_, i) => i)

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(viewYear, viewMonth - 1, 1))
  }
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date(viewYear, viewMonth + 1, 1))
  }
  const handleResetToToday = (e: React.MouseEvent) => {
    e.stopPropagation()
    setViewDate(new Date())
    setSelectedDate(null)
  }
  const handleDayClick = (day: number) => {
    if (!showNotes) return
    setSelectedDate(new Date(viewYear, viewMonth, day))
    setIsAddingMode(false)
  }

  const formatDateStr = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const handleAddNote = () => {
    if (!selectedDate || !newNoteContent.trim()) return
    addNote(formatDateStr(selectedDate), newNoteTime, newNoteContent)
    setNewNoteContent('')
    setIsAddingMode(false)
  }

  // Get status with urgency
  const status = getCurrentStatus(activeTime)
  const { urgencyLevel, totalPending, nearestMinutes } = status

  // Get pending notes for quick view
  const pendingNotes = notes
    .filter((n) => n.status === 'pending')
    .sort((a, b) => `${a.dateStr} ${a.timeStr}`.localeCompare(`${b.dateStr} ${b.timeStr}`))

  return (
    <div className="relative flex items-center gap-2 select-none" ref={wrapperRef}>
      {/* ── 1. Quick Notes Button (Only when showNotes is enabled) ── */}
      {showNotes && (
        <button
          onClick={() => {
            setShowQuickNotes(!showQuickNotes)
            setIsOpen(false)
          }}
          className={`relative flex items-center justify-center h-10 w-10 rounded-2xl border transition-all duration-200 ${
            showQuickNotes
              ? 'border-orange-500 bg-orange-50 text-orange-600 dark:border-orange-500 dark:bg-orange-500/15 dark:text-orange-400 ring-2 ring-orange-500/20'
              : totalPending > 0
              ? 'border-orange-200 bg-orange-50/60 text-[#F26F21] hover:border-orange-400 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-400'
              : 'border-slate-200 bg-white/80 text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title={t('notes.pending_title', 'Pending Notes')}
        >
          <ListTodo size={17} className={totalPending > 0 ? 'text-[#F26F21]' : ''} />
          {totalPending > 0 && (
            <span
              className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-black text-white px-1 shadow-sm ${
                urgencyLevel === 'critical'
                  ? 'bg-red-500'
                  : urgencyLevel === 'imminent'
                  ? 'bg-orange-500'
                  : 'bg-[#F26F21]'
              }`}
            >
              {totalPending}
            </span>
          )}
        </button>
      )}

      {/* ── 2. Realtime Datetime Button ────────────────────── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setShowQuickNotes(false)
          if (isOpen) setSelectedDate(null)
        }}
        className={`
          relative flex items-center gap-3 px-3.5 py-1.5 rounded-2xl border transition-all duration-200
          bg-white/80 dark:bg-[#151821] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200
          shadow-xs hover:shadow hover:border-slate-300 dark:hover:border-slate-700
          ${isOpen ? 'ring-2 ring-orange-500/25 border-orange-500/60' : 'hover:-translate-y-0.5'}
        `}
        title="Calendar & Realtime Clock"
      >
        {/* Calendar Icon Badge */}
        <div
          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors ${
            isOpen
              ? 'bg-[#F26F21] text-white'
              : 'bg-orange-500/15 text-[#F26F21] dark:bg-orange-500/20 dark:text-orange-400'
          }`}
        >
          <CalendarIcon size={14} />
        </div>

        {/* Realtime Time & Date */}
        <div className="relative z-10 flex flex-col items-start justify-center">
          <span
            suppressHydrationWarning
            className="text-[13px] font-extrabold font-mono tracking-wider tabular-nums leading-none text-slate-900 dark:text-white"
          >
            {timeFormatted}
          </span>
          <span
            suppressHydrationWarning
            className="text-[9px] font-black uppercase mt-1 leading-none tracking-wider text-slate-500 dark:text-slate-400"
          >
            {dateStr}
          </span>
        </div>

        {/* Urgency Pill (only when showNotes is enabled) */}
        {showNotes && (
          <div className="relative z-10">
            <UrgencyPill
              urgency={urgencyLevel}
              nearestMinutes={nearestMinutes}
              totalPending={totalPending}
            />
          </div>
        )}
      </button>

      {/* ── 3. Quick Notes Popover (only when showNotes is enabled) ── */}
      {showNotes && showQuickNotes && (
        <QuickNotesPanel
          notes={pendingNotes}
          onToggleStatus={toggleNoteStatus}
          onDelete={deleteNote}
          onClose={() => setShowQuickNotes(false)}
          t={t}
        />
      )}

      {/* ── 4. Calendar Popover ───────────────────────────── */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] dark:border-slate-800 dark:bg-[#0f1117]/95 z-50 overflow-hidden animate-fade-in-up">
          {!selectedDate ? (
            // ================= MONTH GRID VIEW =================
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={handleResetToToday}
                  className="text-[14px] font-extrabold text-slate-800 dark:text-slate-100 hover:text-[#F26F21] dark:hover:text-orange-400 transition-colors capitalize tracking-tight"
                >
                  {new Date(viewYear, viewMonth).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map((day, idx) => (
                  <div
                    key={day}
                    className={`text-center text-[10px] font-extrabold tracking-wider uppercase pb-1 ${
                      idx >= 5 ? 'text-[#F26F21]' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {blankDays.map((_, i) => (
                  <div key={`blank-${i}`} className="h-9 w-9" />
                ))}

                {days.map((day) => {
                  const isToday =
                    day === currentDay && viewMonth === currentMonth && viewYear === currentYear
                  const dateString = formatDateStr(new Date(viewYear, viewMonth, day))
                  const dayNotes = getNotesForDate(dateString)

                  return (
                    <div key={day} className="flex justify-center relative">
                      <button
                        onClick={() => handleDayClick(day)}
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all ${
                          isToday
                            ? 'bg-gradient-to-br from-[#F26F21] to-orange-600 text-white shadow-md shadow-orange-500/35 font-bold scale-105 ring-2 ring-orange-500/20'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-orange-500 dark:hover:text-orange-400'
                        }`}
                      >
                        {day}
                      </button>
                      {/* Note Indicators */}
                      {showNotes && dayNotes.length > 0 && !isToday && (
                        <div className="absolute bottom-0 flex gap-0.5">
                          {dayNotes.slice(0, 3).map((n, idx) => (
                            <span
                              key={idx}
                              className={`w-1 h-1 rounded-full ${
                                n.status === 'completed' ? 'bg-emerald-400' : 'bg-orange-500'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                  {showNotes
                    ? t('notes.click_date', 'Click a date to manage notes')
                    : (language === 'vi' ? 'Xem lịch & thời gian' : 'Calendar & realtime view')}
                </p>
                {showNotes && totalPending > 0 && (
                  <span className="text-[10px] font-bold text-amber-500 animate-pulse">
                    {totalPending} {t('notes.tasks_pending', 'tasks pending')}
                  </span>
                )}
              </div>
            </>
          ) : (
            // ================= DAY NOTES VIEW =================
            <div className="flex flex-col h-full animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setSelectedDate(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900 dark:text-white leading-none">
                    {selectedDate.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                    {t('notes.notes_deadlines', 'Notes & Deadlines')}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[220px] rounded-lg custom-scrollbar pr-1 space-y-2 mb-3">
                {getNotesForDate(formatDateStr(selectedDate)).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-400 dark:text-slate-600">
                    <CalendarIcon size={22} className="mb-1.5 opacity-40" />
                    <p className="text-xs font-medium">
                      {t('notes.no_notes_day', 'Empty! No notes yet.')}
                    </p>
                  </div>
                ) : (
                  getNotesForDate(formatDateStr(selectedDate)).map((note) => (
                    <div
                      key={note.id}
                      className={`group flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                        note.status === 'completed'
                          ? 'bg-slate-50 border-transparent dark:bg-slate-900/50'
                          : 'bg-white border-slate-200 shadow-xs dark:bg-[#161b27] dark:border-slate-800 hover:border-orange-400'
                      }`}
                    >
                      <button
                        onClick={() => toggleNoteStatus(note.id)}
                        className={`mt-0.5 shrink-0 h-4.5 w-4.5 rounded flex items-center justify-center border transition-colors ${
                          note.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 bg-slate-50 text-transparent hover:border-orange-500 dark:border-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        <CheckCircle2 size={11} strokeWidth={3} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock
                            size={10}
                            className={note.status === 'completed' ? 'text-emerald-500' : 'text-orange-500'}
                          />
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              note.status === 'completed'
                                ? 'text-slate-400 line-through'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {note.timeStr}
                          </span>
                        </div>
                        <p
                          className={`text-[12px] leading-snug break-words ${
                            note.status === 'completed'
                              ? 'text-slate-400 dark:text-slate-600 line-through'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {note.content}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 text-slate-400 hover:text-red-500 transition-all p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {isAddingMode ? (
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                      {t('notes.create_note', 'Create Note')}
                    </span>
                    <button
                      onClick={() => setIsAddingMode(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="time"
                    value={newNoteTime}
                    onChange={(e) => setNewNoteTime(e.target.value)}
                    className="w-full mb-2 h-8 rounded-lg border border-slate-200 text-xs px-2 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  <textarea
                    placeholder={t('notes.desc_placeholder', 'Describe note, task, or deadline...')}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    className="w-full h-16 resize-none rounded-lg border border-slate-200 text-xs p-2 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white custom-scrollbar mb-2"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="w-full h-8 rounded-lg bg-slate-900 dark:bg-orange-500 text-white font-bold text-xs hover:bg-[#F26F21] disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {t('notes.save', 'Save Note')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingMode(true)}
                  className="w-full h-9 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-orange-600 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                >
                  <Plus size={15} /> {t('notes.add_new', 'Add new note')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
