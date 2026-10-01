import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import { NotFoundError, UnauthorizedError } from '../../../../shared/application/app.error.js'

export class SubmitFeedbackUseCase implements IUseCase<{ id: string; user: { id: string; role: string }; feedback: string }, any> {
    constructor(private readonly prisma: any) {}

    async execute({ id, user, feedback }: { id: string; user: { id: string; role: string }; feedback: string }) {
        if (!feedback || feedback.trim() === '') {
            throw new Error('Feedback is required');
        }

        const submission = await this.prisma.submission.findUnique({
            where: { Id: id },
            include: {
                Exam: { include: { Subject: true } },
                Class: { include: { InstructorClass: true } }
            }
        });

        if (!submission) {
            throw new NotFoundError('Submission not found')
        }

        if (submission.StudentId !== user.id) {
            throw new UnauthorizedError('You are not authorized to provide feedback for this submission')
        }

        const updated = await this.prisma.submission.update({
            where: { Id: id },
            data: { StudentFeedback: feedback }
        });

        // Send Notification to Instructors (Class instructors + Exam creator)
        const recipientUserIds = new Set<string>();
        const instructors = submission.Class?.InstructorClass || [];
        for (const inst of instructors) {
            if (inst.UserId) recipientUserIds.add(inst.UserId);
        }
        if (submission.Exam?.CreatedBy) {
            recipientUserIds.add(submission.Exam.CreatedBy);
        }

        const examTitle = submission.Exam?.Title || 'Assignment';

        for (const targetUserId of recipientUserIds) {
            await this.prisma.notification.create({
                data: {
                    Title: 'Grade Inquiry / Student Feedback',
                    Message: `A student submitted feedback for "${examTitle}": ${feedback}`,
                    Type: 'FEEDBACK',
                    ReferenceId: submission.Id,
                    ReferenceType: 'Submission',
                    NotificationRecipient: {
                        create: {
                            UserId: targetUserId,
                            IsRead: false,
                        }
                    }
                }
            });
        }

        return { success: true, feedback: updated.StudentFeedback };
    }
}

