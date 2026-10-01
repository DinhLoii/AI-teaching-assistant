import type { SubmissionRow } from '../contracts'

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeSubmissionRow(raw: any): SubmissionRow {
  const studentObj = raw?.student && typeof raw.student === 'object' ? raw.student : null
  const examObj = raw?.exam && typeof raw.exam === 'object' ? raw.exam : null
  const classObj = raw?.class && typeof raw.class === 'object' ? raw.class : null
  const fileObj = raw?.file && typeof raw.file === 'object' ? raw.file : null

  let parsedReport: any = null
  try {
    if (raw?.reportData) {
      parsedReport = typeof raw.reportData === 'string' ? JSON.parse(raw.reportData) : raw.reportData
    }
  } catch (e) { }

  const fallbackScore = parsedReport?.totalScore !== undefined ? toNullableNumber(parsedReport.totalScore) : null
  const normalizedAiScore = toNullableNumber(raw?.aiScore ?? raw?.rawScore ?? raw?.totalScore) ?? fallbackScore
  const normalizedScore = toNullableNumber(raw?.score ?? raw?.finalScore ?? raw?.totalScore) ?? fallbackScore
  const studentName = typeof raw?.student === 'string'
    ? raw.student
    : (studentObj?.fullName || studentObj?.name || raw?.studentName || studentObj?.studentCode || raw?.studentId || 'Sinh viên')

  const studentCode = typeof raw?.studentCode === 'string'
    ? raw.studentCode
    : (studentObj?.studentCode || studentObj?.code || raw?.studentCode || raw?.studentId || studentObj?.id || '')

  const assignmentTitle = typeof raw?.assignment === 'string'
    ? raw.assignment
    : (examObj?.title || raw?.assignment?.title || raw?.assignmentTitle || null)


  return {
    id: String(raw?.id ?? ''),
    assignmentId: raw?.assignmentId ?? raw?.examId ?? raw?.exam?.id ?? '',
    examId: raw?.examId ?? raw?.assignmentId ?? raw?.exam?.id ?? null,
    assignment: assignmentTitle,
    classId: raw?.classId ?? classObj?.id ?? null,
    studentId: String(studentCode),
    student: String(studentName),
    status: raw?.status ?? raw?.gradingStatus ?? 'pending',
    gradingStatus: raw?.gradingStatus ?? raw?.status ?? null,
    reviewStatus: raw?.reviewStatus ?? null,
    isPublished: raw?.isPublished === true || String(raw?.reviewStatus).toUpperCase() === 'PUBLISHED',
    submittedAt: raw?.submittedAt ?? null,
    gradedAt: raw?.gradedAt ?? null,
    reviewedAt: raw?.reviewedAt ?? null,
    content: raw?.content ?? null,
    language: raw?.language ?? null,
    zipFileUrl: raw?.zipFileUrl ?? undefined,
    downloadUrl: raw?.downloadUrl ?? fileObj?.downloadUrl ?? raw?.zipFileUrl ?? undefined,
    filename: raw?.filename ?? fileObj?.filename ?? fileObj?.fileName ?? undefined,
    score: normalizedScore,
    aiScore: normalizedAiScore,
    totalScore: toNullableNumber(raw?.totalScore) ?? fallbackScore,
    finalScore: toNullableNumber(raw?.finalScore) ?? fallbackScore,
    rawScore: raw?.score ?? raw?.finalScore ?? raw?.totalScore ?? fallbackScore,
    rawAiScore: raw?.aiScore ?? raw?.totalScore ?? fallbackScore,
    reportData: parsedReport,
    latePenaltyAmount: toNullableNumber(raw?.latePenaltyAmount),
    isReopened: raw?.isReopened ?? false,
    reopenReason: raw?.reopenReason ?? null,
    extendedDueDate: raw?.extendedDueDate ?? raw?.ExtendedDueDate ?? null,
    ruleScores: raw?.ruleScores ?? raw?.RuleScores ?? parsedReport?.ruleScores ?? null,
    aiFeedback: raw?.aiFeedback ?? parsedReport?.overallFeedback ?? null,
    instructorFeedback: raw?.instructorFeedback ?? null,
    studentFeedback: raw?.studentFeedback ?? null,
  }
}
