import { IRubricRepository } from '../../domain/repositories/rubric-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class ListRubricRulesUseCase {
    constructor(private readonly rubricRepo: IRubricRepository) { }

    async execute() {
        return await this.rubricRepo.listRules()
    }
}

export class GetRubricRuleWithCriteriaUseCase {
    constructor(private readonly rubricRepo: IRubricRepository) { }

    async execute(id: string) {
        const rule = await this.rubricRepo.getRule(id)
        if (!rule) throw new NotFoundError(MESSAGES.RUBRIC_NOT_FOUND)

        const criteria = await this.rubricRepo.listCriteria(id)
        return { ...rule, criteria }
    }
}
