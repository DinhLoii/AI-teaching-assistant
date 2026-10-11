'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { notesApi, type NoteItem } from '@/lib/api/modules/notes'

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
  const isInitialized = useRef(false)

  // 1. Initial load from local storage for fast instant render, then sync with Neon DB
  useEffect(() => {
    let localNotes: Note[] = []
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('aita_calendar_notes')
        if (stored) {
          localNotes = JSON.parse(stored)
          setNotes(localNotes)
        }
      }
    } catch (error) {
      console.error('Failed to parse notes from local storage:', error)
    }

    // Fetch and sync with Neon PostgreSQL backend
    notesApi
      .getNotes()
      .then((serverNotes) => {
        if (serverNotes && serverNotes.length > 0) {
          // If we had local offline notes not on server, sync them
          const serverIds = new Set(serverNotes.map((n) => n.id))
          const uncommitted = localNotes.filter((n) => !serverIds.has(n.id))

          if (uncommitted.length > 0) {
            notesApi.syncNotes([...serverNotes, ...uncommitted]).then((merged) => {
              if (merged) {
                setNotes(merged)
                localStorage.setItem('aita_calendar_notes', JSON.stringify(merged))
              }
            }).catch(() => {
              setNotes(serverNotes)
              localStorage.setItem('aita_calendar_notes', JSON.stringify(serverNotes))
            })
          } else {
            setNotes(serverNotes)
            localStorage.setItem('aita_calendar_notes', JSON.stringify(serverNotes))
          }
        } else if (localNotes.length > 0) {
          // Push initial local notes to Neon DB
          notesApi.syncNotes(localNotes).then((saved) => {
            if (saved) {
              setNotes(saved)
              localStorage.setItem('aita_calendar_notes', JSON.stringify(saved))
            }
          }).catch(console.warn)
        }
        isInitialized.current = true
      })
      .catch((err) => {
        // Backend might be offline or starting up, keep local notes
        console.warn('Backend notes fetch fallback to local storage:', err)
        isInitialized.current = true
      })
  }, [])

  // Save to local storage whenever notes change
  const saveNotes = useCallback((newNotes: Note[]) => {
    setNotes(newNotes)
    if (typeof window !== 'undefined') {
      localStorage.setItem('aita_calendar_notes', JSON.stringify(newNotes))
    }
  }, [])

  const addNote = useCallback(
    (dateStr: string, timeStr: string, content: string) => {
      const tempId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)
      const newNote: Note = {
        id: tempId,
        dateStr,
        timeStr,
        content,
        status: 'pending',
      }
      saveNotes([...notes, newNote])

      // Persist to Neon DB
      notesApi
        .createNote({ dateStr, timeStr, content, status: 'pending' })
        .then((created) => {
          if (created && created.id) {
            setNotes((prev) =>
              prev.map((n) => (n.id === tempId ? { ...n, id: created.id } : n))
            )
          }
        })
        .catch((err) => {
          console.warn('Failed to save note to Neon DB, stored locally:', err)
        })
    },
    [notes, saveNotes]
  )

  const deleteNote = useCallback(
    (id: string) => {
      saveNotes(notes.filter((n) => n.id !== id))
      // Delete from Neon DB
      notesApi.deleteNote(id).catch((err) => {
        console.warn('Failed to delete note from Neon DB:', err)
      })
    },
    [notes, saveNotes]
  )

  const toggleNoteStatus = useCallback(
    (id: string) => {
      const target = notes.find((n) => n.id === id)
      const nextStatus = target?.status === 'pending' ? 'completed' : 'pending'

      saveNotes(
        notes.map((n) =>
          n.id === id ? { ...n, status: nextStatus } : n
        )
      )

      // Update in Neon DB
      notesApi.updateNote(id, { status: nextStatus }).catch((err) => {
        console.warn('Failed to update note in Neon DB:', err)
      })
    },
    [notes, saveNotes]
  )

  // Get notes for a specific date (YYYY-MM-DD)
  const getNotesForDate = useCallback(
    (dateStr: string) => {
      return notes
        .filter((n) => n.dateStr === dateStr)
        .sort((a, b) => a.timeStr.localeCompare(b.timeStr))
    },
    [notes]
  )

  // Get overdue/pending/approaching notes with urgency levels
  const getCurrentStatus = useCallback(
    (now: Date): NoteStatus => {
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
    },
    [notes]
  )

  return {
    notes,
    addNote,
    deleteNote,
    toggleNoteStatus,
    getNotesForDate,
    getCurrentStatus,
  }
}
