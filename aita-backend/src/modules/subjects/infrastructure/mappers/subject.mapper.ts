import { Subject } from '../../domain/entities/subject.entity.js'

export class SubjectMapper {
  static toDomain(raw: any): Subject & { _seasons?: string[] } {
    const subject = Subject.restore(
      raw.Id,
      raw.SubjectCode,
      raw.SubjectName,
      raw.Description,
      raw.IsActive,
      raw.Semester,
      raw.Credit,
      raw.SyllabusData
    ) as Subject & { _seasons?: string[] }

    // Attach seasons from SemesterSubject relation (not a domain concern, used only for API response)
    if (Array.isArray(raw.SemesterSubject)) {
      const uniqueSeasons = [...new Set(
        raw.SemesterSubject
          .map((ss: any) => {
            const season = ss.Semester?.Season
            const code = ss.Semester?.Code
            if (typeof season !== 'string' || !season) return null
            return code ? `${season} ${code}` : season
          })
          .filter((s: any): s is string => s !== null)
      )] as string[]
      subject._seasons = uniqueSeasons
    }

    return subject
  }

  static toPersistence(subject: Subject): any {
    return {
      Id: subject.id,
      SubjectCode: subject.subjectCode,
      SubjectName: subject.subjectName,
      Description: subject.description,
      IsActive: subject.isActive,
      Semester: subject.semester,
      Credit: subject.credit,
      SyllabusData: subject.syllabusData,
    }
  }
}
