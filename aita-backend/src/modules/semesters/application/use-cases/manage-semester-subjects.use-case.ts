import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { ManageSemesterSubjectsRequestDto, SemesterSubjectTableResponseDto } from '../dtos/semester.dto.js'

export class ManageSemesterSubjectsUseCase
    implements
    IUseCase<
        { semesterId: string } & ReturnType<typeof ManageSemesterSubjectsRequestDto.from>,
        ReturnType<typeof SemesterSubjectTableResponseDto.fromArray>
    > {
    constructor(private readonly semesterRepo: ISemesterRepository) { }

    async execute(request: { semesterId: string } & ReturnType<typeof ManageSemesterSubjectsRequestDto.from>) {
        const { semesterId, data } = request
        const { addSubjectIds, removeSubjectIds } = data

        // Verify semester exists
        const semester = await this.semesterRepo.findById(semesterId)
        if (!semester) {
            throw new Error(`Kỳ học với ID ${semesterId} không tồn tại`)
        }

        // Manage subjects
        const result = await this.semesterRepo.manageSemesterSubjects(semesterId, addSubjectIds, removeSubjectIds)

        return SemesterSubjectTableResponseDto.fromArray(result)
    }
}

