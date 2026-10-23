import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import type { AssignmentRow, SubmissionRow } from '@/lib/api/contracts'

export async function loadStudentAssignment(id: string, callbacks: {
  assignment: (assignment: AssignmentRow, grading: any) => void
  assignmentError: (error: unknown) => void
  assignmentSettled: () => void
  submission: (submission: SubmissionRow | null) => void
  submissionError: (error: unknown) => void
}) {
  let assignment: AssignmentRow | undefined
  let grading: any = null
  const primary = assignmentsApi.getAssignment(id).then(value => {
    assignment = value
    callbacks.assignment(value, grading)
  }).catch(callbacks.assignmentError).finally(callbacks.assignmentSettled)
  const enrichment = assignmentsApi.getGradingAssignment(id).then(value => {
    grading = value
    if (assignment) callbacks.assignment(assignment, grading)
  }).catch(() => {}) // Optional enrichment must not block the assignment document.
  const history = submissionsApi.getSubmissions({ assignmentId: id, view: 'summary' }).then(rows => {
    callbacks.submission([...rows].sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime())[0] || null)
  }).catch(callbacks.submissionError)
  await Promise.allSettled([primary, enrichment, history])
}
