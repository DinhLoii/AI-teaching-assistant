import type { Submission } from '../entities/submission.entity.js'
import type { GradingStatusValue } from '../entities/submission.entity.js'

export interface SubmissionFilter {
  examId?: string
  studentId?: string
  classId?: string
  instructorId?: string
  status?: GradingStatusValue
}

export interface ISubmissionRepository {
  findMany(filter?: SubmissionFilter): Promise<Submission[]>
  findRecent(filter?: SubmissionFilter, take?: number): Promise<Submission[]>
  findById(id: string): Promise<Submission | null>
  findByIdForInstructor(id: string, instructorId: string): Promise<Submission | null>
  create(submission: Submission): Promise<void>
  update(submission: Submission): Promise<void>
  save(submission: Submission): Promise<void>
}
