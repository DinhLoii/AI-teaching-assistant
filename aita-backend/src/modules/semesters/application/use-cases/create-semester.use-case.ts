import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { ConflictError } from '../../../../shared/application/app.error.js'
import { CreateSemesterRequestDto, SemesterResponseDto } from '../dtos/semester.dto.js'
import { Semester } from '../../domain/entities/semester.entity.js'

export class CreateSemesterUseCase implements IUseCase<ReturnType<typeof CreateSemesterRequestDto.from>, ReturnType<typeof SemesterResponseDto.from>> {
  constructor(private readonly semesterRepo: ISemesterRepository) {}

  async execute(dto: ReturnType<typeof CreateSemesterRequestDto.from>) {
    const { data } = dto

    // Check composite uniqueness matching the DB constraint @@unique([Season, Code])
    const existing = await this.semesterRepo.findByCodeAndSeason(data.code, data.season)
    if (existing) {
      throw new ConflictError(
        data.season
          ? `Kỳ học "${data.code}" trong mùa "${data.season}" đã tồn tại`
          : `Kỳ học "${data.code}" đã tồn tại`
      )
    }

    const semester = Semester.create(
      randomUUID(),
      data.code,
      data.isActive,
      data.startDate,
      data.endDate,
      data.season
    )

    await this.semesterRepo.create(semester)

    const saved = await this.semesterRepo.findById(semester.id)
    return SemesterResponseDto.from(saved)
  }
}
