import type { Prisma } from '@prisma/client'

export async function permanentlyDeleteAssignments(db: any, cache: any, ids: string[]) {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const id of [...new Set(ids)]) {
            const exam = await tx.exam.findUnique({ where: { Id: id }, select: { IsDeleted: true, Status: true, DeletedAt: true } });
            const published = await tx.publishedAssignment.findUnique({ where: { Id: id }, select: { IsDeleted: true } });
            if (!exam && !published) continue; // Idempotent retry after a completed delete.
            if ((exam && !exam.IsDeleted && exam.Status !== 'Deleted' && !exam.DeletedAt) || (published && !published.IsDeleted)) {
                throw Object.assign(new Error('Chỉ có thể xóa vĩnh viễn bài tập trong thùng rác.'), { statusCode: 409 });
            }
            if (exam) {
                const submission = { Submission: { ExamId: id } };
                const rubricRule = { RubricRule: { ExamSection: { ExamId: id } } };
                const ruleScore = { OR: [{ ExecutionResult: submission }, rubricRule] };
                await tx.criterionScore.deleteMany({ where: { OR: [{ RuleScore: ruleScore }, { RubricCriterion: rubricRule }] } });
                await tx.evidence.deleteMany({ where: { RuleScore: ruleScore } });
                await tx.ruleScore.deleteMany({ where: ruleScore });
                await tx.executionResult.deleteMany({ where: submission });
                const session = { GradingSession: submission };
                await tx.buildArtifact.deleteMany({ where: session });
                await tx.sandboxExecution.deleteMany({ where: session });
                await tx.gradingJob.deleteMany({ where: session });
                await tx.gradingSession.deleteMany({ where: submission });
                await tx.appeal.deleteMany({ where: submission });
                await tx.submissionArtifact.deleteMany({ where: submission });
                await tx.aiUsageLog.deleteMany({ where: { OR: [{ ExamId: id }, submission] } });
                await tx.submission.deleteMany({ where: { ExamId: id } });
                const section = { ExamSection: { ExamId: id } };
                await tx.rubricCriterion.deleteMany({ where: { RubricRule: section } });
                await tx.rubricRule.deleteMany({ where: section });
                await tx.examSection.deleteMany({ where: { ExamId: id } });
                await tx.submissionOverride.deleteMany({ where: { ExamId: id } });
                await tx.examAttachment.deleteMany({ where: { ExamId: id } });
                await tx.examClass.deleteMany({ where: { ExamId: id } });
                await tx.examGenerationHistory.deleteMany({ where: { ExamId: id } });
                await tx.testCase.deleteMany({ where: { ExamId: id } });
                await tx.sampleCode.deleteMany({ where: { ExamId: id } });
                await tx.referenceArtifact.deleteMany({ where: { ExamId: id } });
                // Reusable rubric library records survive; remove their assignment association.
                await tx.rubric.updateMany({ where: { ExamId: id }, data: { ExamId: null } });
                await tx.exam.delete({ where: { Id: id } });
            }
            await tx.publishedAssignment.deleteMany({ where: { Id: id } });
        }
    }, { timeout: 60000 });
    for (const prefix of ['exams_list_', 'exam_detail_', 'subs_list_', 'subs_recent_', 'sub_detail_', 'student_dash_', 'classes_', 'class_detail_']) cache.invalidatePrefix(prefix);
}
