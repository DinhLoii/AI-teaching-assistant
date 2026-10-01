import { Semester } from '../entities/semester.entity.js'

export interface ISemesterRepository {
  findById(id: string): Promise<Semester | null>
  findByCode(code: string): Promise<Semester | null>
  findByCodeAndSeason(code: string, season?: string): Promise<Semester | null>
  findBySeason(season: string): Promise<Semester[]>
  findAll(activeOnly?: boolean): Promise<Semester[]>
  create(semester: Semester): Promise<void>
  createSeason(season: string, startDate?: Date, endDate?: Date): Promise<Semester[]>
  update(semester: Semester): Promise<void>
  delete(id: string): Promise<void>
  deleteBySeason(season: string): Promise<void>
  getSubjects(semesterId: string): Promise<any[]>
  addSubjects(semesterId: string, subjectIds: string[]): Promise<void>
  removeSubject(semesterId: string, subjectId: string): Promise<void>
  getClassesBySubject(semesterId: string, subjectId: string): Promise<any[]>
  manageSemesterSubjects(semesterId: string, addIds: string[], removeIds: string[]): Promise<any[]>
  setActiveSeason(season: string): Promise<void>
  listSemesterSubjects(
    semesterId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<any[]>
}
