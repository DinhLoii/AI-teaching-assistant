import { request } from '../client'

export interface PromptBody {
  name: string
  subjectId: string
  templateContent: string
  category?: string
  placeholderSchema?: string
  isDefault?: boolean
  isActive?: boolean
}
export interface PromptTemplate extends PromptBody {
  id: string
  usageCount: number
  createdBy?: string
}

export const promptsApi = {
  getPromptTemplates: (subjectId: string) => request<PromptTemplate[]>(`/prompts/subject/${subjectId}`, { cache: 'no-store' }),

  createPromptTemplate: (data: PromptBody) => request<PromptTemplate>('/prompts', { method: 'POST', body: JSON.stringify(data) }),

  updatePromptTemplate: (id: string, data: Partial<PromptBody>) => request<PromptTemplate>(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePromptTemplate: (id: string) => request<void>(`/prompts/${id}`, { method: 'DELETE' }),

  incrementPromptUsage: (id: string) => request<void>(`/prompts/${id}/increment-usage`, { method: 'POST' }),
}
