import { request } from '../client'

export const studentPortalApi = {
  getStudentDashboard: (options: Pick<RequestInit, 'cache'> = {}) => request<any>('/student-portal/dashboard', options),

  getStudentSubjects: (semester?: string) => request<any[]>(`/student-portal/subjects${semester ? `?semester=${encodeURIComponent(semester)}` : ''}`),

  getStudentClassDetail: (classId: string) => request<any>(`/student-portal/classes/${classId}`),

  getStudentAiHint: (submissionId: string, ruleScoreId: string) => request<any>(`/submissions/${submissionId}/ai-feedback?ruleScoreId=${ruleScoreId}`),
}
