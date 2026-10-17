import { request } from '../client'
import type { ActivityLog } from '../contracts'

export interface AdminReport {
  period: string
  generatedAt: string
  range: { from: string; to: string; timezone: string }
  summary: { users: number; classes: number; exams: number; subjects: number; submissions: number; evaluated: number; auditLogs: number; assignedClasses: number; assignedLecturers: number }
  roles: { role: string; count: number }[]
  trend: { date: string; submissions: number; evaluated: number }[]
  grades: { count: number; average: number | null; passed: number; bins: number[] }
  majors: null
}
export interface SystemHealth {
  api: { status: string; uptimeSeconds?: number; formattedUptime?: string }
  database: { status: string; latencyMs?: number; poolStatus?: string }
  system?: {
    cpuUsagePercent: number | null
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

  getSystemReports: (period: '7d' | '30d' | 'semester' | 'year' | 'custom' = '30d', start?: string, end?: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ period })
    if (start) query.set('start', start)
    if (end) query.set('end', end)
    return request<AdminReport>(`/reports?${query}`, { cache: 'no-store', signal })
  },

  getHealthReports: () => request<SystemHealth>('/reports/health'),
}
