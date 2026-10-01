import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IClassRepository } from '../../domain/repositories/class-repository.interface.js'
import { TOKENS } from '../../../../shared/infrastructure/tokens.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'

export class GetClassCodesBySubjectUseCase implements IUseCase<string, string[]> {
  constructor(private readonly uow: IUnitOfWork) { }

  async execute(subjectId: string): Promise<string[]> {
    const classRepo = this.uow.resolve<IClassRepository>(TOKENS.ClassRepository)
    const classes = await classRepo.findMany({ subjectId })

    // Return unique, sorted class codes
    const codes = [...new Set(classes.map(c => (c as any).code))]
    return codes.sort()
  }
}
