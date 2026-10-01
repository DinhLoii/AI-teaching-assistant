'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Note {
  id: string
  dateStr: string // YYYY-MM-DD
  timeStr: string // HH:mm
  content: string
  status: 'pending' | 'completed'
}

export interface NoteStatus {
  hasPending: boolean
  hasOverdue: boolean
  pendingCount: number
  overdueCount: number
  nearestMinutes: number
  nearestContent: string
  urgencyLevel: 'critical' | 'imminent' | 'warning' | 'normal'
  totalPending: number
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])

  // Load from local storage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('aita_calendar_notes')
        if (stored) {
          setNotes(JSON.parse(stored))
        }
      }
    } catch (error) {
      console.error('Failed to parse notes from local storage:', error)
    }
  }, [])

  // Save to local storage whenever notes change
  const saveNotes = useCallback((newNotes: Note[]) => {
    setNotes(newNotes)
    if (typeof window !== 'undefined') {
      localStorage.setItem('aita_calendar_notes', JSON.stringify(newNotes))
    }
  }, [])

  const addNote = useCallback((dateStr: string, timeStr: string, content: string) => {
    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 9),
      dateStr,
      timeStr,
      content,
      status: 'pending',
    }
    saveNotes([...notes, newNote])
  }, [notes, saveNotes])

  const deleteNote = useCallback((id: string) => {
    saveNotes(notes.filter((n) => n.id !== id))
  }, [notes, saveNotes])

  const toggleNoteStatus = useCallback((id: string) => {
    saveNotes(
      notes.map((n) =>
        n.id === id ? { ...n, status: n.status === 'pending' ? 'completed' : 'pending' } : n
      )
    )
  }, [notes, saveNotes])

  // Get notes for a specific date (YYYY-MM-DD)
  const getNotesForDate = useCallback((dateStr: string) => {
    return notes
      .filter((n) => n.dateStr === dateStr)
      .sort((a, b) => a.timeStr.localeCompare(b.timeStr))
  }, [notes])

  // Get overdue/pending/approaching notes with urgency levels
  const getCurrentStatus = useCallback((now: Date): NoteStatus => {
    let hasPending = false
    let hasOverdue = false
    let pendingCount = 0
    let overdueCount = 0
    let nearestMinutes = Infinity
    let nearestContent = ''

    const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString()
    const currentComparable = nowIso.replace('T', ' ').substring(0, 16)
    const nowMs = now.getTime()

    notes.forEach((note) => {
      if (note.status === 'pending') {
        const noteComparable = `${note.dateStr} ${note.timeStr}`
        const [y, m, d] = note.dateStr.split('-').map(Number)
        const [h, min] = note.timeStr.split(':').map(Number)
        const noteDate = new Date(y, m - 1, d, h, min)
        const diffMs = noteDate.getTime() - nowMs
        const diffMin = diffMs / 60000

        if (currentComparable > noteComparable) {
          hasOverdue = true
          overdueCount++
        } else {
          hasPending = true
          pendingCount++
          if (diffMin < nearestMinutes) {
            nearestMinutes = diffMin
            nearestContent = note.content
          }
        }
      }
    })

    // urgencyLevel: 'critical' (overdue), 'imminent' (<10min), 'warning' (<30min), 'normal'
    let urgencyLevel: 'critical' | 'imminent' | 'warning' | 'normal' = 'normal'
    if (hasOverdue) urgencyLevel = 'critical'
    else if (nearestMinutes <= 10) urgencyLevel = 'imminent'
    else if (nearestMinutes <= 30) urgencyLevel = 'warning'

    return {
      hasPending,
      hasOverdue,
      pendingCount,
      overdueCount,
      nearestMinutes: nearestMinutes === Infinity ? -1 : Math.round(nearestMinutes),
      nearestContent,
      urgencyLevel,
      totalPending: pendingCount + overdueCount,
    }
  }, [notes])

  return {
    notes,
    addNote,
    deleteNote,
    toggleNoteStatus,
    getNotesForDate,
    getCurrentStatus,
  }
}
