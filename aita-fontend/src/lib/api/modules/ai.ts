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
}
