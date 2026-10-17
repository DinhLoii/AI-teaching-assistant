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

  const failedReport = !!parsedReport?.error
  const fallbackScore = !failedReport && parsedReport?.totalScore != null ? toNullableNumber(parsedReport.totalScore) : null
  const normalizedAiScore = failedReport ? null : toNullableNumber(raw?.aiScore ?? raw?.rawScore) ?? fallbackScore
  const normalizedScore = failedReport ? null : toNullableNumber(raw?.score ?? raw?.finalScore ?? raw?.rawScore) ?? fallbackScore
  const studentName = typeof raw?.student === 'string'
    ? raw.student
    : (studentObj?.fullName || studentObj?.name || raw?.studentName || studentObj?.studentCode || raw?.studentId || 'Sinh viên')

  const studentCode = typeof raw?.studentCode === 'string'
    ? raw.studentCode
    : (studentObj?.studentCode || studentObj?.code || raw?.studentCode || raw?.studentId || studentObj?.id || '')

  const assignmentTitle = typeof raw?.assignment === 'string'
    ? raw.assignment
    : (examObj?.title || raw?.assignment?.title || raw?.assignmentTitle || null)


  let filename = raw?.filename ?? fileObj?.filename ?? fileObj?.fileName ?? undefined
  if (!filename && (raw?.zipFileUrl || raw?.downloadUrl || raw?.ZipFileUrl)) {
    const targetUrl = String(raw?.zipFileUrl || raw?.downloadUrl || raw?.ZipFileUrl || '')
    try {
      const match = targetUrl.match(/filename=([^&]+)/i)
      if (match && match[1]) {
        filename = decodeURIComponent(match[1])
      } else {
        const cleanUrl = targetUrl.split('?')[0]
        const segments = cleanUrl.split('/')
        const last = segments[segments.length - 1]
        if (last && (last.includes('.') || last.toLowerCase().includes('zip'))) {
          filename = decodeURIComponent(last)
        }
      }
    } catch {}
  }

  return {
    id: String(raw?.id ?? raw?.Id ?? ''),
    assignmentId: raw?.assignmentId ?? raw?.examId ?? raw?.ExamId ?? raw?.exam?.id ?? '',
    examId: raw?.examId ?? raw?.ExamId ?? raw?.assignmentId ?? raw?.exam?.id ?? null,
    assignment: assignmentTitle,
    classId: raw?.classId ?? raw?.ClassId ?? classObj?.id ?? null,
    studentId: String(studentCode),
    student: String(studentName),
    status: raw?.status ?? raw?.gradingStatus ?? raw?.GradingStatus ?? 'pending',
    gradingStatus: raw?.gradingStatus ?? raw?.GradingStatus ?? raw?.status ?? null,
    gradingError: raw?.gradingError ?? null,
    reviewStatus: raw?.reviewStatus ?? raw?.ReviewStatus ?? null,
    isPublished: raw?.isPublished === true || String(raw?.reviewStatus ?? raw?.ReviewStatus).toUpperCase() === 'PUBLISHED',
    attemptNumber: raw?.attemptNumber ?? raw?.AttemptNumber ?? 1,
    submittedAt: raw?.submittedAt ?? raw?.SubmittedAt ?? null,
    gradedAt: raw?.gradedAt ?? raw?.GradedAt ?? null,
    reviewedAt: raw?.reviewedAt ?? raw?.ReviewedAt ?? null,
    content: raw?.content ?? raw?.Content ?? null,
    language: raw?.language ?? raw?.Language ?? null,
    zipFileUrl: raw?.zipFileUrl ?? raw?.ZipFileUrl ?? undefined,
    downloadUrl: raw?.downloadUrl ?? fileObj?.downloadUrl ?? raw?.zipFileUrl ?? raw?.ZipFileUrl ?? undefined,
    filename: filename,
    score: normalizedScore,
    maxScore: toNullableNumber(raw?.maxScore ?? parsedReport?.maxPossibleScore ?? examObj?.totalPoints),
    aiScore: normalizedAiScore,
    totalScore: failedReport ? null : toNullableNumber(raw?.totalScore) ?? fallbackScore,
    finalScore: failedReport ? null : toNullableNumber(raw?.finalScore) ?? fallbackScore,
    rawScore: failedReport ? null : raw?.rawScore ?? raw?.score ?? raw?.finalScore ?? fallbackScore,
    rawAiScore: failedReport ? null : raw?.aiScore ?? raw?.rawScore ?? fallbackScore,
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
