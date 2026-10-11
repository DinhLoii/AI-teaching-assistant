import { request } from '../client'
import type { ActivityLog } from '../contracts'

export interface AdminReport {
  period: string
  summary: { users: number; classes: number; exams: number; submissions: number; auditLogs: number }
}
export interface SystemHealth {
  api: { status: string; uptimeSeconds?: number; formattedUptime?: string }
  database: { status: string; latencyMs?: number; poolStatus?: string }
  system?: {
    cpuUsagePercent: number
    cpuCores: number
    cpuModel: string
    totalMemoryMb: number
    usedMemoryMb: number
    freeMemoryMb: number
    memoryUsagePercent: number
    platform: string
    nodeVersion: string
  }
  aiEngine: { status: string; mode: string; provider?: string; queueWorkers?: number }
  checkedAt?: string
}

export const reportsApi = {
  getStatsOverview: () => request<Record<string, string | number>>('/stats/overview'),

  getActivity: () => request<ActivityLog[]>('/stats/activity'),

  getSystemHealth: () => request<SystemHealth>('/reports/health'),

  getSystemReports: (period: '7d' | '30d' | 'semester' = '30d') => request<AdminReport>(`/reports?period=${period}`),

  getHealthReports: () => request<SystemHealth>('/reports/health'),
}
