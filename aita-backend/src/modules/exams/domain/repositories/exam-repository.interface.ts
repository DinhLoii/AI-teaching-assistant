import type { Exam, ExamStatusValue, ExamTypeValue } from '../entities/exam.entity.js'

export interface ExamFilter {
  subjectId?: string
  classId?: string
  status?: ExamStatusValue
  examType?: ExamTypeValue
  instructorId?: string
  classIds?: string[]
  lecturerScope?: { userId: string; subjectIds: string[] }
  studentScope?: { classIds: string[]; subjectIds: string[] }
}

export interface IExamRepository {
  findMany(filter?: ExamFilter, options?: { skip?: number; take?: number; summary?: boolean }): Promise<Exam[]>
  findById(id: string, options?: { summary?: boolean }): Promise<Exam | null>
  create(exam: Exam): Promise<void>
  update(exam: Exam): Promise<void>
  save(exam: Exam): Promise<void>
  assignToClass(examId: string, classId: string, dueDate?: string): Promise<void>
  addAttachment(examId: string, attachment: { fileName: string, fileUrl: string, fileType: string }): Promise<void>
  getAttachment(attachmentId: string): Promise<{ fileUrl: string, fileName: string, examId?: string | null, fileType?: string | null } | null>
}
