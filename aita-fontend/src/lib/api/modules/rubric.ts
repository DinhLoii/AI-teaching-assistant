import { request } from '../client'
import type { AssignmentRow } from '../contracts'

export const rubricApi = {
  startGradingSession: (assignmentId: string) =>
    request<{ sessionId: string }>('/grading/start', { method: 'POST', body: JSON.stringify({ assignmentId }) }),

  getRubricRules: () => request<any[]>('/rubric/rules'),

  generateExerciseAI: (body: { topic: string, difficulty: string, type: string }) =>
    request<any>('/ai/generate-exercise', { method: 'POST', body: JSON.stringify(body) }),

  generateRubricAI: (body: any) => {
    const isFormData = body instanceof FormData;
    return request<any>('/ai/generate-rubric', {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    })
  },

  saveExamRubric: (examId: string, body: any) => {
    const isFormData = body instanceof FormData;
    return request<any>(`/rubric/exams/${examId}`, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    })
  },

  saveAIAssignment: (body: any) =>
    request<AssignmentRow>('/ai/save-assignment', { method: 'POST', body: JSON.stringify(body) }),

  assessSubmissionAI: (submissionId: string) =>
    request<any>(`/ai/assess/${submissionId}`, { method: 'POST' }),

  getAIFeedback: (studentId: string) =>
    request<any>(`/ai/feedback/${studentId}`),
}
