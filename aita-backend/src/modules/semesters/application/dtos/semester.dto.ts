const validateDate = (dateStr: string) => {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) throw new Error('Ngày không hợp lệ')
  if (date.getFullYear() > 2100 || date.getFullYear() < 1900) throw new Error('Năm phải nằm trong khoảng 1900 - 2100')
  return date
}

export class CreateSemesterRequestDto {
  static from(body: any) {
    if (!body.code || typeof body.code !== 'string') {
      throw new Error('Mã kỳ học (code) là bắt buộc')
    }

    return {
      data: {
        code: body.code.trim(),
        season: body.season ? body.season.trim() : undefined,
        startDate: body.startDate ? validateDate(body.startDate) : undefined,
        endDate: body.endDate ? validateDate(body.endDate) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
      }
    }
  }
}

export class CreateSeasonRequestDto {
  static from(body: any) {
    if (!body.season || typeof body.season !== 'string') {
      throw new Error('Tên mùa học (season) là bắt buộc')
    }

    return {
      data: {
        season: body.season.trim(),
        startDate: body.startDate ? validateDate(body.startDate) : undefined,
        endDate: body.endDate ? validateDate(body.endDate) : undefined
      }
    }
  }
}

export class UpdateSemesterRequestDto {
  static from(body: any, id: string) {
    if (!id) {
      throw new Error('ID kỳ học là bắt buộc')
    }

    return {
      id,
      data: {
        code: body.code ? body.code.trim() : undefined,
        season: body.season !== undefined ? body.season?.trim() : undefined,
        startDate: body.startDate ? validateDate(body.startDate) : undefined,
        endDate: body.endDate ? validateDate(body.endDate) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined
      }
    }
  }
}

export class SemesterResponseDto {
  static from(semester: any) {
    return {
      id: semester.id,
      code: semester.code,
      season: semester.season,
      isActive: semester.isActive,
      startDate: semester.startDate?.toISOString() ?? null,
      endDate: semester.endDate?.toISOString() ?? null,
      classCount: (semester as any).classCount ?? 0,
      subjectCount: (semester as any).subjectCount ?? 0
    }
  }
}

export class ManageSemesterSubjectsRequestDto {
  static from(body: any) {
    const addIds = Array.isArray(body.addSubjectIds) ? body.addSubjectIds : []
    const removeIds = Array.isArray(body.removeSubjectIds) ? body.removeSubjectIds : []

    if (!Array.isArray(addIds)) throw new Error('addSubjectIds phải là mảng')
    if (!Array.isArray(removeIds)) throw new Error('removeSubjectIds phải là mảng')

    if (addIds.length === 0 && removeIds.length === 0) {
      throw new Error('Phải cung cấp ít nhất một môn để thêm hoặc xóa')
    }

    return {
      data: {
        addSubjectIds: addIds,
        removeSubjectIds: removeIds
      }
    }
  }
}

export class SemesterSubjectTableResponseDto {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly semester: number | null,
    public readonly assignedAt: Date,
    public readonly isActive: boolean
  ) { }

  static from(record: any): SemesterSubjectTableResponseDto {
    return new SemesterSubjectTableResponseDto(
      record.Subject?.Id || record.id,
      record.Subject?.SubjectCode || record.code,
      record.Subject?.SubjectName || record.name,
      record.Subject?.Description || record.description || null,
      record.Subject?.Semester || record.semester || null,
      record.AssignedAt || new Date(),
      record.Subject?.IsActive ?? true
    )
  }

  static fromArray(records: any[]): SemesterSubjectTableResponseDto[] {
    return records.map((r) => SemesterSubjectTableResponseDto.from(r))
  }
}
