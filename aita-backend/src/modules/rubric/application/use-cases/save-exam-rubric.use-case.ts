import { IRubricRepository } from '../../domain/repositories/rubric-repository.interface.js'
import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { RubricRule } from '../../domain/entities/rubric-rule.entity.js'
import { RubricCriterion } from '../../domain/entities/rubric-criterion.entity.js'

export interface SaveExamRubricInput {
    examId: string
    rule: Partial<RubricRule>
    criteria: Partial<RubricCriterion>[]
}

export class SaveExamRubricUseCase implements IUseCase<SaveExamRubricInput, void> {
    constructor(private readonly rubricRepo: IRubricRepository) { }

    async execute(input: SaveExamRubricInput): Promise<void> {
        await this.rubricRepo.saveExamRubric(input.examId, input.rule, input.criteria)
    }
}
