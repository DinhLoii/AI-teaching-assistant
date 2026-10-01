import { z } from 'zod'


export const CreateClassRequestSchema = z.object({
  code: z.string().min(2, 'Mã lớp phải có ít nhất 2 ký tự'),
  name: z.string().optional(),
  subjectId: z.string().min(1, 'subjectId là bắt buộc'),
  semesterId: z.string().optional(),
  campus: z.string().optional(),
  schedule: z.string().optional(),
  lecturerId: z.string().optional(),
})

export type CreateClassRequestDtoType = z.infer<typeof CreateClassRequestSchema>

export class CreateClassRequestDto {
  constructor(public readonly data: CreateClassRequestDtoType) {}

  static from(body: unknown): CreateClassRequestDto {
    try {
      const data = CreateClassRequestSchema.parse(body)
      return new CreateClassRequestDto(data)
    } catch (error) {
      throw error // Let the global errorHandler catch ZodError
    }
  }
}

export const UpdateClassRequestSchema = CreateClassRequestSchema.partial().extend({
  code: z.string().min(2, 'Mã lớp phải có ít nhất 2 ký tự').optional(),
  name: z.string().optional(),
  keepExistingInstructors: z.boolean().optional(),
})

export type UpdateClassRequestDtoType = z.infer<typeof UpdateClassRequestSchema>

export class UpdateClassRequestDto {
  constructor(public readonly data: UpdateClassRequestDtoType) {}

  static from(body: unknown): UpdateClassRequestDto {
    try {
      const data = UpdateClassRequestSchema.parse(body)
      return new UpdateClassRequestDto(data)
    } catch (error) {
      throw error
    }
  }
}

export const UpdateClassNoteSchema = z.object({
  note: z.string().max(2000, 'Ghi chú tối đa 2000 ký tự'),
})

export type UpdateClassNoteDtoType = z.infer<typeof UpdateClassNoteSchema>

export class UpdateClassNoteDto {
  note!: string

  static from(body: unknown): UpdateClassNoteDto {
    const dto = new UpdateClassNoteDto()
    Object.assign(dto, UpdateClassNoteSchema.parse(body))
    return dto
  }
}

export const EnrollStudentSchema = z.object({
  studentId: z.string({ required_error: 'studentId là bắt buộc' }),
})

export type EnrollStudentRequestDtoType = z.infer<typeof EnrollStudentSchema>

export class EnrollStudentRequestDto {
  constructor(public readonly data: EnrollStudentRequestDtoType) {}

  static from(body: unknown): EnrollStudentRequestDto {
    return new EnrollStudentRequestDto(EnrollStudentSchema.parse(body))
  }
}

export class ClassResponseDto {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string | null,
    public readonly subject: any,
    public readonly semester: any,
    public readonly lecturers: any[],
    public readonly studentCount: number,
    // Internal note — only populated for ADMIN/LECTURER; omitted entirely for STUDENT.
    public readonly note?: string | null
  ) {}

  // Maps from a domain Class entity (camelCase) produced by ClassMapper.toDomain.
  static from(cls: any, includeNote = false): ClassResponseDto {
    const lecturers = Array.isArray(cls.instructors) && cls.instructors.length > 0
      ? cls.instructors
      : (Array.isArray(cls.lecturers) && cls.lecturers.length > 0
          ? cls.lecturers
          : (cls.instructorId ? [{ id: cls.instructorId, name: cls.instructorName ?? null, email: cls.instructorEmail ?? null, avatar: cls.instructorAvatar ?? null }] : []))

    return new ClassResponseDto(
      cls.id,
      cls.classCode,
      cls.subjectName ?? null,
      cls.subjectId ? { id: cls.subjectId, code: cls.subjectCode ?? null, name: cls.subjectName ?? null } : null,
      cls.semesterId ? { id: cls.semesterId, code: cls.semesterName ?? null, name: cls.semesterName ?? null, season: cls.semesterSeason ?? null } : null,
      lecturers,
      cls.studentCount ?? 0,
      includeNote ? (cls.note ?? null) : undefined
    )
  }
}
