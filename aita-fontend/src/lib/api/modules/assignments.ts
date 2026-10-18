import { request } from '../client'
import type { AssignmentRow } from '../contracts'

export const ASSIGNMENT_LIST_PATH = '/assignments?view=summary'

export const assignmentsApi = {
  getDocumentFile: (attachmentId: string) => request<Blob>(`/assignments/attachments/${encodeURIComponent(attachmentId)}/download`, { cache: 'no-store' }, 'blob'),
  getAssignments: (params?: Record<string, string>, fresh = false) => {
    const q = new URLSearchParams({ view: 'summary', ...params }).toString()
    return request<AssignmentRow[]>(`/assignments${q ? `?${q}` : ''}`, fresh ? { cache: 'no-store' } : undefined)
  },

  getAssignment: (id: string) => request<AssignmentRow>(`/assignments/${id}`),

  getGradingAssignment: (id: string) => request<any>(`/grading/assignments/${id}`),

  createAssignment: (body: unknown) => {
    const isFormData = body instanceof FormData;
    return request<AssignmentRow>('/assignments', { method: 'POST', body: isFormData ? body : JSON.stringify(body) })
  },

  updateAssignment: (id: string, body: unknown) =>
    request<AssignmentRow>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteAssignment: (id: string) =>
    request<void>(`/grading/assignments/${id}`, { method: 'DELETE' }),

  getTrashAssignments: (fresh = false) => request<any[]>('/grading/assignments/trash', fresh ? { cache: 'no-store' } : undefined),

  restoreAssignment: (id: string) =>
    request<void>(`/grading/assignments/${id}/restore`, { method: 'POST' }),

  hardDeleteAssignment: (id: string) =>
    request<void>(`/grading/assignments/${id}/hard-delete`, { method: 'DELETE' }),

  bulkRestoreAssignments: (ids: string[]) =>
    request<{ count: number }>('/grading/assignments/bulk-restore', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  bulkHardDeleteAssignments: (ids: string[]) =>
    request<{ count: number }>('/grading/assignments/bulk-hard-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  updateAllGradingStrategies: (strategy: 'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE') =>
    request<any>('/grading/assignments/strategy/update-all', { method: 'PUT', body: JSON.stringify({ strategy }) }),
}
