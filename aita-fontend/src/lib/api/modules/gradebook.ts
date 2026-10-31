import { request } from '../client'

export interface GradebookCourse {
  id: string; code: string; subjectId: string | null; subjectCode: string; subjectName: string
  students: number; lecturers: string[]; status: string | null
}
export interface GradebookSemester {
  id: string; code: string | null; season: string | null; active: boolean
  startDate: string | null; endDate: string | null; classes: GradebookCourse[]
}
export interface GradebookExam {
  id: string; title: string; type: string | null; maxScore: number | null; weight: number | null; dueDate: string | null
}
export interface GradebookCell {
  examId: string; submissionId: string | null; attempt: number | null; submittedAt: string | null
  score: number | null; rawScore: number | null; penalty: number | null; feedback: string; status: string
  published: boolean; reviewedAt: string | null; revision: string | null
}
export interface GradebookStudent {
  id: string; code: string | null; name: string | null; email: string | null
  grades: GradebookCell[]; total: number | null; publishedTotal: number | null
}
export interface Gradebook {
  class: { id: string; code: string | null; semester: string; semesterId: string | null; subjectCode: string | null; subjectName: string | null; lecturers: string[] }
  exams: GradebookExam[]; rows: GradebookStudent[]; weightTotal: number; weightsRevision: string; weightsSource: 'class' | 'exam'; generatedAt: string
}
export interface GradebookHistory {
  id: string; at: string | null; actor: string
  before: { score: number | null; published: boolean; feedback: string | null }
  after: { score: number; published: boolean; feedback: string | null; reason: string }
}
export interface GradebookChange {
  submissionId: string; revision: string; finalScore?: number; feedback?: string; published?: boolean
}

export const gradebookApi = {
  catalog: (signal?: AbortSignal) => request<GradebookSemester[]>('/classes/gradebook/catalog', { cache: 'no-store', signal }),
  get: (classId: string, signal?: AbortSignal) => request<Gradebook>(`/classes/${encodeURIComponent(classId)}/gradebook`, { cache: 'no-store', signal }),
  history: (classId: string, submissionId: string, signal?: AbortSignal) => request<GradebookHistory[]>(`/classes/${encodeURIComponent(classId)}/gradebook/${encodeURIComponent(submissionId)}/history`, { cache: 'no-store', signal }),
  update: (classId: string, reason: string, changes: GradebookChange[]) => request<{ updated: number }>(`/classes/${encodeURIComponent(classId)}/gradebook`, { method: 'PATCH', body: JSON.stringify({ reason, changes }) }),
  weights: (classId: string, body: { reason: string; revision: string; weights: { examId: string; weight: number }[] }) => request<{ updated: number }>(`/classes/${encodeURIComponent(classId)}/gradebook/weights`, { method: 'PUT', body: JSON.stringify(body) }),
}
