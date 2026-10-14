import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { randomUUID } from 'crypto'

export class SaveAiAssignmentUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute({ dto, creatorId }: { dto: any; creatorId: string }) {
        return await this.uow.runInTransaction(async (_tx) => {
            const client = this.uow.getClient();
            let subjectId = dto.subjectId;

            if (!subjectId && dto.classId && dto.classId !== 'all') {
                const cls = await client.class.findUnique({ where: { Id: dto.classId } });
                if (cls) subjectId = cls.SubjectId;
            }

            const examId = randomUUID();
            const examType = dto.examType === 'Exam' ? 'Exam' : 'Assignment';

            const createdExam = await client.exam.create({
                data: {
                    Id: examId,
                    Title: dto.title,
                    Description: dto.description || '',
                    SubjectId: subjectId || null,
                    ExamType: examType,
                    Status: dto.publish !== false ? 'Published' : 'Draft',
                    AiGeneratedContent: dto.content ? JSON.stringify(dto.content) : null,
                    TotalPoints: 10,
                    Duration: 14 * 24 * 60,
                    CreatedBy: creatorId,
                    DueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                }
            });

            if (dto.classId && dto.classId !== 'all') {
                await client.examClass.create({
                    data: {
                        ExamId: examId,
                        ClassId: dto.classId,
                        AssignedAt: new Date(),
                        DueDate: dto.dueDate ? new Date(dto.dueDate) : null
                    }
                }).catch(() => {});
            }

            // ── Link or create Rubric record in Neon ──
            const rubricCriteria = dto.rubricCriteria || dto.content?.rubricCriteria;
            if (Array.isArray(rubricCriteria) && rubricCriteria.length > 0) {
                const rubricStatus = dto.publish !== false ? 'APPROVED' : 'PENDING_REVIEW';
                await client.rubric.create({
                    data: {
                        Id: randomUUID(),
                        Title: `Rubric: ${dto.title}`,
                        Description: dto.description || '',
                        ExamId: examId,
                        SubjectCode: subjectId || null,
                        Status: rubricStatus,
                        SourceType: 'TEACHER_APPROVED',
                        TotalPoints: dto.maxScore ? Number(dto.maxScore) : 10,
                        CreatedBy: creatorId,
                        ApprovedBy: rubricStatus === 'APPROVED' ? creatorId : null,
                        ApprovedAt: rubricStatus === 'APPROVED' ? new Date() : null,
                        Criteria: {
                            create: rubricCriteria.map((c: any, idx: number) => ({
                                Id: randomUUID(),
                                Name: c.name || `Tiêu chí ${idx + 1}`,
                                Description: c.description || c.name || '',
                                MaxPoints: c.maxPoints !== undefined ? Number(c.maxPoints) : 2,
                                Weight: c.weight !== undefined ? Number(c.weight) : 1,
                                Method: c.method || 'ai_assessment',
                                PassCondition: c.passCondition || null,
                                FailCondition: c.failCondition || null,
                                SortOrder: idx + 1,
                            }))
                        }
                    }
                }).catch((e: any) => console.warn('[SaveAiAssignment] Non-blocking rubric sync note:', e));
            }

            return createdExam;
        })
    }
}
