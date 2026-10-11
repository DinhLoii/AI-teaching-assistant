import { request } from '../client'

export interface NoteItem {
  id: string
  dateStr: string
  timeStr: string
  content: string
  status: 'pending' | 'completed'
  createdAt?: string
}

export const notesApi = {
  getNotes: () => request<NoteItem[]>('/notes'),

  createNote: (data: Omit<NoteItem, 'id'>) =>
    request<NoteItem>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateNote: (id: string, data: Partial<NoteItem>) =>
    request<NoteItem>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteNote: (id: string) =>
    request<{ id: string }>(`/notes/${id}`, {
      method: 'DELETE',
    }),

  syncNotes: (notes: NoteItem[]) =>
    request<NoteItem[]>('/notes/sync', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
}
