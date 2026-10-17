import { request } from '../client'
import type { SubjectRow, SemesterRow, CreateSemesterBody, CreateSeasonBody } from '../contracts'

export const semestersApi = {
  getSemesters: (options: Pick<RequestInit, 'cache'> = {}) => request<SemesterRow[]>(`/semesters`, options),

  createSemester: (body: CreateSemesterBody) =>
    request<SemesterRow>('/semesters', { method: 'POST', body: JSON.stringify(body) }),

  createSeason: (body: CreateSeasonBody) =>
    request<SemesterRow[]>('/semesters/season', { method: 'POST', body: JSON.stringify(body) }),

  updateSemester: (id: string, body: Partial<CreateSemesterBody>) =>
    request<SemesterRow>(`/semesters/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteSemester: (id: string) =>
    request<void>(`/semesters/${id}`, { method: 'DELETE' }),

  getSemesterSubjects: (semesterId: string) => request<SubjectRow[]>(`/semesters/${semesterId}/subjects`),

  addSemesterSubjects: (semesterId: string, subjectIds: string[]) => request<void>(`/semesters/${semesterId}/subjects`, { method: 'POST', body: JSON.stringify({ subjectIds }) }),

  removeSemesterSubject: (semesterId: string, subjectId: string) => request<void>(`/semesters/${semesterId}/subjects/${subjectId}`, { method: 'DELETE' }),

  deleteSeason: (season: string) => request<void>(`/semesters/season/${encodeURIComponent(season)}`, { method: 'DELETE' }),

  activateSeason: (season: string) => request<{ season: string; isActive: boolean }>(`/semesters/season/${encodeURIComponent(season)}/activate`, { method: 'POST' }),

  getClassesBySubject: (semesterId: string, subjectId: string) => request<any[]>(`/semesters/${semesterId}/subjects/${subjectId}/classes`),
}
