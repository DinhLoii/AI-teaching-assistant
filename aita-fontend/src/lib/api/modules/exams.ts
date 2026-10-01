import { request } from '../client'
import type { ExamRow, CreateExamBody } from '../contracts'

export const examsApi = {
  getExams: (page = 1, limit = 10, subjectId?: string) => {
    let url = `/exams?page=${page}&limit=${limit}`;
    if (subjectId) url += `&classId=${subjectId}`;
    return request<ExamRow[]>(url);
  },

  getExam: (id: string) => request<ExamRow>(`/exams/${id}`),

  createExam: (body: CreateExamBody) =>
    request<ExamRow>('/exams', { method: 'POST', body: JSON.stringify(body) }),

  updateExam: (id: string, body: Partial<CreateExamBody>) =>
    request<ExamRow>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteExam: (id: string) =>
    request<void>(`/exams/${id}`, { method: 'DELETE' }),
}
