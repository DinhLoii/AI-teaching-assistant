import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { CreateSeasonRequestDto, SemesterResponseDto } from '../dtos/semester.dto.js'

export class CreateSeasonUseCase implements IUseCase<ReturnType<typeof CreateSeasonRequestDto.from>, ReturnType<typeof SemesterResponseDto.from>[]> {
  constructor(private readonly semesterRepo: ISemesterRepository) { }

  async execute(dto: ReturnType<typeof CreateSeasonRequestDto.from>) {
    const { data } = dto

    const existing = await this.semesterRepo.findBySeason(data.season)
    if (existing && existing.length > 0) {
      throw new ConflictError('Mùa học này đã tồn tại')
    }

    // Delegate to repository which handles the $transaction internally
    const createdSemesters = await this.semesterRepo.createSeason(
      data.season,
      data.startDate,
      data.endDate
    )

    return createdSemesters.map(SemesterResponseDto.from)
  }
}
