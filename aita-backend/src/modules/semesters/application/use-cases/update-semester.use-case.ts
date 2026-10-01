import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { SemesterResponseDto } from '../dtos/semester.dto.js'

export class UpdateSemesterUseCase implements IUseCase<any, any> {
  constructor(private readonly semesterRepo: ISemesterRepository) {}

  async execute(dto: any): Promise<any> {
    const existing = await this.semesterRepo.findById(dto.id)
    if (!existing) {
      throw new NotFoundError(MESSAGES.SEMESTER_NOT_FOUND || 'Không tìm thấy kỳ học')
    }

    if (dto.data.code !== undefined) existing.code = dto.data.code
    if (dto.data.startDate !== undefined) existing.startDate = dto.data.startDate
    if (dto.data.endDate !== undefined) existing.endDate = dto.data.endDate
    if (dto.data.isActive !== undefined) existing.isActive = dto.data.isActive
    if (dto.data.season !== undefined) existing.season = dto.data.season

    await this.semesterRepo.update(existing)

    return SemesterResponseDto.from(existing)
  }
}
