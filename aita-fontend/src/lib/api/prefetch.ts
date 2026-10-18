import { request } from './client'
import { ASSIGNMENT_LIST_PATH } from './modules/assignments'

// Warm only the destination the user points to; mounting the menu must not
// compete with the current page for API connections.
export function prefetchPageData(href: string): void {
  const paths: Record<string, string[]> = {
    '/student': ['/student-portal/dashboard'],
    '/student/assignments': ['/student-portal/dashboard', '/submissions', ASSIGNMENT_LIST_PATH],
    '/student/classes': ['/student-portal/dashboard', '/semesters'],
    '/student/results': ['/submissions'],
    '/lecturer': ['/classes?page=1&limit=1000', ASSIGNMENT_LIST_PATH, '/submissions'],
    '/lecturer/classes': ['/classes?page=1&limit=1000'],
    '/lecturer/grading/assignments': [ASSIGNMENT_LIST_PATH, '/classes?page=1&limit=1000'],
    '/profile': ['/auth/me'],
  }
  for (const path of paths[href] || []) {
    void request(path).catch(() => {})
  }
}
