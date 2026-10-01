import { request } from '../client'
import type { AIConfig, Option } from '../contracts'

export const settingsApi = {
  getClassOptions: () => request<Option[]>(`/settings/options/classes`),

  getLecturerOptions: () => request<Option[]>(`/settings/options/lecturers`),

  getAIConfig: () =>
    request<AIConfig>('/ai/config'),

  updateAIConfig: (body: AIConfig) =>
    request<AIConfig>('/ai/config', { method: 'PUT', body: JSON.stringify(body) }),

  getSettingsConfig: () => request<Record<string, string>>('/settings'),

  updateSettingsConfig: (body: Record<string, string>) => request<Record<string, string>>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
}
