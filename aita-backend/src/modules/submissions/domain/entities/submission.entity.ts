import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type GradingStatusValue = 'Pending' | 'Queued' | 'Grading' | 'Graded' | 'Error'
/**
 * `PUBLISHED` is the value every reader tests for — SubmissionResponseDto nulls each score
 * unless it sees it, and PrismaStatsRepository filters GPA/history/graded counts on it. The
 * grading engine writes it (SubmissionController: `ReviewStatus: 'PUBLISHED'` on publish,
 * `'DRAFT'` on unpublish), so both are listed here as values that come back out of the DB.
 * `Reviewed` is legacy: this module used to write it on publish, which meant a grade
 * published through /submissions/:id/grade saved its score and was then filtered out of
 * every read — see `review()`.
 */
export type ReviewStatusValue = 'PendingReview' | 'PUBLISHED' | 'DRAFT' | 'Reviewed' | 'Disputed'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class SubmissionCreatedEvent extends DomainEvent {
  constructor(
    public readonly submissionId: string,
    public readonly studentId: string | null,
    public readonly examId: string | null
  ) {
    super('SubmissionCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      submissionId: this.submissionId,
      studentId: this.studentId,
      examId: this.examId,
      occurredAt: this.occurredAt,
    }
  }
}

export class SubmissionGradedEvent extends DomainEvent {
  constructor(
    public readonly submissionId: string,
    public readonly totalScore: number | null
  ) {
    super('SubmissionGradedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      submissionId: this.submissionId,
      totalScore: this.totalScore,
      occurredAt: this.occurredAt,
    }
  }
}

export class SubmissionReviewedEvent extends DomainEvent {
  constructor(
    public readonly submissionId: string,
    public readonly reviewedBy: string | null,
    public readonly finalScore: number | null
  ) {
    super('SubmissionReviewedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      submissionId: this.submissionId,
      reviewedBy: this.reviewedBy,
      finalScore: this.finalScore,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: Submission
// ──────────────────────────────────────────────────────────────

export class Submission extends AggregateRoot {
  id: string
  examId: string | null
  studentId: string | null
  classId: string | null
  attemptNumber: number | null
  isLatest: boolean | null
  submittedAt: Date | null
  zipFileUrl: string | null
  gradingStatus: GradingStatusValue | null
  reviewStatus: ReviewStatusValue | null
  totalScore: number | null
  finalScore: number | null
  instructorFeedback: string | null
  studentFeedback: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  gradedAt: Date | null

  private constructor(
    id: string,
    examId: string | null,
    studentId: string | null,
    classId: string | null,
    attemptNumber: number | null,
    isLatest: boolean | null,
    submittedAt: Date | null,
    zipFileUrl: string | null,
    gradingStatus: GradingStatusValue | null,
    reviewStatus: ReviewStatusValue | null,
    totalScore: number | null,
    finalScore: number | null,
    instructorFeedback: string | null,
    studentFeedback: string | null,
    reviewedBy: string | null,
    reviewedAt: Date | null,
    gradedAt: Date | null
  ) {
    super()
    this.id = id
    this.examId = examId
    this.studentId = studentId
    this.classId = classId
    this.attemptNumber = attemptNumber
    this.isLatest = isLatest
    this.submittedAt = submittedAt
    this.zipFileUrl = zipFileUrl
    this.gradingStatus = gradingStatus
    this.reviewStatus = reviewStatus
    this.totalScore = totalScore
    this.finalScore = finalScore
    this.instructorFeedback = instructorFeedback
    this.studentFeedback = studentFeedback
    this.reviewedBy = reviewedBy
    this.reviewedAt = reviewedAt
    this.gradedAt = gradedAt
  }

  // ── Factory Methods ──

  static create(
    id: string,
    studentId: string,
    examId: string,
    classId: string,
    attemptNumber: number,
    zipFileUrl: string
  ): Submission {
    const submission = new Submission(
      id, examId, studentId, classId,
      attemptNumber, true, new Date(), zipFileUrl,
      'Pending', 'PendingReview',
      null, null, null, null, null, null, null
    )
    submission.addDomainEvent(
      new SubmissionCreatedEvent(submission.id, submission.studentId, submission.examId)
    )
    return submission
  }

  static restore(
    id: string,
    examId: string | null,
    studentId: string | null,
    classId: string | null,
    attemptNumber: number | null,
    isLatest: boolean | null,
    submittedAt: Date | null,
    zipFileUrl: string | null,
    gradingStatus: GradingStatusValue | null,
    reviewStatus: ReviewStatusValue | null,
    totalScore: number | null,
    finalScore: number | null,
    instructorFeedback: string | null,
    reviewedBy: string | null,
    reviewedAt: Date | null,
    gradedAt: Date | null,
    studentFeedback?: string | null
  ): Submission {
    return new Submission(
      id, examId, studentId, classId, attemptNumber, isLatest,
      submittedAt, zipFileUrl, gradingStatus, reviewStatus,
      totalScore, finalScore, instructorFeedback, studentFeedback || null, reviewedBy,
      reviewedAt, gradedAt
    )
  }

  // ── Business Logic ──

  resubmit(zipFileUrl: string, content?: string): void {
    this.zipFileUrl = zipFileUrl
    this.submittedAt = new Date()
    this.attemptNumber = (this.attemptNumber || 1) + 1
    this.gradingStatus = 'Pending'
    this.reviewStatus = 'PendingReview'
    this.totalScore = null
    this.finalScore = null
    this.instructorFeedback = null
    this.studentFeedback = null
    this.reviewedBy = null
    this.reviewedAt = null
    this.gradedAt = null
    if (content !== undefined) {
      (this as any).content = content
    }
  }

  startGrading(): void {
    this.gradingStatus = 'Queued'
  }

  markGrading(): void {
    this.gradingStatus = 'Grading'
  }

  completeGrading(totalScore: number): void {
    this.gradingStatus = 'Graded'
    this.totalScore = totalScore
    this.gradedAt = new Date()
    this.addDomainEvent(new SubmissionGradedEvent(this.id, totalScore))
  }

  markGradingError(): void {
    this.gradingStatus = 'Error'
  }

  /**
   * Publish a grade to the student. Both callers (PublishGradeUseCase and
   * BulkPublishGradesUseCase) are "Công bố điểm", so this writes the same `PUBLISHED` the
   * grading engine writes. It used to write `Reviewed`, which no reader recognises: the
   * score reached the database and was then stripped back to null by SubmissionResponseDto
   * and excluded from every stats query, so publishing from mobile looked like it did
   * nothing at all.
   */
  review(reviewedBy: string, finalScore: number, feedback?: string): void {
    this.reviewStatus = 'PUBLISHED'
    this.reviewedBy = reviewedBy
    this.reviewedAt = new Date()
    this.finalScore = finalScore
    if (feedback !== undefined) this.instructorFeedback = feedback
    this.addDomainEvent(
      new SubmissionReviewedEvent(this.id, reviewedBy, finalScore)
    )
  }

  unpublish(): void {
    this.reviewStatus = 'DRAFT'
  }

  dispute(): void {
    this.reviewStatus = 'Disputed'
  }

  isGraded(): boolean {
    return this.gradingStatus === 'Graded'
  }

  isPendingReview(): boolean {
    return this.reviewStatus === 'PendingReview'
  }

  getEffectiveScore(): number | null {
    return this.finalScore ?? this.totalScore
  }
}
