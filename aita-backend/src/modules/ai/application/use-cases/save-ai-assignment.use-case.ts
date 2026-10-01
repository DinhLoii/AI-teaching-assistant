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

            return createdExam;
        })
    }
}
