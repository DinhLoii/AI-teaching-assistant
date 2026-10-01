import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { SemesterSubjectTableResponseDto } from '../dtos/semester.dto.js'

export interface PaginationOptions {
    page?: number
    pageSize?: number
}

export class ListSemesterSubjectsUseCase
    implements
    IUseCase<
        { semesterId: string; options?: PaginationOptions },
        {
            data: ReturnType<typeof SemesterSubjectTableResponseDto.fromArray>
            pagination: { page: number; pageSize: number; total: number; totalPages: number }
        }
    > {
    constructor(private readonly semesterRepo: ISemesterRepository) { }

    async execute(request: { semesterId: string; options?: PaginationOptions }) {
        const { semesterId, options } = request

        // Verify semester exists
        const semester = await this.semesterRepo.findById(semesterId)
        if (!semester) {
            throw new NotFoundError(`Kỳ học với ID ${semesterId} không tồn tại`)
        }

        // Get subjects for this semester with pagination
        const result = await this.semesterRepo.listSemesterSubjects(semesterId, options)

        const page = options?.page ?? 1
        const pageSize = options?.pageSize ?? 10

        // Safely extract items and total from result
        const items = Array.isArray(result) ? result : []
        const total = items.length
        const totalPages = Math.ceil(total / pageSize)

        return {
            data: SemesterSubjectTableResponseDto.fromArray(items),
            pagination: { page, pageSize, total, totalPages }
        }
    }
}
