import type { Subject } from '../entities/subject.entity.js'

export interface SubjectFilter {
  isActive?: boolean
  search?: string
}

export interface ISubjectRepository {
  findMany(filter?: SubjectFilter): Promise<Subject[]>
  findById(id: string): Promise<Subject | null>
  findByCode(code: string): Promise<Subject | null>
  create(subject: Subject, semesterIds?: string[]): Promise<void>
  update(subject: Subject, semesterIds?: string[]): Promise<void>
  delete(id: string): Promise<void>
  save(subject: Subject): Promise<void>
  autoLinkSemestersByNumber(subjectId: string, semesterNumber: number): Promise<void>
  getSubjectStudents(
    subjectId: string,
    semesterId?: string,
    classId?: string,
    skip?: number,
    take?: number
  ): Promise<{ total: number, enrollments: any[] }>
}
