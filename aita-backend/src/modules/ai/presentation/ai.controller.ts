import type { Request, Response } from 'express'
import { z } from 'zod'
import { GenerateExerciseUseCase } from '../application/use-cases/generate-exercise.use-case.js'
import { SaveAiAssignmentUseCase } from '../application/use-cases/save-ai-assignment.use-case.js'
import { AssessSubmissionUseCase } from '../application/use-cases/assess-submission.use-case.js'
import { GetLearningFeedbackUseCase } from '../application/use-cases/get-learning-feedback.use-case.js'
import { GetAiConfigUseCase, UpdateAiConfigUseCase } from '../application/use-cases/ai-config.use-case.js'
import { GenerateRubricUseCase } from '../application/use-cases/generate-rubric.use-case.js'
import { GeneratePromptUseCase } from '../application/use-cases/generate-prompt.use-case.js'
import { RefinePromptUseCase } from '../application/use-cases/refine-prompt.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'
import { ForbiddenError } from '../../../shared/application/app.error.js'
import { MESSAGES } from '../../../shared/constants/messages.js'

import { RagTutorChatUseCase } from '../application/use-cases/rag-tutor-chat.use-case.js'
import { RagCodeDiagnosticsUseCase } from '../application/use-cases/rag-code-diagnostics.use-case.js'
import { AutoConfigureAssignmentUseCase } from '../application/use-cases/auto-configure-assignment.use-case.js'
import { SearchSimilarRubricsUseCase } from '../application/use-cases/search-similar-rubrics.use-case.js'
import { GetRubricDetailUseCase } from '../application/use-cases/get-rubric-detail.use-case.js'
import { ApproveRubricUseCase } from '../application/use-cases/approve-rubric.use-case.js'
import { UpdateRubricUseCase } from '../application/use-cases/update-rubric.use-case.js'
import { PgVectorRubricService } from '../infrastructure/rag/pgvector-rubric.service.js'
import { prisma } from '../../../database/prisma.js'
import { assertAssignmentAccess, assertClassAccess } from '../../grading/engine/assignment/assignment-access.js'
import { assertAiSubmissionAccess } from '../application/ai-access.js'

export class AiController {
    constructor(
        private readonly generateExerciseUseCase: GenerateExerciseUseCase,
        private readonly saveAssignmentUseCase: SaveAiAssignmentUseCase,
        private readonly assessSubmissionUseCase: AssessSubmissionUseCase,
        private readonly getLearningFeedbackUseCase: GetLearningFeedbackUseCase,
        private readonly getConfigUseCase: GetAiConfigUseCase,
        private readonly updateConfigUseCase: UpdateAiConfigUseCase,
        private readonly generateRubricUseCase: GenerateRubricUseCase,
        private readonly generatePromptUseCase: GeneratePromptUseCase,
        private readonly refinePromptUseCase: RefinePromptUseCase,
        private readonly ragTutorChatUseCase: RagTutorChatUseCase = new RagTutorChatUseCase(),
        private readonly ragCodeDiagnosticsUseCase: RagCodeDiagnosticsUseCase = new RagCodeDiagnosticsUseCase(),
        private readonly autoConfigureAssignmentUseCase: AutoConfigureAssignmentUseCase = new AutoConfigureAssignmentUseCase(),
        private readonly searchSimilarRubricsUseCase: SearchSimilarRubricsUseCase = new SearchSimilarRubricsUseCase(new PgVectorRubricService()),
        private readonly getRubricDetailUseCase: GetRubricDetailUseCase = new GetRubricDetailUseCase(),
        private readonly approveRubricUseCase: ApproveRubricUseCase = new ApproveRubricUseCase(),
        private readonly updateRubricUseCase: UpdateRubricUseCase = new UpdateRubricUseCase(new PgVectorRubricService())
    ) { }

    async autoConfigureAssignment(req: Request, res: Response): Promise<void> {
        if (req.body.classId && req.body.classId !== 'all') await assertClassAccess([req.body.classId], req.user!)
        const promptText = req.body.promptText || req.body.description || ''
        const title = req.body.title || ''
        const classId = req.body.classId
        let subjectCode = req.body.subjectCode
        let subjectName = req.body.subjectName
        const preferredLanguage = req.body.preferredLanguage
        const preferredCategory = req.body.category
        const maxScore = req.body.maxScore ? Number(req.body.maxScore) : 10

        // Tự động tìm thông tin môn học của lớp học nếu có classId
        if (classId && (!subjectCode || !subjectName)) {
            try {
                const cls = await prisma.class.findUnique({
                    where: { Id: classId },
                    include: { Subject: true }
                });
                if (cls?.Subject) {
                    subjectCode = subjectCode || cls.Subject.SubjectCode || undefined;
                    subjectName = subjectName || cls.Subject.SubjectName || undefined;
                }
            } catch (e) {
                console.warn('[AiController] Could not fetch class subject info:', e);
            }
        }

        const fileData = req.file ? {
            filename: req.file.originalname,
            buffer: req.file.buffer,
            mimetype: req.file.mimetype
        } : undefined;

        const result = await this.autoConfigureAssignmentUseCase.execute({
            promptText,
            title,
            file: fileData,
            classId,
            subjectCode,
            subjectName,
            preferredLanguage,
            preferredCategory,
            maxScore,
            userId: req.user?.id
        });

        res.status(200).json(ApiResponse.success('AI đã tự động phân tích và cấu hình bài tập thành công!', result));
    }

    async generateExercise(req: Request, res: Response): Promise<void> {
        if (req.body.classId && req.body.classId !== 'all') await assertClassAccess([req.body.classId], req.user!)
        const input = z.object({
            classId: z.string().optional(),
            type: z.enum(['quiz', 'coding', 'group']),
            topic: z.string().min(1),
            difficulty: z.string().optional(),
            questionCount: z.coerce.number().optional(),
            language: z.string().optional(),
            extra: z.string().optional(),
        }).parse(req.body)

        const result = await this.generateExerciseUseCase.execute(input)
        res.status(200).json(ApiResponse.success(MESSAGES.AI_GENERATE_SUCCESS, { result, assignment: null }))
    }

    async generateRubric(req: Request, res: Response): Promise<void> {
        const input = z.object({
            topic: z.string().min(1),
            difficulty: z.string().optional(),
            totalScore: z.coerce.number().optional(),
        }).parse(req.body)

        const fileData = req.file ? {
            filename: req.file.originalname,
            buffer: req.file.buffer,
            mimetype: req.file.mimetype
        } : undefined;

        const result = await this.generateRubricUseCase.execute({ ...input, file: fileData })
        res.status(200).json(ApiResponse.success('Generated rubric successfully', result))
    }

    async saveAssignmentFromAI(req: Request, res: Response): Promise<void> {
        const body = z.object({
            classId: z.string().optional(),
            subjectId: z.string().optional(),
            title: z.string().min(2),
            description: z.string().optional(),
            type: z.string().optional(),
            examType: z.string().optional(),
            difficulty: z.string().optional(),
            content: z.unknown().optional(),
            publish: z.boolean().optional(),
        }).passthrough().parse(req.body)

        const result = await this.saveAssignmentUseCase.execute({ dto: body, creatorId: req.user!.id, user: req.user! })
        res.status(201).json(ApiResponse.success(MESSAGES.AI_SAVE_SUCCESS, result, 201))
    }

    async assessSubmission(req: Request, res: Response): Promise<void> {
        const submissionId = String(req.params.submissionId)
        const result = await this.assessSubmissionUseCase.execute(submissionId, req.user!)
        res.status(202).json(ApiResponse.success('Đã đưa bài nộp vào hàng đợi chấm', result, 202))
    }

    async learningFeedback(req: Request, res: Response): Promise<void> {
        const studentId = String(req.params.studentId)
        if (req.user!.role.toUpperCase() !== 'ADMIN' && req.user!.id !== studentId) {
            const allowed = req.user!.role.toUpperCase() === 'LECTURER' && await prisma.studentClass.findFirst({ where: { UserId: studentId, Class: { InstructorClass: { some: { UserId: req.user!.id } } } } })
            if (!allowed) throw new ForbiddenError(MESSAGES.FORBIDDEN)
        }
        const result = await this.getLearningFeedbackUseCase.execute(studentId)
        res.status(200).json(ApiResponse.success(MESSAGES.AI_FEEDBACK_SUCCESS, result))
    }

    async getConfig(_req: Request, res: Response): Promise<void> {
        const result = await this.getConfigUseCase.execute()
        res.status(200).json(ApiResponse.success(MESSAGES.AI_CONFIG_GET_SUCCESS, result))
    }

    async updateConfig(req: Request, res: Response): Promise<void> {
        const result = await this.updateConfigUseCase.execute(req.body)
        res.status(200).json(ApiResponse.success(MESSAGES.AI_CONFIG_UPDATE_SUCCESS, result))
    }

    async generatePrompt(req: Request, res: Response): Promise<void> {
        const input = z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            category: z.string().optional(),
            subjectCode: z.string().optional(),
            draftContent: z.string().optional(),
            questionCount: z.coerce.number().optional(),
            difficulty: z.string().optional(),
            topic: z.string().optional(),
            language: z.string().optional(),
            additionalNotes: z.string().optional()
        }).parse(req.body)

        const userId = req.user?.id
        const result = await this.generatePromptUseCase.execute({ ...input, userId })
        res.status(200).json(ApiResponse.success('Generated prompt template successfully', result))
    }

    async refinePrompt(req: Request, res: Response): Promise<void> {
        const input = z.object({
            content: z.string().min(1)
        }).parse(req.body)

        const userId = req.user?.id
        const result = await this.refinePromptUseCase.execute({ ...input, userId })
        res.status(200).json(ApiResponse.success('Refined prompt template successfully', result))
    }

    async ragChat(req: Request, res: Response): Promise<void> {
        const schema = z.object({
            query: z.string().min(1),
            examId: z.string().optional(),
            subjectCode: z.string().optional(),
            submissionId: z.string().optional(),
            conversationHistory: z.array(z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string()
            })).optional()
        })
        const input = schema.parse(req.body)
        const userRole = (req.user?.role || 'STUDENT').toUpperCase() as 'STUDENT' | 'LECTURER' | 'ADMIN'
        if (input.examId) await assertAssignmentAccess(input.examId, req.user!)
        if (input.submissionId) await assertAiSubmissionAccess(input.submissionId, req.user!)

        const result = await this.ragTutorChatUseCase.execute({
            query: input.query,
            role: userRole,
            userId: req.user?.id,
            examId: input.examId,
            subjectCode: input.subjectCode,
            submissionId: input.submissionId,
            conversationHistory: input.conversationHistory
        })

        res.status(200).json(ApiResponse.success('RAG AI Tutor response generated successfully', result))
    }

    async ragDiagnose(req: Request, res: Response): Promise<void> {
        const schema = z.object({
            submissionId: z.string().min(1),
            ruleScoreId: z.string().optional(),
            testcaseName: z.string().optional(),
            errorMessage: z.string().optional(),
            userQuery: z.string().optional()
        })
        const input = schema.parse(req.body)
        await assertAiSubmissionAccess(input.submissionId, req.user!)
        const result = await this.ragCodeDiagnosticsUseCase.execute({ ...input, userRole: req.user!.role.toUpperCase() })
        res.status(200).json(ApiResponse.success('RAG diagnostic generated successfully', result))
    }

    async ragAssess(req: Request, res: Response): Promise<void> {
        const submissionId = String(req.params.submissionId)
        const result = await this.assessSubmissionUseCase.execute(submissionId, req.user!)
        res.status(202).json(ApiResponse.success('Đã đưa bài nộp vào hàng đợi chấm', result, 202))
    }

    // ── RAG Rubric Management & Semantic Retrieval ──
    async searchSimilarRubrics(req: Request, res: Response): Promise<void> {
        const query = String(req.query.query || req.query.q || '')
        const subjectCode = req.query.subjectCode ? String(req.query.subjectCode) : undefined
        const language = req.query.language ? String(req.query.language) : undefined
        const category = req.query.category ? String(req.query.category) : undefined
        const topK = req.query.topK ? Number(req.query.topK) : 5

        const result = await this.searchSimilarRubricsUseCase.execute({
            query,
            subjectCode,
            language,
            category,
            topK,
            requestingUserId: req.user?.id,
            requestingUserRole: req.user?.role,
        })
        res.status(200).json(ApiResponse.success('Tìm kiếm rubric tương đồng bằng pgvector thành công', result))
    }

    async getRubricDetail(req: Request, res: Response): Promise<void> {
        const rubricId = String(req.params.id)
        const result = await this.getRubricDetailUseCase.execute({
            rubricId,
            userId: req.user!.id,
            userRole: req.user!.role || 'LECTURER',
        })
        res.status(200).json(ApiResponse.success('Lấy chi tiết rubric thành công', result))
    }

    async approveRubric(req: Request, res: Response): Promise<void> {
        const rubricId = String(req.params.id)
        const result = await this.approveRubricUseCase.execute({
            rubricId,
            userId: req.user!.id,
            userRole: req.user!.role || 'LECTURER',
        })
        res.status(200).json(ApiResponse.success('Phê duyệt rubric thành công', result))
    }

    async updateRubric(req: Request, res: Response): Promise<void> {
        const rubricId = String(req.params.id)
        const result = await this.updateRubricUseCase.execute({
            rubricId,
            userId: req.user!.id,
            userRole: req.user!.role || 'LECTURER',
            title: req.body.title,
            description: req.body.description,
            totalPoints: req.body.totalPoints ? Number(req.body.totalPoints) : undefined,
            criteria: req.body.criteria,
        })
        res.status(200).json(ApiResponse.success('Cập nhật rubric thành công', result))
    }
}
