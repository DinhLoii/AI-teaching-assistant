import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface.js'
import { SubjectRequestDto, SubjectResponseDto } from '../dtos/subject.dto.js'
import { NotFoundError, ConflictError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class UpdateSubjectUseCase implements IUseCase<{ id: string; dto: SubjectRequestDto }, ReturnType<typeof SubjectResponseDto.from>> {
  constructor(private readonly subjectRepo: ISubjectRepository) {}

  async execute(params: { id: string; dto: SubjectRequestDto }) {
    const subject = await this.subjectRepo.findById(params.id)
    if (!subject) {
      throw new NotFoundError(MESSAGES.SUBJECT_NOT_FOUND)
    }

    const existingCode = await this.subjectRepo.findByCode(params.dto.data.code)
    if (existingCode && existingCode.id !== params.id) {
      throw new ConflictError(MESSAGES.SUBJECT_ALREADY_EXISTS)
    }

    subject.updateInfo({
      subjectCode: params.dto.data.code,
      subjectName: params.dto.data.name,
      description: params.dto.data.description,
      semester: params.dto.data.semester,
      credit: params.dto.data.credit,
      syllabusData: params.dto.data.syllabusData,
    })

    await this.subjectRepo.save(subject)
    
    return SubjectResponseDto.from(subject as any)
  }
}
