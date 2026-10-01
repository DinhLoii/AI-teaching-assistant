import { z } from 'zod'

export const SubjectSchema = z.object({
  code: z.string().min(2, 'Mã môn học phải có ít nhất 2 ký tự'),
  name: z.string().min(2, 'Tên môn học phải có ít nhất 2 ký tự'),
  description: z.string().optional(),
  semester: z.number().int().min(1).max(9).optional(),
  credit: z.number().int().min(0).max(30).optional(),
  syllabusData: z.string().optional(),
})

export type SubjectRequestDtoType = z.infer<typeof SubjectSchema>

export class SubjectRequestDto {
  constructor(public readonly data: SubjectRequestDtoType) {}

  static from(body: unknown): SubjectRequestDto {
    return new SubjectRequestDto(SubjectSchema.parse(body))
  }
}


export class SubjectResponseDto {
  constructor(
    public readonly id: string,
    public readonly code: string | null,
    public readonly name: string | null,
    public readonly description: string | null,
    public readonly status: string,
    public readonly semester: number | null,
    public readonly credit?: number | null,
    public readonly syllabusData?: string | null,
    public readonly seasons?: string[]
  ) {}

  static from(subject: any): SubjectResponseDto {
    const isActive = subject.IsActive !== undefined ? subject.IsActive : subject.isActive;
    const status = isActive ? 'active' : 'inactive';

    return new SubjectResponseDto(
      subject.Id || subject.id,
      subject.SubjectCode || subject.subjectCode,
      subject.SubjectName || subject.subjectName,
      subject.Description || subject.description,
      status,
      subject.Semester !== undefined ? subject.Semester : (subject.semester ?? null),
      subject.Credit !== undefined ? subject.Credit : (subject.credit ?? null),
      subject.SyllabusData !== undefined ? subject.SyllabusData : (subject.syllabusData ?? null),
      Array.isArray(subject._seasons) ? subject._seasons : []
    )
  }
}
