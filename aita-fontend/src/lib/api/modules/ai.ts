import { request } from '../client'

export const aiApi = {
  generatePrompt: (data: {
    name?: string
    topic?: string
    category?: string
    difficulty?: string
    subjectCode?: string
    additionalNotes?: string
  }) =>
    request<{ prompt: string }>('/ai/prompts/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refinePrompt: (data: { content: string }) =>
    request<{ prompt: string }>('/ai/prompts/refine', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  ragChat: (data: {
    query: string
    examId?: string
    subjectCode?: string
    submissionId?: string
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  }) =>
    request<{
      answer: string
      sourcesUsed: Array<{ docType: string; title: string; sourceRef: string }>
      suggestedFollowUps?: string[]
    }>('/ai/rag/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  ragDiagnose: (data: {
    submissionId: string
    ruleScoreId?: string
    testcaseName?: string
    errorMessage?: string
    userQuery?: string
  }) =>
    request<{
      rootCause: string
      affectedFiles: string[]
      explanation: string
      pedagogicalHint: string
      suggestedActionPlan: string[]
    }>('/ai/rag/diagnose', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  ragAssess: (submissionId: string) =>
    request<any>(`/ai/rag/assess/${submissionId}`, {
      method: 'POST',
    }),

  autoConfigureAssignment: (formData: FormData) =>
    request<any>('/ai/auto-configure-assignment', {
      method: 'POST',
      body: formData,
    }),

  searchSimilarRubrics: (params: { query: string; subjectCode?: string; language?: string; topK?: number }) => {
    const q = new URLSearchParams()
    if (params.query) q.set('query', params.query)
    if (params.subjectCode) q.set('subjectCode', params.subjectCode)
    if (params.language) q.set('language', params.language)
    if (params.topK) q.set('topK', String(params.topK))
    return request<any[]>(`/ai/rubrics/similar?${q.toString()}`)
  },

  getRubricDetail: (id: string) =>
    request<any>(`/ai/rubrics/${id}`),

  approveRubric: (id: string) =>
    request<any>(`/ai/rubrics/${id}/approve`, {
      method: 'PUT',
    }),

  updateRubric: (id: string, data: any) =>
    request<any>(`/ai/rubrics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

