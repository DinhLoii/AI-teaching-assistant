export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  FEATURES: '/features',
  LOGIN: '/login',
  PROFILE: '/profile',

  // Admin
  ADMIN: {
    ROOT: '/admin',
    USERS: '/admin/users',
    CLASSES: '/admin/classes',
    CLASS_DETAIL: (id: string | number) => `/admin/classes/${id}`,
    SUBJECTS: '/admin/subjects',
    SUBJECT_DETAIL: (id: string | number) => `/admin/subjects/${id}`,
    EXAMS: '/admin/exams',
    EXAM_SUBMISSIONS: (id: string | number) => `/admin/exams/${id}/submissions`,
    SEASONS: '/admin/seasons',
    AI_CONFIG: '/admin/ai-config',
    SETTINGS: '/admin/settings',
    AUDIT_LOGS: '/admin/audit-logs',
    REPORTS: '/admin/reports',
    NOTIFICATIONS: '/admin/notifications',
  },

  // Lecturer
  LECTURER: {
    ROOT: '/lecturer',
    CLASSES: '/lecturer/classes',
    CLASS_DETAIL: (id: string | number) => `/lecturer/classes/${id}`,
    SUBJECTS: '/lecturer/subjects',
    SUBJECT_DETAIL: (id: string | number) => `/lecturer/subjects/${id}`,
    PROMPTS: '/lecturer/prompts',
    PROMPTS_BY_SUBJECT: (subjectId: string | number) => `/lecturer/prompts/${subjectId}`,
    PROMPT_CREATE: (subjectId: string | number) => `/lecturer/prompts/${subjectId}/create`,
    PROMPT_EDIT: (subjectId: string | number, promptId: string | number) => `/lecturer/prompts/${subjectId}/edit/${promptId}`,
    RUBRIC_GENERATOR: '/lecturer/rubric-generator',
    ASSIGNMENT_WORKSPACE: (id: string | number) => `/lecturer/assignments/${id}`,
    ASSIGNMENT_SUBMISSIONS: (id: string | number) => `/lecturer/assignments/${id}/submissions`,
    NOTIFICATIONS: '/lecturer/notifications',

    // Grading subroutes
    GRADING: {
      ROOT: '/lecturer/grading',
      HUB: '/lecturer/grading/hub',
      UPLOAD: '/lecturer/grading/upload',
      HISTORY: '/lecturer/grading/history',
      ASSIGNMENTS: '/lecturer/grading/assignments',
      ASSIGNMENTS_UPLOAD: '/lecturer/grading/assignments/upload',
      ASSIGNMENT: (id: string | number) => `/lecturer/grading/assignments/${id}`,
      ASSIGNMENT_RUBRIC: (id: string | number) => `/lecturer/grading/assignments/${id}/rubric`,
      ASSIGNMENT_SUBMIT: (id: string | number) => `/lecturer/grading/assignments/${id}/submit`,
      BATCH: '/lecturer/grading/batch',
      LIVE: (id: string | number) => `/lecturer/grading/live/${id}`,
      RESULT: (id: string | number) => `/lecturer/grading/result/${id}`,
    },
  },

  // Student
  STUDENT: {
    ROOT: '/student',
    COURSES: '/student/courses',
    COURSE_DETAIL: (code: string) => `/student/courses/${code}`,
    CLASSES: '/student/classes',
    CLASS_DETAIL: (id: string | number) => `/student/classes/${id}`,
    SUBJECTS: '/student/subjects',
    ASSIGNMENTS: '/student/assignments',
    ASSIGNMENT_DETAIL: (id: string | number) => `/student/assignments/${id}`,
    RESULTS: '/student/results',
    RESULT_DETAIL: (id: string | number) => `/student/grading/result/${id}`,
    NOTIFICATIONS: '/student/notifications',
  },
} as const
