import { request } from '../client'
import type { SubmissionListQuery } from '../contracts'
import { normalizeSubmissionRow } from '../normalizers/submission'

export const submissionsApi = {
  getSubmissionHistory: async (params?: SubmissionListQuery) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    const rows = await request<any[]>(`/submissions${q ? `?${q}` : ''}`)
    return (rows || []).map(normalizeSubmissionRow)
  },

  async getSubmissions(params?: SubmissionListQuery) {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    const rows = await request<any[]>(`/submissions${q ? `?${q}` : ''}`)
    return (rows || []).map(normalizeSubmissionRow)
  },

  getSubmissionDetail: async (id: string) => {
    const row = await request<any>(`/submissions/${id}`)
    return normalizeSubmissionRow(row)
  },

  async getSubmission(id: string) {
    const row = await request<any>(`/submissions/${id}`)
    return normalizeSubmissionRow(row)
  },

  async getSubmissionDownload(id: string) {
    const row = await request<any>(`/submissions/${id}`)
    const normalized = normalizeSubmissionRow(row)
    return {
      id: normalized.id,
      assignmentId: normalized.assignmentId,
      downloadUrl: normalized.downloadUrl ?? normalized.zipFileUrl ?? undefined,
      zipFileUrl: normalized.zipFileUrl ?? undefined,
      filename: normalized.filename ?? undefined,
      submittedAt: normalized.submittedAt,
    }
  },

  submitAssignment: (file: File | null, content: string, assignmentId: string) => {
    const formData = new FormData()
    if (file) formData.append('file', file)
    formData.append('content', content)
    formData.append('assignmentId', assignmentId)
    return request<{ submissionId: string, id?: string, zipFileUrl?: string, status?: string }>('/submissions', {
      method: 'POST',
      body: formData,
    })
  },

  submitBatchProject: async (files: File[], assignmentId?: string) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (assignmentId) formData.append('assignmentId', assignmentId)
    return request<{ batchId: string, jobs: any[] }>('/submissions/batch', {
      method: 'POST',
      body: formData,
    })
  },

  getBatchStatus: async (jobIds: string[]) => {
    const idsQuery = jobIds.join(',')
    return request<{ statuses: Record<string, any> }>(`/submissions/batch/status?ids=${idsQuery}`)
  },

  cancelBatch: async (jobIds: string[]) => {
    return request<{ success: boolean }>('/submissions/batch/cancel', {
      method: 'POST',
      body: JSON.stringify({ ids: jobIds }),
    })
  },

  gradeSubmission: async (submissionId: string, body: any) => {
    const row = await request<any>(`/submissions/${submissionId}/grade`, { method: 'PATCH', body: JSON.stringify(body) })
    return normalizeSubmissionRow(row)
  },

  submitFeedback: (submissionId: string, feedback: string) =>
    request<void>(`/submissions/${submissionId}/feedback`, { method: 'POST', body: JSON.stringify({ feedback }) }),

  bulkPublishGrades: (assignmentId: string) =>
    request<{ success: boolean, count: number }>('/submissions/bulk-publish', { method: 'POST', body: JSON.stringify({ assignmentId }) }),

  reopenSubmission: (body: {
    examId: string
    studentId: string
    classId?: string
    extendedDueDate: string
    penaltyMode?: 'SYSTEM_DEFAULT' | 'CUSTOM_RATE' | 'FLAT_AMOUNT' | 'WAIVE' | 'SCORE_CAP'
    customPenaltyRate?: number
    flatPenaltyAmount?: number
    scoreCap?: number
    reason?: string
  }) =>
    request<{ success: boolean; message: string; override: any }>('/submissions/reopen', { method: 'POST', body: JSON.stringify(body) }),
}
