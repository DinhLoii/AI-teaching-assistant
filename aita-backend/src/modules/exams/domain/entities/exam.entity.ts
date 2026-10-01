import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type ExamTypeValue = 'Midterm' | 'Final' | 'Practice' | 'Assignment'
export type ExamStatusValue = 'Draft' | 'Published' | 'Closed' | 'Archived'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class ExamCreatedEvent extends DomainEvent {
  constructor(
    public readonly examId: string,
    public readonly title: string | null,
    public readonly createdBy: string | null
  ) {
    super('ExamCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      examId: this.examId,
      title: this.title,
      createdBy: this.createdBy,
      occurredAt: this.occurredAt,
    }
  }
}

export class ExamPublishedEvent extends DomainEvent {
  constructor(
    public readonly examId: string,
    public readonly title: string | null
  ) {
    super('ExamPublishedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      examId: this.examId,
      title: this.title,
      occurredAt: this.occurredAt,
    }
  }
}

export class ExamClosedEvent extends DomainEvent {
  constructor(public readonly examId: string) {
    super('ExamClosedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      examId: this.examId,
      occurredAt: this.occurredAt,
    }
  }
}

export class ExamArchivedEvent extends DomainEvent {
  constructor(public readonly examId: string) {
    super('ExamArchivedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      examId: this.examId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: Exam
// ──────────────────────────────────────────────────────────────

export class Exam extends AggregateRoot {
  id: string
  title: string | null
  description: string | null
  assignmentTemplateId: string | null
  projectTypeId: string | null
  gradingProfileId: string | null
  subjectId: string | null
  examType: ExamTypeValue | null
  duration: number | null
  totalPoints: number | null
  weightPercentage: number | null
  status: ExamStatusValue | null
  submissionFormat: string | null
  aiGeneratedContent: string | null
  originalPrompt: string | null
  promptTemplateId: string | null
  createdBy: string | null
  dueDate: Date | null

  private constructor(
    id: string,
    title: string | null,
    description: string | null,
    assignmentTemplateId: string | null,
    projectTypeId: string | null,
    gradingProfileId: string | null,
    subjectId: string | null,
    examType: ExamTypeValue | null,
    duration: number | null,
    totalPoints: number | null,
    weightPercentage: number | null,
    status: ExamStatusValue | null,
    submissionFormat: string | null,
    aiGeneratedContent: string | null,
    originalPrompt: string | null,
    promptTemplateId: string | null,
    createdBy: string | null,
    dueDate: Date | null = null
  ) {
    super()
    this.id = id
    this.title = title
    this.description = description
    this.assignmentTemplateId = assignmentTemplateId
    this.projectTypeId = projectTypeId
    this.gradingProfileId = gradingProfileId
    this.subjectId = subjectId
    this.examType = examType
    this.duration = duration
    this.totalPoints = totalPoints
    this.weightPercentage = weightPercentage
    this.status = status
    this.submissionFormat = submissionFormat
    this.aiGeneratedContent = aiGeneratedContent
    this.originalPrompt = originalPrompt
    this.promptTemplateId = promptTemplateId
    this.createdBy = createdBy
    this.dueDate = dueDate
  }

  // ── Factory Methods ──

  static create(
    id: string,
    title: string,
    subjectId: string,
    examType: ExamTypeValue,
    createdBy: string,
    params?: {
      description?: string
      duration?: number
      totalPoints?: number
      weightPercentage?: number
      projectTypeId?: string
      gradingProfileId?: string
      assignmentTemplateId?: string
      submissionFormat?: string
      dueDate?: Date
    }
  ): Exam {
    const exam = new Exam(
      id,
      title,
      params?.description ?? null,
      params?.assignmentTemplateId ?? null,
      params?.projectTypeId ?? null,
      params?.gradingProfileId ?? null,
      subjectId,
      examType,
      params?.duration ?? null,
      params?.totalPoints ?? null,
      params?.weightPercentage ?? null,
      'Draft',
      params?.submissionFormat ?? null,
      null,   // aiGeneratedContent
      null,   // originalPrompt
      null,   // promptTemplateId
      createdBy,
      params?.dueDate ?? null
    )
    exam.addDomainEvent(new ExamCreatedEvent(exam.id, exam.title, exam.createdBy))
    return exam
  }

  static restore(
    id: string,
    title: string | null,
    description: string | null,
    assignmentTemplateId: string | null,
    projectTypeId: string | null,
    gradingProfileId: string | null,
    subjectId: string | null,
    examType: ExamTypeValue | null,
    duration: number | null,
    totalPoints: number | null,
    weightPercentage: number | null,
    status: ExamStatusValue | null,
    submissionFormat: string | null,
    aiGeneratedContent: string | null,
    originalPrompt: string | null,
    promptTemplateId: string | null,
    createdBy: string | null,
    dueDate: Date | null = null
  ): Exam {
    return new Exam(
      id, title, description, assignmentTemplateId, projectTypeId,
      gradingProfileId, subjectId, examType, duration, totalPoints,
      weightPercentage, status, submissionFormat, aiGeneratedContent,
      originalPrompt, promptTemplateId, createdBy, dueDate
    )
  }

  // ── Business Logic ──

  isDraft(): boolean {
    return this.status === 'Draft'
  }

  isPublished(): boolean {
    return this.status === 'Published'
  }

  isClosed(): boolean {
    return this.status === 'Closed'
  }

  publish(): void {
    if (this.status !== 'Draft') {
      throw new Error('Only draft exams can be published')
    }
    this.status = 'Published'
    this.addDomainEvent(new ExamPublishedEvent(this.id, this.title))
  }

  close(): void {
    if (this.status !== 'Published') {
      throw new Error('Only published exams can be closed')
    }
    this.status = 'Closed'
    this.addDomainEvent(new ExamClosedEvent(this.id))
  }

  archive(): void {
    this.status = 'Archived'
    this.addDomainEvent(new ExamArchivedEvent(this.id))
  }

  updateInfo(params: {
    title?: string
    description?: string
    duration?: number
    totalPoints?: number
    submissionFormat?: string
  }): void {
    if (params.title !== undefined) this.title = params.title
    if (params.description !== undefined) this.description = params.description
    if (params.duration !== undefined) this.duration = params.duration
    if (params.totalPoints !== undefined) this.totalPoints = params.totalPoints
    if (params.submissionFormat !== undefined) this.submissionFormat = params.submissionFormat
  }

  setAiGeneratedContent(content: string, originalPrompt: string): void {
    this.aiGeneratedContent = content
    this.originalPrompt = originalPrompt
  }
}
