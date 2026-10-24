import { clearClientApiCache } from '../api/client'

export const ASSIGNMENTS_EVENT = 'aita-assignments-changed'

export function assignmentNoticeVersion(item: { id: string; type: string; message: string; createdAt: string | null }): string | null {
  if (!['ASSIGNMENT_REOPENED', 'ASSIGNMENT_UPDATED', 'DEADLINE_CHANGED'].includes(item.type.toUpperCase())) return null
  return JSON.stringify([item.id, item.type, item.message, item.createdAt])
}

export function emitAssignmentsChanged() {
  for (const path of ['/student-portal', '/assignments', '/exams', '/submissions', '/grading/assignments']) clearClientApiCache(path)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ASSIGNMENTS_EVENT))
}
