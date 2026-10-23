import { assignmentsApi } from '@/lib/api/modules/assignments'
import { submissionsApi } from '@/lib/api/modules/submissions'
import { classesApi } from '@/lib/api/modules/classes'
import type { AssignmentRow, SubmissionRow, StudentRow } from '@/lib/api/contracts'

export async function loadSubmissionWorkspace(assignmentId: string, callbacks: {
  assignment: (value: AssignmentRow) => void
  roster: (value: StudentRow[]) => void
  submissions: (value: SubmissionRow[]) => void
  submissionsError: (error: unknown) => void
  submissionsSettled: () => void
}, fresh = false): Promise<void> {
  const metadata = assignmentsApi.getAssignmentSummary(assignmentId).then(async assignment => {
    callbacks.assignment(assignment)
    const classId = assignment?.classId || assignment?.classes?.[0]
    if (classId) callbacks.roster(await classesApi.getClassStudents(classId))
  })
  const rows = submissionsApi.getSubmissions({ assignmentId, view: 'summary' }, fresh)
    .then(callbacks.submissions)
    .catch(error => { callbacks.submissionsError(error); throw error })
    .finally(callbacks.submissionsSettled)
  const results = await Promise.allSettled([metadata, rows])
  const failure = results.find(result => result.status === 'rejected')
  if (failure?.status === 'rejected') throw failure.reason
}
