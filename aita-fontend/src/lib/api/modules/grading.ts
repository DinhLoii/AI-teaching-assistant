import { request, BASE, ApiError } from '../client'
import { AUTH_STORAGE_KEYS, getStoredItem } from '../storage'

export const gradingApi = {
  getAssignments: () => request<any[]>('/grading/assignments'),
  getTrashAssignments: () => request<any[]>('/grading/assignments/trash'),
  clearCache: () => request<void>('/grading/cache/clear', { method: 'POST' }),
  getAssignment: (id: string) => request<any>('/grading/assignments/' + id),
  updateAssignment: (id: string, data: any) => request<any>('/grading/assignments/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: (id: string) => request<void>('/grading/assignments/' + id, { method: 'DELETE' }),
  restoreAssignment: (id: string) => request<void>('/grading/assignments/' + id + '/restore', { method: 'POST' }),
  hardDeleteAssignment: (id: string) => request<void>('/grading/assignments/' + id + '/hard-delete', { method: 'DELETE' }),
  bulkHardDeleteAssignments: (ids: string[]) => request<{ count: number }>('/grading/assignments/bulk-hard-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkRestoreAssignments: (ids: string[]) => request<{ count: number }>('/grading/assignments/bulk-restore', { method: 'POST', body: JSON.stringify({ ids }) }),
  publishSubmission: (id: string, data?: any) => request<any>('/grading/submissions/' + id + '/publish', {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  unpublishSubmission: (id: string) => request<any>('/grading/submissions/' + id + '/unpublish', { method: 'POST' }),
  bulkPublishGrades: (assignmentId: string) =>
    request<{ success: boolean, count: number }>('/submissions/bulk-publish', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
  detectDuplicateSubmissions: (assignmentId: string, threshold?: number) =>
    request<{
      assignmentId: string
      checkedCount: number
      failedCount: number
      failedSubmissionIds: string[]
      emptyCount: number
      threshold: number
      pendingCount?: number
      resolvedClustersCount?: number
      clusters: Array<{
        count: number
        pendingCount?: number
        isResolved?: boolean
        maxSimilarity: number
        allIdentical: boolean
        submissions: Array<{
          submissionId: string
          studentId: string | null
          studentName: string | null
          studentCode: string | null
          attemptNumber: number | null
          submittedAt: string | null
          zipFileUrl: string | null
          topSimilarity: number
          isPenalized?: boolean
          matchedWith?: Array<{
            submissionId: string
            studentName: string | null
            studentCode: string | null
            isPenalized: boolean
            similarity: number
          }>
        }>
        pairs: Array<{
          submissionIdA: string
          submissionIdB: string
          studentNameA: string | null
          studentNameB: string | null
          similarity: number
          identical: boolean
        }>
      }>
    }>(`/submissions/duplicates?assignmentId=${encodeURIComponent(assignmentId)}${threshold !== undefined ? `&threshold=${threshold}` : ''}`),
  applyDuplicatePenalty: (data: {
    assignmentId: string
    submissionIds: string[]
    penaltyType: 'NONE' | 'FLAT_POINTS' | 'PERCENT' | 'ZERO_SCORE'
    penaltyValue: number
    reason?: string
  }) =>
    request<{
      success: boolean
      updatedCount: number
      updatedSubmissions: Array<{
        id: string
        studentName: string | null
        oldScore: number | null
        newScore: number
        deductedPoints: number
      }>
    }>('/submissions/apply-duplicate-penalty', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSubmissionResult: (id: string, data: any) => request<any>('/grading/submissions/' + id + '/result', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  uploadAssignment: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<any>('/grading/assignments/upload', {
      method: 'POST',
      body: formData,
    })
  },

  extractText: (file: File, semester: string, subject: string, options?: RequestInit) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('semester', semester)
    formData.append('subject', subject)
    return request<{ text: any, documentImageKey: string | null }>('/grading/assignments/extract-text', {
      method: 'POST',
      body: formData,
      ...options
    })
  },

  generateContent: (prompt: string, semester: string, subject: string, options?: RequestInit & { pageImages?: string[] }) => request<{ markdown: string }>('/grading/assignments/generate-content', {
    method: 'POST',
    body: JSON.stringify({ prompt, semester, subject, pageImages: options?.pageImages }),
    ...options,
  }).then(res => res.markdown),

  parseRubric: (content: string, documentImageKey?: string | null, options?: RequestInit) => request<{ rubric: any, blueprint: any }>('/grading/assignments/parse-rubric', {
    method: 'POST',
    body: JSON.stringify({ content, documentImageKey }),
    ...options
  }),

  // `subject` is the subject code (e.g. "DBI202"). The backend uses it to settle projectType,
  // which decides how submissions are graded; without it the backend falls back to guessing
  // from the prompt text.
  parseRequirements: (content: string, documentImageKey?: string | null, subject?: string) => request<{ blueprint: any }>('/grading/assignments/parse-requirements', {
    method: 'POST',
    body: JSON.stringify({ content, documentImageKey, subject }),
  }).then(res => res.blueprint),

  generateRubric: (blueprint: any) => request<{ rubric: any }>('/grading/assignments/generate-rubric', {
    method: 'POST',
    body: JSON.stringify({ blueprint }),
  }).then(res => res.rubric),

  publishAssignment: (metadata: any, blueprint: any, rubric: any) => request<any>('/grading/assignments/publish', {
    method: 'POST',
    body: JSON.stringify({ metadata, blueprint, rubric }),
  }),

  updateAllGradingStrategies: (strategy: 'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE') => request<any>('/grading/assignments/strategy/update-all', {
    method: 'PUT',
    body: JSON.stringify({ strategy }),
  }),

  submitAssignment: (file: File | null, content: string, assignmentId: string) => {
    const formData = new FormData()
    if (file) formData.append('file', file)
    formData.append('content', content)
    formData.append('assignmentId', assignmentId)
    return request<{ submissionId: string, zipFileUrl: string, status: string }>('/submissions', {
      method: 'POST',
      body: formData,
    })
  },

  submitProject: (file: File, assignmentId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (assignmentId) formData.append('assignmentId', assignmentId)
    return request<{ submissionId: string }>('/grading/submissions', {
      method: 'POST',
      body: formData,
    })
  },
  submitBatchProject: (files: File[], assignmentId?: string) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    if (assignmentId) formData.append('assignmentId', assignmentId)
    return request<{ jobs: any[] }>('/grading/submissions/upload-batch', {
      method: 'POST',
      body: formData,
    })
  },

  parseSqlKey: (formData: FormData) => {
    return request<any>('/grading/assignments/parse-sql-key', {
      method: 'POST',
      body: formData,
    })
  },

  updateAnswerKey: (assignmentId: string, formData: FormData) => {
    return request<any>(`/grading/assignments/${assignmentId}/update-answer-key`, {
      method: 'POST',
      body: formData,
    })
  },

  getSqlKeyUrl: (assignmentId: string) => {
    return `${BASE}/grading/assignments/${assignmentId}/sql-key?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`
  },

  gradeExistingSubmission: (submissionId: string) => {
    return request<{ submissionId: string, statusUrl: string }>('/grading/submissions/grade-existing', {
      method: 'POST',
      body: JSON.stringify({ submissionId }),
    })
  },

  gradeExistingBatch: (assignmentId: string) => {
    return request<{ jobs: any[] }>('/grading/submissions/grade-existing-batch', {
      method: 'POST',
      body: JSON.stringify({ assignmentId }),
    })
  },

  gradeSelectedBatch: (assignmentId: string, submissionIds: string[]) => {
    return request<{ jobs: any[] }>('/grading/submissions/grade-selected-batch', {
      method: 'POST',
      body: JSON.stringify({ assignmentId, submissionIds }),
    })
  },

  getBatchStatus: (ids: string[]) => {
    if (!ids || ids.length === 0) return Promise.resolve({ statuses: {} as Record<string, any> })
    return request<{ statuses: Record<string, any> }>('/grading/submissions/batch-status?ids=' + ids.join(','))
  },

  cancelBatch: (ids: string[]) => {
    if (!ids || ids.length === 0) return Promise.resolve({ success: true, cancelledCount: 0 })
    return request<{ success: boolean, cancelledCount: number }>('/grading/submissions/batch-cancel', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  subscribeToProgress: (
    submissionId: string,
    onProgress: (job: any) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ) => {
    const token = getStoredItem(AUTH_STORAGE_KEYS.token)
    const url = `${BASE}/grading/submissions/${submissionId}/stream?token=${encodeURIComponent(token || '')}`
    const eventSource = new EventSource(url)
    let isFinished = false

    eventSource.onmessage = (event) => {
      try {
        if (!event.data || event.data.trim() === ': keep-alive') return
        const job = JSON.parse(event.data)
        if (job.error) {
          isFinished = true
          onError(new Error(job.error))
          eventSource.close()
          return
        }

        onProgress(job)

        if (job.state === 'completed' || Number(job.progressPercent) >= 100) {
          isFinished = true
          eventSource.close()
          onComplete()
        } else if (job.state === 'failed') {
          isFinished = true
          eventSource.close()
          onError(new Error(job.error || 'Evaluation failed'))
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err, event.data)
      }
    }

    eventSource.onerror = (err) => {
      if (isFinished) return
      // If server closed connection normally after completing
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[SSE] Stream closed by server')
      } else {
        console.warn('[SSE] EventSource connection state change', eventSource.readyState, err)
      }
    }

    return () => {
      isFinished = true
      eventSource.close()
    }
  },

  getSubmissionResult: (submissionId: string) => request<any>('/grading/submissions/' + submissionId + '/result'),

  submitFeedback: (submissionId: string, feedback: string) => request<{ success: boolean, feedback: string }>(`/submissions/${submissionId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  }),

  cancelSubmission: (submissionId: string) => request<{ success: boolean }>('/grading/submissions/' + submissionId + '/cancel', { method: 'POST' }),

  getHistory: (assignmentId?: string, page: number = 1, limit: number = 10, search?: string, status?: string, scoreRange?: string, sort?: string, classId?: string) => {
    const params = new URLSearchParams();
    if (assignmentId) params.append('assignmentId', assignmentId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (scoreRange) params.append('scoreRange', scoreRange);
    if (sort) params.append('sort', sort);
    if (classId) params.append('classId', classId);

    return request<{ classes?: any[], history: any[], meta: { total: number, page: number, limit: number, totalPages: number } }>(`/grading/submissions/history?${params.toString()}`);
  },

  deleteHistory: (id: string) => request<void>('/grading/submissions/history/' + id, { method: 'DELETE' }),
  getSemesters: () => request<any[]>('/semesters').catch(() => []),

  downloadSubmission: async (submissionId: string, studentName?: string) => {
    const token = getStoredItem(AUTH_STORAGE_KEYS.token);
    const res = await fetch(`${BASE}/submissions/${submissionId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let errMsg = 'Failed to download submission';
      try {
        const json = await res.json();
        errMsg = json.Message || json.message || errMsg;
      } catch (e) { }
      throw new ApiError(errMsg, res.status);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const disposition = res.headers.get('Content-Disposition');
    let filename = `${studentName || 'submission'}.zip`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
}
