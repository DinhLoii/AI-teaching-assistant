// Compatibility facade for legacy callers. New code imports a domain module directly.
import { authApi } from './modules/auth'
import { usersApi } from './modules/users'
import { classesApi } from './modules/classes'
import { assignmentsApi } from './modules/assignments'
import { studentPortalApi } from './modules/student-portal'
import { subjectsApi } from './modules/subjects'
import { semestersApi } from './modules/semesters'
import { promptsApi } from './modules/prompts'
import { examsApi } from './modules/exams'
import { submissionsApi } from './modules/submissions'
import { rubricApi } from './modules/rubric'
import { settingsApi } from './modules/settings'
import { notificationsApi } from './modules/notifications'
import { auditApi } from './modules/audit'
import { reportsApi } from './modules/reports'
import { notesApi } from './modules/notes'

export { ApiError } from './client'
export { AUTH_STORAGE_KEYS, getStoredItem, setStoredItem, removeStoredItem } from './storage'
export type * from './contracts'
export { gradingApi } from './modules/grading'
export { aiApi } from './modules/ai'
export { notesApi } from './modules/notes'

export const api = {
  ...authApi,
  ...usersApi,
  ...classesApi,
  ...assignmentsApi,
  ...studentPortalApi,
  ...subjectsApi,
  ...semestersApi,
  ...promptsApi,
  ...examsApi,
  ...submissionsApi,
  ...rubricApi,
  ...settingsApi,
  ...notificationsApi,
  ...auditApi,
  ...reportsApi,
  ...notesApi,
}
