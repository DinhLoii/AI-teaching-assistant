import { readSubmissionFile } from '../infrastructure/submission-storage.js'
import path from 'path'
import { readSubmissionArchive } from '../infrastructure/source-archive.js'
import { prisma } from '../../../database/prisma.js'
import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { ListSubmissionsUseCase } from '../application/use-cases/list-submissions.use-case.js'
import { CreateSubmissionUseCase } from '../application/use-cases/create-submission.use-case.js'
import { GetSubmissionUseCase } from '../application/use-cases/get-submission.use-case.js'
import { PublishGradeUseCase } from '../application/use-cases/publish-grade.use-case.js'
import { RecentSubmissionsUseCase } from '../application/use-cases/recent-submissions.use-case.js'
import { SubmitFeedbackUseCase } from '../application/use-cases/submit-feedback.use-case.js'
import { BulkPublishGradesUseCase } from '../application/use-cases/bulk-publish-grades.use-case.js'
import { GetAiHintUseCase } from '../application/use-cases/get-ai-hint.use-case.js'
import { ReopenSubmissionUseCase } from '../application/use-cases/reopen-submission.use-case.js'
import { DetectDuplicateSubmissionsUseCase } from '../application/use-cases/detect-duplicate-submissions.use-case.js'
import { ApplyDuplicatePenaltyUseCase } from '../application/use-cases/apply-duplicate-penalty.use-case.js'
import { CreateSubmissionRequestDto, ListSubmissionsQueryDto, ReopenSubmissionRequestDto } from '../application/dtos/submission.dto.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'

export class SubmissionsController extends BaseController {
    constructor(
        private readonly listUseCase: ListSubmissionsUseCase,
        private readonly recentUseCase: RecentSubmissionsUseCase,
        private readonly getOneUseCase: GetSubmissionUseCase,
        private readonly submitUseCase: CreateSubmissionUseCase,
        private readonly publishGradeUseCase: PublishGradeUseCase,
        private readonly submitFeedbackUseCase: SubmitFeedbackUseCase,
        private readonly bulkPublishGradesUseCase: BulkPublishGradesUseCase,
        private readonly getAiHintUseCase: GetAiHintUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async list(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received request to list submissions')
        const query = ListSubmissionsQueryDto.from(req.query)
        const cacheKey = `subs_list_${req.user!.id}_${req.user!.role}_${JSON.stringify(req.query)}`
        const load = () => this.listUseCase.execute({ user: req.user!, query })
        const result = /no-cache|no-store/i.test(req.get('Cache-Control') || '')
            ? await load() : await memoryCache.wrap(cacheKey, 12, load)
        this.ok(res, result, MESSAGES.SUBMISSION_LIST_SUCCESS)
    }

    async recent(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received request to get recent submissions')
        const limit = Math.min(Number(req.query.limit) || 5, 20)
        const cacheKey = `subs_recent_${req.user!.id}_${limit}`
        const result = await memoryCache.wrap(cacheKey, 15, () => this.recentUseCase.execute({ user: req.user!, limit }))
        this.ok(res, result, MESSAGES.SUBMISSION_RECENT_SUCCESS)
    }

    async getOne(req: Request, res: Response): Promise<void> {
        const id = String(req.params.id)
        this.logger.debug(`Received request to get submission: ${id}`)
        const cacheKey = `sub_detail_${id}_${req.user!.id}_${String(req.user!.role).toUpperCase()}`
        const cached = /no-cache|no-store/i.test(req.get('Cache-Control') || '') ? null : memoryCache.get(cacheKey)
        if (cached) {
            this.ok(res, cached, MESSAGES.SUBMISSION_GET_SUCCESS)
            return
        }
        const result = await this.getOneUseCase.execute({ id, user: req.user! })
        if (String(result.gradingStatus).toLowerCase() === 'graded') memoryCache.set(cacheKey, result, 20)
        this.ok(res, result, MESSAGES.SUBMISSION_GET_SUCCESS)
    }

    async source(req: Request, res: Response): Promise<void> {
        const submission = await this.getOneUseCase.execute({ id: String(req.params.id), user: req.user! })
        res.setHeader('Cache-Control', 'no-store')
        if (!submission.zipFileUrl) { res.status(404).json({ success: false, message: 'Bài nộp chưa có ZIP để đọc.' }); return }
        try { this.ok(res, await readSubmissionArchive(submission.zipFileUrl)) }
        catch { res.status(422).json({ success: false, message: 'Không thể đọc mã nguồn từ ZIP đã lưu. Tệp có thể không hợp lệ, vượt giới hạn hoặc không còn trên kho lưu trữ.' }) }
    }

    async history(req: Request, res: Response): Promise<void> {
        const current = await this.getOneUseCase.execute({ id: String(req.params.id), user: req.user! })
        const rows = await prisma.submission.findMany({
            where: current.studentId && current.examId ? { StudentId: current.studentId, ExamId: current.examId, ClassId: current.classId ?? null } : { Id: current.id },
            orderBy: [{ AttemptNumber: 'desc' }, { SubmittedAt: 'desc' }],
            select: { Id: true, AttemptNumber: true, SubmittedAt: true, GradedAt: true, ZipFileUrl: true, GithubUrl: true, VercelUrl: true, SourceCommit: true, GradingStatus: true, ReviewStatus: true, FinalScore: true, RawScore: true, Exam: { select: { TotalPoints: true } } },
        })
        res.setHeader('Cache-Control', 'no-store')
        this.ok(res, rows.map(row => ({
            id: row.Id, githubUrl: row.GithubUrl, vercelUrl: row.VercelUrl, sourceCommit: row.SourceCommit, attemptNumber: row.AttemptNumber, submittedAt: row.SubmittedAt, gradedAt: row.GradedAt,
            filename: row.ZipFileUrl ? new URL(row.ZipFileUrl, 'http://local').searchParams.get('filename') || path.basename(row.ZipFileUrl.split('?')[0]) : null,
            gradingStatus: row.GradingStatus, isPublished: row.ReviewStatus === 'PUBLISHED',
            score: String(req.user!.role).toUpperCase() === 'STUDENT' && row.ReviewStatus !== 'PUBLISHED' ? null : row.FinalScore ?? row.RawScore,
            maxScore: row.Exam?.TotalPoints ?? null,
        })))
    }

    async submit(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received request to create submission')
        const data = { ...req.body }
        
        // Pass the uploaded file buffer to the usecase
        const result = await this.submitUseCase.execute({ 
            dto: CreateSubmissionRequestDto.from(data),
            file: req.file,
            user: req.user! 
        })
        memoryCache.invalidatePrefix('subs_list_')
        memoryCache.invalidatePrefix('subs_recent_')
        memoryCache.invalidatePrefix('student_dash_')
        this.created(res, result, MESSAGES.SUBMISSION_CREATE_SUCCESS)
    }

    async download(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to download submission: ${req.params.id}`)
        
        const submission = await this.getOneUseCase.execute({ id: String(req.params.id), user: req.user! })
        if (!submission || !submission.zipFileUrl) {
            res.status(404).json({ success: false, Message: 'Submission or file not found' })
            return
        }

        const fileUrl = submission.zipFileUrl
        
        let fileName = 'submission.zip'
        try {
            const urlObj = new URL(fileUrl, 'http://localhost')
            if (urlObj.searchParams.has('filename')) {
                fileName = urlObj.searchParams.get('filename')!
            } else {
                fileName = urlObj.pathname.split('/').pop() || 'submission.zip'
            }
        } catch {
            fileName = fileUrl.split('/').pop()?.split('?')[0] || 'submission.zip'
        }

        res.setHeader('Cache-Control', 'private, no-store')
        res.attachment(path.basename(fileName))
        res.type('application/zip')
        res.end(await readSubmissionFile(fileUrl))
    }


    async publishGrade(req: Request, res: Response): Promise<void> {
        const id = String(req.params.id)
        this.logger.debug(`Received request to publish grade for submission: ${id}`)
        const result = await this.publishGradeUseCase.execute({ id, dto: { data: req.body } as any, user: req.user! })
        memoryCache.invalidatePrefix(`sub_detail_${id}_`)
        memoryCache.invalidatePrefix('subs_list_')
        memoryCache.invalidatePrefix('subs_recent_')
        memoryCache.invalidatePrefix('student_dash_')
        this.ok(res, result, MESSAGES.SUBMISSION_PUBLISH_SUCCESS)
    }

    async bulkPublish(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to bulk publish grades for assignment: ${req.body.assignmentId}`)
        const result = await this.bulkPublishGradesUseCase.execute({ assignmentId: String(req.body.assignmentId), user: req.user! })
        memoryCache.invalidatePrefix('sub_detail_')
        memoryCache.invalidatePrefix('subs_list_')
        memoryCache.invalidatePrefix('subs_recent_')
        memoryCache.invalidatePrefix('student_dash_')
        const message = result.count ? `Successfully published grades for ${result.count} student(s)` : 'Successfully published grades for all students'
        this.ok(res, result, message)
    }

    async submitFeedback(req: Request, res: Response): Promise<void> {
        const id = String(req.params.id)
        this.logger.debug(`Received request to submit feedback for submission: ${id}`)
        const result = await this.submitFeedbackUseCase.execute({ id, user: req.user!, feedback: req.body.feedback })
        memoryCache.invalidatePrefix(`sub_detail_${id}_`)
        this.ok(res, result, 'Feedback submitted successfully')
    }

    async getAiHint(req: Request, res: Response): Promise<void> {
        const submissionId = String(req.params.id)
        const ruleScoreId = String(req.query.ruleScoreId)
        this.logger.debug(`Received request for AI hint for submission: ${submissionId}, rule: ${ruleScoreId}`)
        const result = await this.getAiHintUseCase.execute({ submissionId, ruleScoreId, user: req.user! })
        this.ok(res, result, 'Lấy gợi ý AI thành công')
    }

    async detectDuplicates(req: Request, res: Response): Promise<void> {
        const assignmentId = String(req.query.assignmentId || '')
        const rawThreshold = req.query.threshold
        const threshold = rawThreshold !== undefined && rawThreshold !== '' ? Number(rawThreshold) : undefined
        this.logger.debug(`Received request to detect duplicate submissions for assignment: ${assignmentId}`)
        const useCase = new DetectDuplicateSubmissionsUseCase()
        const result = await useCase.execute({ assignmentId, user: req.user!, threshold })
        this.ok(res, result, 'Kiểm tra trùng bài thành công')
    }

    async applyDuplicatePenalty(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to apply duplicate penalty for assignment: ${req.body.assignmentId}`)
        const useCase = new ApplyDuplicatePenaltyUseCase()
        const result = await useCase.execute({ dto: req.body, user: req.user! })
        memoryCache.invalidatePrefix('sub_detail_')
        memoryCache.invalidatePrefix('subs_list_')
        memoryCache.invalidatePrefix('subs_recent_')
        memoryCache.invalidatePrefix('student_dash_')
        this.ok(res, result, 'Đã áp dụng trừ điểm bài trùng lặp thành công')
    }

    async reopen(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received request to reopen submission for student: ${req.body.studentId}`)
        const dto = ReopenSubmissionRequestDto.from(req.body)
        const useCase = new ReopenSubmissionUseCase()
        const result = await useCase.execute({ dto, user: req.user! })
        memoryCache.invalidatePrefix('exam_detail_')
        memoryCache.invalidatePrefix('sub_detail_')
        memoryCache.invalidatePrefix('subs_list_')
        memoryCache.invalidatePrefix('subs_recent_')
        memoryCache.invalidatePrefix('student_dash_')
        this.ok(res, result, 'Đã mở lại bài nộp thành công')
    }
}
