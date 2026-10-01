import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface.js'
import { SubjectResponseDto } from '../dtos/subject.dto.js'

export class ListSubjectsUseCase implements IUseCase<void, ReturnType<typeof SubjectResponseDto.from>[]> {
  constructor(private readonly subjectRepo: ISubjectRepository) {}

  async execute() {
    const subjects = await this.subjectRepo.findMany()
    return subjects.map(s => SubjectResponseDto.from(s as any))
  }
}
