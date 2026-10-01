import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISemesterRepository } from '../../domain/repositories/semester-repository.interface.js'
import { SemesterResponseDto } from '../dtos/semester.dto.js'

export class ListSemestersUseCase implements IUseCase<void, ReturnType<typeof SemesterResponseDto.from>[]> {
  constructor(private readonly semesterRepo: ISemesterRepository) {}

  async execute() {
    const semesters = await this.semesterRepo.findAll()
    return semesters.map(SemesterResponseDto.from)
  }
}
