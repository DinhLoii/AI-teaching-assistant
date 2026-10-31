import { createHash } from 'node:crypto'
import type { Submission } from '@prisma/client'

export function gradeRevision(sub: Pick<Submission, 'FinalScore' | 'TotalScore' | 'RawScore' | 'ReviewStatus' | 'ReviewedAt' | 'InstructorFeedback' | 'GradingStatus' | 'IsLatest'>) {
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.keys(gradeRevisionSelect).map(k => [k, sub[k as keyof typeof sub]])))).digest('hex')
}

export const weightsRevision = (value: string | null | undefined) => createHash('sha256').update(value || 'default').digest('hex')

export const gradeRevisionSelect = {
  FinalScore: true, TotalScore: true, RawScore: true, ReviewStatus: true,
  ReviewedAt: true, InstructorFeedback: true, GradingStatus: true, IsLatest: true,
} as const

export function effectiveGrade(sub: { FinalScore: unknown; RawScore: unknown; TotalScore: unknown; GradingStatus: string | null }) {
  if (String(sub.GradingStatus).toLowerCase() !== 'graded') return null
  const value = sub.FinalScore ?? sub.RawScore ?? sub.TotalScore
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value)
}

export function weightedGrade(exams: { id: string; maxScore: number | null; weight: number | null }[], grades: { examId: string; score: number | null }[]) {
  const configured = exams.length > 0 && exams.every(e => e.maxScore != null && e.maxScore > 0 && e.weight != null && e.weight >= 0)
    && Math.abs(exams.reduce((sum, e) => sum + (e.weight ?? 0), 0) - 100) < 0.001
  const required = exams.filter(e => (e.weight ?? 0) > 0)
  if (!configured || required.some(e => {
    const score = grades.find(g => g.examId === e.id)?.score
    return score == null || !Number.isFinite(score) || score < 0 || score > e.maxScore!
  })) return null
  return Math.round(required.reduce((sum, e) => sum + grades.find(g => g.examId === e.id)!.score! / e.maxScore! * e.weight! / 10, 0) * 100) / 100
}
