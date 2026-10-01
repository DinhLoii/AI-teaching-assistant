import { request } from '../client'

export interface AuditEntry {
  id: string
  userId: string | null
  createdAt: string | null
  action?: string | null
  entityName?: string | null
  entityId?: string | null
  modelUsed?: string | null
  actionType?: string | null
  isSuccess?: boolean | null
  errorMessage?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
}

export const auditApi = {
  getAuditLogs: (page = 1, limit = 20) => request<AuditEntry[]>(`/audit/logs?page=${page}&limit=${limit}`),

  getAIAuditLogs: (page = 1, limit = 20) => request<AuditEntry[]>(`/audit/ai-usage?page=${page}&limit=${limit}`),
}
