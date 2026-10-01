import { RubricCriterion } from '../entities/rubric-criterion.entity.js'
import { RubricRule } from '../entities/rubric-rule.entity.js'

export interface IRubricRepository {
    listRules(): Promise<RubricRule[]>
    getRule(id: string): Promise<RubricRule | null>
    saveRule(rule: RubricRule): Promise<void>

    listCriteria(ruleId: string): Promise<RubricCriterion[]>
    saveCriterion(criterion: RubricCriterion): Promise<void>
    deleteCriterion(id: string): Promise<void>

    saveExamRubric(examId: string, rule: Partial<RubricRule>, criteria: Partial<RubricCriterion>[]): Promise<void>
}
