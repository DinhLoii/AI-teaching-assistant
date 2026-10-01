import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { prisma } from '../../../../database/prisma.js'
import { SubjectResponseDto } from '../dtos/subject.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class GetSubjectByIdUseCase implements IUseCase<string, SubjectResponseDto> {
  constructor(private readonly logger: ILogger) {}

  async execute(id: string): Promise<SubjectResponseDto> {
    this.logger.debug(`Fetching subject by id: ${id}`)
    
    let subject = await prisma.subject.findUnique({
      where: { Id: id },
      include: {
        Class: {
          include: {
            Semester: true
          }
        }
      }
    })

    if (!subject) {
      subject = await prisma.subject.findUnique({
        where: { SubjectCode: id },
        include: {
          Class: {
            include: {
              Semester: true
            }
          }
        }
      })
    }

    if (!subject) {
      throw new NotFoundError('Không tìm thấy môn học')
    }

    const _seasons = Array.from(new Set(subject.Class.map((c: any) => c.Semester?.Code).filter(Boolean)))
    
    return SubjectResponseDto.from({ ...subject, _seasons })
  }
}
