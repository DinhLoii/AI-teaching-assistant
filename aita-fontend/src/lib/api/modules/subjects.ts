import { request } from '../client'
import type { SubjectRow, CreateSubjectBody } from '../contracts'

export const subjectsApi = {
  getSubjects: (page = 1, limit = 10, search?: string) => request<SubjectRow[]>(`/subjects?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),

  getSubject: (id: string) => request<SubjectRow>(`/subjects/${id}`),

  createSubject: (body: CreateSubjectBody) =>
    request<SubjectRow>('/subjects', { method: 'POST', body: JSON.stringify(body) }),

  updateSubject: (id: string, body: Partial<CreateSubjectBody>) =>
    request<SubjectRow>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteSubject: (id: string) =>
    request<void>(`/subjects/${id}`, { method: 'DELETE' }),

  getSubjectStudents: async (subjectId: string, semesterId?: string, classId?: string, page: number = 1, limit: number = 10) => {
    const params = new URLSearchParams()
    if (semesterId) params.append('semesterId', semesterId)
    if (classId && classId !== 'all') params.append('classId', classId)
    params.append('page', page.toString())
    params.append('limit', limit.toString())

    return request<any>(`/subjects/${subjectId}/students?${params.toString()}`)
  },
}
