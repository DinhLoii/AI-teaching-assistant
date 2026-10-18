// Backend request/response contracts. UI view models belong in their feature.

export interface AuthUser {
  id: string
  email: string
  fullName: string
  name: string
  role: 'admin' | 'lecturer' | 'student'
  status: string
  campus?: string
  externalId?: string | null
  avatar?: string | null
  phone?: string
  lecturerCode?: string
  studentCode?: string
  // true khi tài khoản được tạo qua import — hệ thống ép đổi mật khẩu lần đầu đăng nhập
  requirePasswordChange?: boolean
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  status: string
  studentCode?: string
  lecturerCode?: string
  phone?: string
  avatar?: string
  lastLoginAt?: string
  enrolledClasses?: any[]
  instructingClasses?: any[]
}

export interface BulkDeleteUsersResult {
  deleted: string[]
  /** Ids that were already gone — not an error, a repeated attempt is harmless. */
  skipped: string[]
  failed: Array<{ id: string; reason: string }>
  success: boolean
  message: string
}

export interface ImportUserRow {
  fullName: string
  email: string
  classCode?: string
  semesterCode?: string
  subjectCode?: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
}

export interface CreateUserBody {
  email: string
  password: string
  fullName: string
  role: string
  studentCode?: string
  lecturerCode?: string
  phone?: string
  campus?: string
  avatar?: string | null
  classIds?: string[]
  externalId?: string
}

export interface ClassRow {
  id: string
  code: string
  name: string
  subject: string | { id: string; code: string; name: string }
  subjectCode?: string
  subjectName?: string
  semester: string | { id: string; code: string }
  campus?: string
  schedule?: string
  lecturer?: AuthUser
  lecturers?: AuthUser[]
  studentCount?: number
  count?: number
  // Internal staff note â€” present only for ADMIN/LECTURER (BE omits it for students).
  note?: string | null
}

export interface CreateClassBody {
  code: string
  name?: string
  subjectId: string
  semesterId?: string
  campus?: string
  schedule?: string
  lecturerId?: string
  keepExistingInstructors?: boolean
  studentIds?: string[]
}

export interface ImportUsersResult {
  totalProcessed: number
  successCount: number
  errorCount: number
  errors: string[]
}

export interface StudentRow {
  id?: string
  studentId: string
  name: string
  email: string
  avatar?: string
  progress: string
  grade: string
}

export interface AssignmentRow {
  runtimeLanguage?: string | null
  testCases?: { id: string; input: string; expectedOutput: string; points: number; isHidden: boolean }[]
  documentContent?: string
  documentAnalysis?: {
    language?: string | null
    platform?: string | null
    reviewStatus: 'teacher_reviewed' | 'unreviewed'
    requirementGroups?: Record<string, { text: string; sourceQuote?: string }[]> | null
    acceptanceTests?: { id: string; steps: string; expectedResult: string; level: string }[]
  }
  id: string
  title: string
  description: string
  type: string
  class?: string
  classId: string
  dueAt: string
  due?: string | null
  status: string
  subjectId: string
  subjectCode?: string | null
  subjectName?: string | null
  lecturer?: string | null
  lecturerAvatar?: string | null
  createdAt?: string | null
  classes?: string[]
  maxScore?: number
  submitted?: number
  strategy?: string | null
  latePenaltyType?: string | null
  latePenaltyValue?: number | null
  lateSubmitHours?: number | null
  content?: unknown
  attachments?: {
    id: string
    fileName: string
    fileUrl: string
    fileType: string
  }[]
  rubrics?: {
    id: string
    scoringStrategy?: string
    description: string
    maxPoints: number
    criteria: {
      id: string
      description: string
      maxPoints: number
    }[]
  }[]
}

export interface SubmissionRow {
  gradingError?: string | null
  maxScore?: number | null
  id: string
  assignmentId: string
  examId?: string | null
  assignment?: string | null
  classId?: string | null
  student: string
  studentId: string
  submittedAt: string | null
  gradedAt?: string | null
  reviewedAt?: string | null
  content?: string | null
  language?: string | null
  filename?: string
  downloadUrl?: string
  zipFileUrl?: string
  status: string
  gradingStatus?: string | null
  reviewStatus?: string | null
  isPublished?: boolean
  score?: number | null
  aiScore: number | string | null
  totalScore?: number | null
  finalScore?: number | null
  rawScore?: number | string | null
  rawAiScore?: number | string | null
  aiFeedback?: unknown | null
  reportData?: any
  instructorFeedback?: string | null
  studentFeedback?: string | null
  latePenaltyAmount?: number | null
  isReopened?: boolean
  reopenReason?: string | null
  extendedDueDate?: string | null
  attemptNumber?: number
  ruleScores?: any[] | null
}

export interface SubmissionListQuery {
  assignmentId?: string
  examId?: string
  classId?: string
  status?: string
}

export interface CreateSubmissionBody {
  assignmentId?: string
  examId?: string
  classId?: string
  content?: string
  zipFileUrl?: string
  language?: string
}

export interface AIReviewRow {
  id: string
  type: string
  title: string
  class: string
  createdAt: string
  status: string
}

export interface AIConfig {
  aiEndpoint: string
  aiModel: string
  aiTimeout: string
  aiStubMode: string
}

export interface ActivityLog {
  id: string
  action: string
  user: string
  createdAt: string
}

export interface Option {
  value: string
  label: string
}

export interface FeedbackRow {
  id: string
  title: string
  aiScore: number | null
  score: number | null
  feedback: unknown
  approved: boolean
}

export interface StudentProgress {
  gpa: number
  done: number
  rank: string
  streak: string
  history: { assignment: string; score: number | null; date: string | null }[]
}

export interface LearningData {
  skills: { topic: string; level: string; suggestion?: string | null }[]
  recommendations: { type: string; title: string }[]
}

export interface SubjectRow {
  id: string
  code: string
  name: string
  description?: string
  status?: string
  semester?: number
  credit?: number | null
  syllabusData?: string | null
  seasons?: string[]  // active seasons teaching this subject, e.g. ["Spring", "Fall"]
}

export interface CreateSubjectBody {
  code: string
  name: string
  description?: string
  semester?: number
  credit?: number
  syllabusData?: string
}

export interface SemesterRow {
  id: string
  code: string
  season?: string
  startDate?: string
  endDate?: string
  isActive: boolean
  classCount?: number
  subjectCount?: number
}

export interface CreateSemesterBody {
  code: string
  season?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export interface CreateSeasonBody {
  season: string
  startDate?: string
  endDate?: string
}

export interface ExamRow {
  id: string
  title: string
  description?: string | null
  type?: string | null
  status: string
  subjectId?: string | null
  subjectName?: string | null
  maxScore?: number | null
  duration?: number | null
  due?: string | null
  dueAt?: number | null
  createdAt?: string | null
  classes?: string[] | null
  weightPercentage?: number | null
  latePenaltyType?: string | null
  latePenaltyValue?: number | null
  maxLatePenalty?: number | null
  allowLateSubmission?: boolean | null
  content?: string | null
  attachments?: { id: string; fileName: string; fileUrl: string; fileType: string }[] | null
  rubrics?: any[] | null
  lecturer?: string | null
}

export interface CreateExamBody {
  title: string
  subjectId: string
  description?: string
  type?: string
  duration?: number
  dueAt?: string
  dueDate?: string
  maxScore?: number
  weightPercentage?: number
  classIds?: string[]
  sendNotification?: boolean
  latePenaltyType?: 'NONE' | 'DAILY_POINTS' | 'DAILY_PERCENT' | 'FLAT_POINTS'
  latePenaltyValue?: number
  maxLatePenalty?: number
  allowLateSubmission?: boolean
}
