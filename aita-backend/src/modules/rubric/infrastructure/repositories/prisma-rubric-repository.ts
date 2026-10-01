import { IRubricRepository } from '../../domain/repositories/rubric-repository.interface.js'
import { RubricRule } from '../../domain/entities/rubric-rule.entity.js'
import { RubricCriterion } from '../../domain/entities/rubric-criterion.entity.js'

export class PrismaRubricRepository implements IRubricRepository {
    constructor(private readonly prisma: any) { }

    async listRules(): Promise<RubricRule[]> {
        const list = await (this.prisma as any).rubricRule.findMany()
        return list.map((l: any) => (RubricRule as any).restore(l))
    }

    async getRule(id: string): Promise<RubricRule | null> {
        const r = await (this.prisma as any).rubricRule.findUnique({ where: { Id: id } })
        if (!r) return null
        return (RubricRule as any).restore(r)
    }

    async saveRule(rule: RubricRule): Promise<void> {
        await (this.prisma as any).rubricRule.upsert({
            where: { Id: rule.id },
            create: { /* mapping */ },
            update: { /* mapping */ }
        })
    }

    async listCriteria(ruleId: string): Promise<RubricCriterion[]> {
        const list = await (this.prisma as any).rubricCriterion.findMany({ where: { RubricRuleId: ruleId } })
        return list.map((l: any) => RubricCriterion.restore(
            l.Id, l.RubricRuleId, l.Description, l.MaxPoints, l.Weight, l.ValidationType, l.ValidationConfig, l.IsCritical, l.SortOrder
        ))
    }

    async saveCriterion(c: RubricCriterion): Promise<void> {
        await (this.prisma as any).rubricCriterion.upsert({
            where: { Id: c.id },
            create: {
                Id: c.id,
                RubricRuleId: c.rubricRuleId,
                Description: c.description,
                MaxPoints: c.maxPoints,
                Weight: c.weight,
                ValidationType: c.validationType,
                ValidationConfig: c.validationConfig,
                IsCritical: c.isCritical,
                SortOrder: c.sortOrder
            },
            update: {
                Description: c.description,
                MaxPoints: c.maxPoints,
                Weight: c.weight,
                ValidationType: c.validationType,
                ValidationConfig: c.validationConfig,
                IsCritical: c.isCritical,
                SortOrder: c.sortOrder
            }
        })
    }

    async deleteCriterion(id: string): Promise<void> {
        await (this.prisma as any).rubricCriterion.delete({ where: { Id: id } })
    }

    async saveExamRubric(examId: string, rule: Partial<RubricRule>, criteria: Partial<RubricCriterion>[]): Promise<void> {
        const p = this.prisma as any;
        await p.$transaction(async (tx: any) => {
            // 1. Find or create default ExamSection for this exam
            let section = await tx.examSection.findFirst({ where: { ExamId: examId } });
            if (!section) {
                section = await tx.examSection.create({
                    data: {
                        ExamId: examId,
                        Title: 'Default Section'
                    }
                });
            }

            // 2. Find or create RubricRule for this Section
            let rubricRule = await tx.rubricRule.findFirst({ where: { SectionId: section.Id } });
            if (!rubricRule) {
                rubricRule = await tx.rubricRule.create({
                    data: {
                        SectionId: section.Id,
                        Description: rule.description || 'Auto-generated rubric rule',
                        MaxPoints: rule.maxPoints || 10,
                        ReferenceAnswer: rule.referenceAnswer || null,
                    }
                });
            } else {
                rubricRule = await tx.rubricRule.update({
                    where: { Id: rubricRule.Id },
                    data: {
                        Description: rule.description !== undefined ? rule.description : rubricRule.Description,
                        MaxPoints: rule.maxPoints !== undefined ? rule.maxPoints : rubricRule.MaxPoints,
                        ReferenceAnswer: rule.referenceAnswer !== undefined ? rule.referenceAnswer : rubricRule.ReferenceAnswer,
                    }
                });
            }

            // 3. Delete old criteria and insert new ones
            await tx.rubricCriterion.deleteMany({ where: { RubricRuleId: rubricRule.Id } });
            if (criteria && criteria.length > 0) {
                await tx.rubricCriterion.createMany({
                    data: criteria.map((c, i) => ({
                        RubricRuleId: rubricRule.Id,
                        Description: c.description,
                        MaxPoints: c.maxPoints,
                        SortOrder: i
                    }))
                });
            }

            // 4. Synchronize with PublishedAssignment in Grading Engine
            try {
                const examRecord = await tx.exam.findUnique({ where: { Id: examId } });
                const title = examRecord?.Title || 'Assignment';
                const formattedRules = (criteria && criteria.length > 0)
                    ? criteria.map((c: any, i: number) => ({
                        id: `r_${i + 1}`,
                        criteria: c.description || c.name || `Tiêu chí ${i + 1}`,
                        title: c.name || c.description || `Tiêu chí ${i + 1}`,
                        description: c.description || c.name || '',
                        weight: Number(c.maxPoints ?? 0),
                        maxPoints: Number(c.maxPoints ?? 0),
                        scoringStrategy: c.scoringStrategy || 'AICodeReview'
                    }))
                    : [];

                const existingPub = await tx.publishedAssignment.findUnique({ where: { Id: examId } });
                let dataObj: any = {};
                if (existingPub && existingPub.Data) {
                    try { dataObj = JSON.parse(existingPub.Data); } catch (e) { dataObj = {}; }
                } else {
                    dataObj = {
                        id: examId,
                        version: '1',
                        blueprintId: '',
                        metadata: {
                            title,
                            description: examRecord?.Description || '',
                            dueDate: examRecord?.DueDate ? examRecord.DueDate.toISOString() : null,
                        }
                    };
                }

                dataObj.rubric = {
                    ...(dataObj.rubric || {}),
                    rules: formattedRules,
                    totalWeight: rule.maxPoints || 10,
                    passThreshold: dataObj.rubric?.passThreshold ?? 0.7
                };
                const dataStr = JSON.stringify(dataObj);

                await tx.publishedAssignment.upsert({
                    where: { Id: examId },
                    update: {
                        Title: title,
                        Data: dataStr
                    },
                    create: {
                        Id: examId,
                        Version: '1',
                        Title: title,
                        Data: dataStr
                    }
                });
            } catch (syncErr) {
                console.warn('[PrismaRubricRepository] Failed to sync PublishedAssignment:', syncErr);
            }
        });
    }
}
