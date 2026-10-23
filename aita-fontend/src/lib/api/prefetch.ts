import { request } from './client'
import { ASSIGNMENT_LIST_PATH } from './modules/assignments'

// Warm only the destination the user points to; mounting the menu must not
// compete with the current page for API connections.
export function prefetchPageData(href: string): void {
  const paths: Record<string, string[]> = {
    '/student': ['/student-portal/dashboard'],
    '/student/assignments': ['/student-portal/dashboard', '/submissions?view=summary', ASSIGNMENT_LIST_PATH],
    '/student/classes': ['/student-portal/dashboard', '/semesters'],
    '/student/results': ['/submissions?view=summary'],
    '/lecturer': ['/classes?page=1&limit=1000', ASSIGNMENT_LIST_PATH, '/submissions?view=summary'],
    '/lecturer/classes': ['/classes?page=1&limit=1000'],
    '/lecturer/grading/assignments': [ASSIGNMENT_LIST_PATH, '/classes?page=1&limit=1000'],
    '/lecturer/grading/hub': [ASSIGNMENT_LIST_PATH, '/submissions?view=summary'],
    '/lecturer/subjects': ['/subjects?page=1&limit=1000', '/classes?page=1&limit=1000'],
    '/admin': ['/audit/logs?page=1&limit=6', '/classes?page=1&limit=10'],
    '/admin/users': ['/users?role=STUDENT&page=1&limit=50'],
    '/admin/users?role=lecturer': ['/users?role=LECTURER&page=1&limit=50'],
    '/admin/users?role=student': ['/users?role=STUDENT&page=1&limit=50'],
    '/admin/classes': ['/classes?page=1&limit=10'],
    '/admin/subjects': ['/subjects?page=1&limit=50'],
    '/profile': ['/auth/me'],
  }
  for (const path of paths[href] || []) {
    void request(path).catch(() => {})
  }
}
