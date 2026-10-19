// @ts-nocheck
import { durableGradingQueue } from '../../../application/queue/durable-grading-queue.js';
import { gradingLease } from '../../../application/queue/grading-lease.js';
import { assertAssignmentAccess, staffSubmissionScope } from '../../../assignment/assignment-access.js';
import { privateSubmissionRoot } from '../../../../../submissions/infrastructure/submission-storage.js';
import { inspectSourceArchive } from '../../../../../submissions/infrastructure/source-archive.js';
import { readSubmissionFile } from '../../../../../submissions/infrastructure/submission-storage.js';
import { publishNotification } from '../../../../../../shared/infrastructure/publish-notification.js'

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../../../../database/prisma.js';
import { BadRequestError } from '../../../shared/errors/index.js';
import { ExecutionSandboxService, SandboxHandle } from '../../../application/sandbox/ExecutionSandboxService.js';

import { PlaywrightExecutor } from '../../../application/execution/PlaywrightExecutor.js';
import { RubricEvaluator, EvaluationContext } from '../../../application/evaluator/RubricEvaluator.js';
import { globalAssignmentRepository } from '../../../assignment/PublishedAssignmentRepository.js';
import { extractZipAsync } from '../../../shared/helpers/unzipHelper.js';
import { Submission } from '../../../core/domain/submission/Submission.js';
import { SubmissionState } from '../../../core/domain/submission/SubmissionState.js';
import { ProjectSourceSnapshot } from '../../../application/evaluator/AICodeReviewEngine.js';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DocumentExtractor } from '../../../assignment/DocumentExtractor.js';
import { globalSubmissionQueue, SubmissionQueue } from '../../../application/queue/SubmissionQueue.js';
import { globalJobManager } from '../../../application/queue/SubmissionJobManager.js';
import { SubmissionHistoryRepository } from '../../../infrastructure/file-system/SubmissionHistoryRepository.js';
import { calculateLatePenalty } from '../../../../../submissions/domain/utils/late-penalty-calculator.js';
import { ForbiddenError, NotFoundError } from '../../../../../../shared/application/app.error.js';
import { memoryCache } from '../../../../../../shared/infrastructure/memory-cache.js';
import { assertDirectorySubmissionLanguage, examConfiguration } from '../../../../../submissions/application/submission-language.js';
import { verifyConsoleTests } from '../../../application/evaluator/console-verification.js';
import { studentReportView } from '../../../../../submissions/application/student-report-view.js';
import { detectAssignmentProfile } from '../../../../../ai/infrastructure/analysis/assignment-contract.js';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

import { BaseController } from '../../../../../../shared/presentation/base-controller.js';

const parseValidationConfig = (value: unknown): any => {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(String(value)); } catch { return {}; }
};

const mapDatabaseRubricRule = (rule: any, testCases: any[]) => {
    const criteria = Array.isArray(rule.RubricCriterion) ? rule.RubricCriterion : [];
    const validationTypes = criteria.map((criterion: any) => String(criterion.ValidationType || '').toUpperCase());
    const configs = criteria.map((criterion: any) => parseValidationConfig(criterion.ValidationConfig));
    const firstHttpProbe = configs.map((config: any) => config.httpProbe || (Array.isArray(config.steps) ? {
        description: rule.Description || rule.RuleCode || 'HTTP validation',
        steps: config.steps
    } : null)).find(Boolean);
    const firstSqlProbe = configs.map((config: any) => config.sqlProbe).find(Boolean);
    const staticPatterns = configs.flatMap((config: any) => Array.isArray(config.staticPatterns) ? config.staticPatterns : []);

    let scoringStrategy = 'AICodeReview';
    let category = 'CodeQuality';
    let requiredEvidence: any[] = [{
        evidenceType: 'ai.code.reviewed',
        minimumConfidence: 0.7,
        semanticDescription: rule.EvaluationPrompt || rule.Description || rule.RuleCode || 'Review the submitted source code'
    }];

    if (rule.IsManualOnly) {
        scoringStrategy = 'Manual';
        requiredEvidence = [{ evidenceType: 'manual.teacher.reviewed', minimumConfidence: 1 }];
    } else if (firstSqlProbe) {
        scoringStrategy = 'SqlExecutionProbe';
        category = 'Functional';
        requiredEvidence = [{ evidenceType: 'runtime.sql.probed', minimumConfidence: 1, sqlProbe: firstSqlProbe }];
    } else if (validationTypes.some((type: string) => ['HTTP', 'HTTPPROBE'].includes(type)) && firstHttpProbe?.steps?.length) {
        scoringStrategy = 'HTTPProbe';
        category = 'Functional';
        requiredEvidence = [{ evidenceType: 'runtime.http.probed', minimumConfidence: 1, httpProbe: firstHttpProbe }];
    } else if (validationTypes.some((type: string) => ['TEST', 'TESTCASE', 'STDINOUT', 'STDINOUTPROBE'].includes(type)) && testCases.length > 0) {
        scoringStrategy = 'StdInOutProbe';
        category = 'Algorithm';
        requiredEvidence = [{
            evidenceType: 'runtime.stdio.probed',
            minimumConfidence: 1,
            stdInOutProbe: {
                description: rule.Description || rule.RuleCode || 'Standard input/output tests',
                testCases: testCases.map((testCase: any) => ({
                    id: testCase.Id,
                    input: testCase.Input || '',
                    expectedOutput: testCase.ExpectedOutput || '',
                    isHidden: testCase.IsHidden !== false,
                    timeoutMs: testCase.TimeoutMs || 5000
                }))
            }
        }];
    } else if (validationTypes.some((type: string) => ['STATIC', 'UNIVERSALSTATIC'].includes(type)) && staticPatterns.length > 0) {
        scoringStrategy = 'UniversalStatic';
        requiredEvidence = [];
    } else if (rule.RequireImageEvidence || validationTypes.some((type: string) => ['VISION', 'AIVISION'].includes(type))) {
        scoringStrategy = 'AIVision';
        category = 'UI';
        requiredEvidence = [{
            evidenceType: 'browser.screenshot.captured',
            minimumConfidence: 0.7,
            browserProbe: { description: rule.Description || 'UI evidence', path: '/' }
        }];
    } else if (rule.ReferenceAnswer && !rule.RequireCodeEvidence) {
        scoringStrategy = 'AiTextAnalysis';
        category = 'Theory';
        requiredEvidence = [{
            evidenceType: 'ai.text.analyzed',
            minimumConfidence: 0.7,
            semanticDescription: rule.EvaluationPrompt || rule.Description || 'Compare the answer with the reference answer'
        }];
    }

    return {
        id: rule.Id,
        title: rule.RuleCode || rule.Description || 'Rule',
        description: rule.Description || rule.EvaluationPrompt || '',
        category,
        weight: Number(rule.MaxPoints || 0),
        scoringStrategy,
        requiredEvidence,
        referenceAnswer: rule.ReferenceAnswer || undefined,
        staticPatterns: staticPatterns.length > 0 ? staticPatterns : undefined,
        contextHint: rule.EvaluationPrompt || undefined,
        criteria: criteria.map((criterion: any) => ({
            id: criterion.Id,
            description: criterion.Description || '',
            points: Number(criterion.MaxPoints || 0)
        }))
    };
};

export class SubmissionController extends BaseController {
    private readonly sandboxService: ExecutionSandboxService;
    private readonly playwrightExecutor: PlaywrightExecutor;
    private readonly evaluator: RubricEvaluator;
    private readonly historyRepo: SubmissionHistoryRepository;

    constructor(
        sandboxService: ExecutionSandboxService,
        playwrightExecutor: PlaywrightExecutor,
        evaluator: RubricEvaluator
    ) {
        super();
        this.sandboxService = sandboxService;
        this.playwrightExecutor = playwrightExecutor;
        this.evaluator = evaluator;
        this.historyRepo = new SubmissionHistoryRepository();
    }

    private assertSubmissionAccess = async (submissionId: string, user: any, requirePublishedForStudent: boolean) => {
        const submission = await prisma.submission.findUnique({
            where: { Id: submissionId },
            select: {
                StudentId: true,
                ReviewStatus: true,
                Exam: { select: { CreatedBy: true, ExamClass: { select: { Class: { select: { InstructorClass: { select: { UserId: true } } } } } } } },
                Class: {
                    select: {
                        InstructorClass: { select: { UserId: true } }
                    }
                }
            }
        });

        if (!submission) throw new NotFoundError('Submission not found');

        const role = String(user?.role || '').toUpperCase();
        const isPublished = submission.ReviewStatus === 'PUBLISHED';
        if (role === 'ADMIN') return { role, isPublished };

        if (role === 'LECTURER') {
            const ownsClass = submission.Class?.InstructorClass?.some((item: any) => item.UserId === user.id) || (!submission.StudentId && submission.Exam?.ExamClass?.some((ec: any) => ec.Class?.InstructorClass?.some((ic: any) => ic.UserId === user.id)));
            const createdExam = submission.Exam?.CreatedBy === user.id;
            if (!ownsClass && !createdExam) {
                throw new ForbiddenError('You can only view submissions for exams you created or classes you teach');
            }
            return { role, isPublished };
        }

        if (role === 'STUDENT') {
            if (submission.StudentId !== user.id) {
                throw new ForbiddenError('You can only view your own submissions');
            }
            if (requirePublishedForStudent && !isPublished) {
                throw new ForbiddenError('This grade has not been published yet');
            }
            return { role, isPublished };
        }

        throw new ForbiddenError('You do not have permission to view this submission');
    };

    /**
     * POST /api/submissions
     * Accepts a .zip file upload, processes and returns the assessment.
     */
    private async queueUploadedFile(file: Express.Multer.File, assignmentId: string, user: any) {
        await assertAssignmentAccess(assignmentId, user, true);
        if (!file.originalname.toLowerCase().endsWith('.zip')) throw new BadRequestError('Only ZIP files are accepted.');
        const bytes = file.buffer || await fs.readFile(file.path);
        inspectSourceArchive(bytes);
        const id = uuidv4();
        const dir = path.join(privateSubmissionRoot(), 'manual');
        await fs.mkdir(dir, { recursive: true });
        const destination = path.join(dir, id + '.zip');
        await fs.writeFile(destination, bytes);
        try {
            await prisma.submission.create({ data: {
                Id: id, ExamId: assignmentId, StudentId: null, IsLatest: false,
                SubmittedAt: new Date(), ReviewStatus: 'DRAFT', GradingStatus: 'Pending',
                ZipFileUrl: '/private-submissions/manual/' + id + '.zip?filename=' + encodeURIComponent(file.originalname)
            } });
        } catch (error) { await fs.unlink(destination).catch(() => {}); throw error; }
        await durableGradingQueue.enqueue(id, 'batch');
        return { submissionId: id, fileName: file.originalname, studentName: file.originalname.replace(/\.zip$/i, '') };
    }

    submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.file) throw new BadRequestError('Please upload a ZIP file.');
            const result = await this.queueUploadedFile(req.file, req.body.assignmentId, req.user);
            this.ok(res, { ...result, statusUrl: '/api/grading/submissions/' + result.submissionId + '/stream' }, 'Submission accepted for processing');
        } catch (error) { next(error); }
    };

    submitBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files?.length) throw new BadRequestError('Please upload ZIP files.');
            await assertAssignmentAccess(req.body.assignmentId, req.user!, true);
            const jobs = [];
            for (const file of files) jobs.push(await this.queueUploadedFile(file, req.body.assignmentId, req.user));
            this.ok(res, { jobs }, jobs.length + ' submissions accepted for processing');
        } catch (error) { next(error); }
    };

    private async extractOrCopyFile(sourcePath: string, extractDir: string, originalFileName?: string): Promise<void> {
        try {
            await extractZipAsync(sourcePath, extractDir);
        } catch (err: any) {
            // Not a valid zip. Just copy it as a plain file into the directory
            await fs.mkdir(extractDir, { recursive: true });
            let fileName = originalFileName || path.basename(sourcePath);
            if (fileName.endsWith('.zip') && !err.message?.includes('ENOENT')) {
                fileName = fileName.replace(/\.zip$/, '');
            }
            if (!fileName) fileName = 'submission_file';
            await fs.copyFile(sourcePath, path.join(extractDir, fileName));
        }
    }

    /**
     * Helper to download file from URL (Cloudinary or local) and save to temp path
     */
    private async downloadFile(url: string, destPath: string): Promise<void> {
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.writeFile(destPath, await readSubmissionFile(url));
    }

    public executeGradingForSubmission = async (submissionId: string, queue: SubmissionQueue | null = globalSubmissionQueue): Promise<void> => {
        if (queue !== null) { await durableGradingQueue.enqueue(submissionId, 'batch'); return; }
        const submissionRecord = await prisma.submission.findUnique({
            where: { Id: submissionId },
            include: { User_Submission_StudentIdToUser: true }
        });

        if (!submissionRecord) {
            throw new BadRequestError('Submission not found');
        }

        if (!submissionRecord.ZipFileUrl) {
            throw new BadRequestError('Submission does not have an uploaded file (ZipFileUrl is null)');
        }

        const assignmentId = submissionRecord.ExamId;
        if (!assignmentId) {
            throw new BadRequestError('Submission is not linked to an Exam (assignment)');
        }

        let publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
        if (!publishedAssignment) {
            const examDb = await prisma.exam.findUnique({
                where: { Id: assignmentId },
                include: {
                    TestCase: { orderBy: { SortOrder: 'asc' } },
                    ExamSection: {
                        include: {
                            RubricRule: {
                                include: {
                                    RubricCriterion: { orderBy: { SortOrder: 'asc' } }
                                }
                            }
                        }
                    }
                }
            });
            if (examDb) {
                publishedAssignment = {
                    id: examDb.Id,
                    version: 1,
                    metadata: {
                        title: examDb.Title || 'Assignment',
                        description: examDb.Description,
                        projectType: examDb.SubmissionFormat || 'CSD201'
                    },
                    blueprintId: examDb.Id,
                    rubric: {
                        id: examDb.Id,
                        totalWeight: Number(examDb.TotalPoints || 10),
                        rules: examDb.ExamSection.flatMap(s =>
                            s.RubricRule.map(r => mapDatabaseRubricRule(r, examDb.TestCase))
                        )
                    }
                };
            }
        }

        if (!publishedAssignment?.rubric?.rules?.length) {
            throw new BadRequestError('Published assignment not found for this submission');
        }

        const studentCode = submissionRecord.User_Submission_StudentIdToUser?.StudentCode ||
            submissionRecord.User_Submission_StudentIdToUser?.StudentCode ||
            submissionRecord.StudentId;

        let originalFileName = 'submission.zip';
        if (submissionRecord.ZipFileUrl) {
            try {
                const urlObj = new URL(submissionRecord.ZipFileUrl);
                if (urlObj.searchParams.has('filename')) {
                    originalFileName = urlObj.searchParams.get('filename')!;
                } else {
                    originalFileName = urlObj.pathname.split('/').pop() || originalFileName;
                }
            } catch (e) {
                originalFileName = submissionRecord.ZipFileUrl.split('/').pop()?.split('?')[0] || originalFileName;
            }
        }

        // 1. Download file to temp directory
        globalJobManager.initJob(submissionId, 'Đang tiếp nhận bài nộp để chấm...');
        globalJobManager.recordEvent(submissionId, { stage: 0, status: 'started', message: `[Tiếp nhận] Bài nộp ${submissionId}; tệp: ${originalFileName}.` });
        const tempZipPath = path.join(process.cwd(), 'temp', 'uploads', `${submissionId}_${originalFileName}`);
        await this.downloadFile(submissionRecord.ZipFileUrl, tempZipPath);
        const archiveHash = createHash('sha256');
        let archiveSize = 0;
        for await (const chunk of createReadStream(tempZipPath)) { archiveSize += chunk.length; archiveHash.update(chunk); }
        globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: `[Tệp gốc] Đã đọc ${archiveSize.toLocaleString('vi-VN')} byte; SHA-256: ${archiveHash.digest('hex')}.` });

        // 2. Unzip file or copy
        const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId + '_' + uuidv4());
        globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: `[Giải nén] Đang mở tệp và các ZIP lồng nhau trong thư mục riêng của lượt chấm.` });
        await this.extractOrCopyFile(tempZipPath, extractDir, originalFileName);
        await this.extractNestedZips(extractDir);
        globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: '[Giải nén] Đã hoàn tất đọc tệp nộp; tiếp tục kiểm tra ngôn ngữ và mã nguồn.' });

        // 3. Update status to 'Processing'
        await prisma.submission.update({
            where: { Id: submissionId },
            data: { 
                GradingStatus: 'Processing',
                GradedAt: null
            }
        });

        const engineSubmission: Submission = {
            id: submissionId,
            assignmentId: assignmentId,
            studentId: studentCode!,
            sourceCodeUri: tempZipPath,
            currentState: SubmissionState.Queued,
            statusHistory: []
        };

        if (queue === null) {
            // Inline: the caller already holds a continuous-queue slot and must keep holding it
            // until this submission is fully graded, otherwise the next one would start early.
            await this.enqueueSubmissionJob(submissionId, publishedAssignment, engineSubmission, extractDir, null);
        } else {
            // Queued: hand off and return, so HTTP callers such as gradeExisting respond
            // immediately instead of waiting for the whole evaluation.
            void this.enqueueSubmissionJob(submissionId, publishedAssignment, engineSubmission, extractDir, queue);
        }
    };

    /**
     * Background grading ("chấm ngầm").
     *
     * Called the moment a student submits, so the position in continuousSubmissionQueue is the
     * submission order. The slot covers the whole pipeline - download, unzip and evaluation -
     * so only one submission is worked on at a time and an earlier submission with a large file
     * can no longer be overtaken by a later one with a small file.
     *
     * The status is set to Processing up front, before the slot is awaited, so that a lecturer
     * pressing "grade all" cannot pick the same submission up a second time while it waits.
     */
    public enqueueContinuousGrading = async (submissionId: string): Promise<void> => {
        await durableGradingQueue.enqueue(submissionId, 'continuous');
    };

    /**
     * POST /api/grading/submissions/grade-existing
     * Grades a single submission that has already been uploaded (has ZipFileUrl)
     */
    gradeExisting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { submissionId } = req.body;
            if (!submissionId) {
                throw new BadRequestError('submissionId is required');
            }

            await this.assertSubmissionAccess(submissionId, req.user, false);
            await this.executeGradingForSubmission(submissionId);

            this.ok(res, { submissionId, statusUrl: `/api/grading/submissions/${submissionId}/stream` }, 'Submission accepted for grading');

        } catch (error: any) {
            console.error('[gradeExisting] ERROR:', error?.stack || error);
            next(error);
        }
    };

    /**
     * POST /api/grading/submissions/grade-existing-batch
     * Grades all 'Pending' submissions for an assignment
     */
    gradeExistingBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assignmentId } = req.body;
            if (!assignmentId) {
                throw new BadRequestError('assignmentId is required');
            }

            await assertAssignmentAccess(assignmentId, req.user!, false);
            const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
            if (!publishedAssignment) {
                throw new BadRequestError('Published assignment not found');
            }

            // Snapshot: Get all submissions for this exam that have a ZipFileUrl and are not currently processing or graded
            const pendingSubmissions = await prisma.submission.findMany({
                where: {
                    ExamId: assignmentId,
                    AND: [staffSubmissionScope(req.user!)],
                    OR: [
                        { GradingStatus: { notIn: ['Processing', 'Graded', 'GRADED'] } },
                        { GradingStatus: 'Processing', GradingTask: { is: null } },
                        { GradingStatus: null }
                    ],
                    IsLatest: true,
                    ZipFileUrl: { not: null }
                },
                include: { User_Submission_StudentIdToUser: true },
                // Grade in submission order rather than whatever order SQL Server returns.
                orderBy: { SubmittedAt: 'asc' }
            });

            if (pendingSubmissions.length === 0) {
                this.ok(res, { jobs: [] }, 'No pending submissions found to grade');
                return;
            }

            const results = [];
            for (const record of pendingSubmissions) {
                await this.assertSubmissionAccess(record.Id, req.user, false);
                await durableGradingQueue.enqueue(record.Id, 'batch');
                results.push({ submissionId: record.Id, studentName: record.User_Submission_StudentIdToUser?.StudentCode || record.StudentId, fileName: path.basename(record.ZipFileUrl!.split('?')[0]) });
            }

            this.ok(res, { jobs: results }, `${results.length} submissions accepted for processing`);
        } catch (error: any) {
            next(error);
        }
    };

    /**
     * POST /api/grading/submissions/grade-selected-batch
     * Grades specific submissions based on their IDs
     */
    gradeSelectedBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assignmentId, submissionIds } = req.body;
            if (!assignmentId) {
                throw new BadRequestError('assignmentId is required');
            }
            if (!Array.isArray(submissionIds) || submissionIds.length === 0 || submissionIds.length > 100 || submissionIds.some(id => typeof id !== 'string' || !id || id.length > 128)) {
                throw new BadRequestError('submissionIds array is required');
            }

            await assertAssignmentAccess(assignmentId, req.user!, false);
            const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
            if (!publishedAssignment) {
                throw new BadRequestError('Published assignment not found');
            }

            // Get submissions by IDs that have a ZipFileUrl
            const pendingSubmissions = await prisma.submission.findMany({
                where: {
                    Id: { in: submissionIds },
                    ExamId: assignmentId,
                    AND: [staffSubmissionScope(req.user!)],
                    ZipFileUrl: { not: null }
                },
                include: { User_Submission_StudentIdToUser: true }
            });

            if (pendingSubmissions.length === 0) {
                this.ok(res, { jobs: [] }, 'No valid submissions found to grade from the selection');
                return;
            }

            const results = [];
            for (const record of pendingSubmissions) {
                await this.assertSubmissionAccess(record.Id, req.user, false);
                await durableGradingQueue.enqueue(record.Id, 'batch');
                results.push({ submissionId: record.Id, studentName: record.User_Submission_StudentIdToUser?.StudentCode || record.StudentId, fileName: path.basename(record.ZipFileUrl!.split('?')[0]) });
            }

            this.ok(res, { jobs: results }, `${results.length} submissions accepted for processing`);
        } catch (error: any) {
            next(error);
        }
    };

    /**
     * GET /api/submissions/batch-status?ids=uuid1,uuid2
     * Returns current job status for multiple submissions.
     */
    getBatchStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const idsString = req.query.ids as string;
            if (!idsString) {
                throw new BadRequestError('Missing ids parameter');
                return;
            }

            const ids = idsString.split(',').filter(id => id.trim().length > 0);
            if (ids.length > 100) throw new BadRequestError('Maximum 100 submissions per request.');
            const statuses: Record<string, any> = {};

            for (const id of ids) {
                await this.assertSubmissionAccess(id, req.user, false);
                const job = globalJobManager.getJob(id);
                if (job) {
                    statuses[id] = {
                        state: job.state,
                        progressPercent: job.progressPercent,
                        currentTask: job.currentTask,
                        error: job.error,
                        score: job.result?.totalScore,
                        maxScore: job.result?.maxPossibleScore
                    };
                } else {
                    const saved = await prisma.submission.findUnique({ where: { Id: id }, select: { GradingStatus: true, FinalScore: true, TotalScore: true, GradingTask: true } });
                    const state = String(saved?.GradingStatus || '').toLowerCase();
                    statuses[id] = { state: state === 'graded' ? 'completed' : state === 'error' ? 'failed' : saved?.GradingTask?.Status === 'running' ? 'processing' : 'queued', progressPercent: state === 'graded' ? 100 : 0, score: state === 'graded' ? Number(saved.FinalScore) : undefined, maxScore: saved?.TotalScore, error: saved?.GradingTask?.LastError || undefined };
                }
            }

            this.ok(res, { statuses }, 'Batch status fetched successfully');
        } catch (err) {
            throw err;
        }
    };

    /**
     * Runs the evaluation for one submission.
     *
     * `queue` selects how it is scheduled:
     *   globalSubmissionQueue (default) - batch grading, up to 3 in parallel.
     *   null                            - run inline; used when the caller already holds a
     *                                     slot in continuousSubmissionQueue, so the work is
     *                                     not queued twice.
     */
    public enqueueSubmissionJob(submissionId: string, publishedAssignment: any, submission: Submission, extractDir: string, queue: SubmissionQueue | null = globalSubmissionQueue) {
        const job = async () => {
            let sandboxHandle: SandboxHandle | null = null;
            let evaluationTimer: ReturnType<typeof setTimeout> | undefined;
            const executionEvidence: any = {};
            try {
                const checkCancelled = () => {
                    const job = globalJobManager.getJob(submissionId);
                    if (job?.isCancelled) throw new Error('Cancelled by user');
                };

                const evaluationPromise = (async () => {
                    checkCancelled();
                    const sourceExam = await prisma.exam.findUnique({ where: { Id: submission.assignmentId }, select: { AiGeneratedContent: true, Description: true, TestCase: { orderBy: { SortOrder: 'asc' } } } });
                    const sourceConfig = examConfiguration(sourceExam);
                    const languageConfig = { ...publishedAssignment.metadata, ...sourceConfig };
                    globalJobManager.updateProgress(submissionId, 3, 'Đang kiểm tra mã nguồn trong bài nộp...');
                    globalJobManager.recordEvent(submissionId, { stage: 0, status: 'started', message: '[Nhận diện] Đối chiếu ngôn ngữ yêu cầu của đề với các tệp thực tế.' });
                    await assertDirectorySubmissionLanguage(languageConfig, extractDir);
                    const requiredLanguage = languageConfig.submissionFormat?.requiredLanguage || languageConfig.runtimeConfig?.language || languageConfig.requiredLanguage || languageConfig.language;
                    globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: `[Ngôn ngữ] Yêu cầu: ${requiredLanguage || 'Đề không khai báo ngôn ngữ bắt buộc'}; kiểm tra tệp đã hoàn tất.` });
                    const sourceSnapshot = await this.buildSourceSnapshot(extractDir, publishedAssignment.metadata?.projectType || 'unknown');
                    const sourceExtensions = [...new Set(sourceSnapshot.files.map(file => path.extname(file.relativePath).toLowerCase() || '(không phần mở rộng)'))];
                    globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: `[Mã nguồn] Đọc được ${sourceSnapshot.files.length} tệp; phần mở rộng: ${sourceExtensions.join(', ') || 'không có'}.` });
                    for (const file of sourceSnapshot.files.slice(0, 8)) globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: `[Tệp nguồn] ${file.relativePath.replace(/\\/g, '/').replace(/^\//, '')}; ${Buffer.byteLength(file.content, 'utf8')} byte.` });
                    if (sourceSnapshot.files.length > 8) globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: `[Mã nguồn] Còn ${sourceSnapshot.files.length - 8} tệp trong snapshot; danh sách xem tại trình đọc mã nguồn.` });
                    globalJobManager.recordEvent(submissionId, { stage: 0, status: 'completed', message: '[Nhận diện] Hoàn tất lập snapshot mã nguồn từ bài nộp này.' });
                    const isConsole = detectAssignmentProfile(sourceExam?.Description || '').mode === 'console';
                    for (const rule of publishedAssignment.rubric?.rules || []) {
                        for (const evidence of rule.requiredEvidence || []) {
                            if (evidence.stdInOutProbe && requiredLanguage) evidence.stdInOutProbe.requiredLanguage = requiredLanguage;
                        }
                    }
                    globalJobManager.updateProgress(submissionId, 5, 'Đang chuẩn bị môi trường thực thi...');
                    try {
                        if (!isConsole) globalJobManager.recordEvent(submissionId, { stage: 1, status: 'started', message: '[Môi trường] Đang nhận diện runtime và khởi tạo sandbox ứng dụng.' });
                        const startSandboxPromise = isConsole
                            ? Promise.resolve({ containerId: null, baseUrl: null, projectType: 'algorithm', runtimeStack: 'unknown', isReady: false, crashLogs: 'Bài console dùng runner stdin/stdout riêng; không khởi động máy chủ Web.' })
                            : this.sandboxService.startAsync(extractDir, publishedAssignment.metadata?.projectType as any);
                        let sandboxStartTimer: ReturnType<typeof setTimeout> | undefined;
                        let sandboxStartTimedOut = false;
                        const startTimeoutPromise = new Promise<never>((_, reject) => {
                            sandboxStartTimer = setTimeout(() => {
                                sandboxStartTimedOut = true;
                                reject(new Error('Sandbox initialization timed out (60s). Proceeding to source analysis.'));
                            }, 60000);
                        });

                        try {
                            sandboxHandle = await Promise.race([startSandboxPromise, startTimeoutPromise]);
                        } finally {
                            if (sandboxStartTimer) clearTimeout(sandboxStartTimer);
                            if (sandboxStartTimedOut) {
                                void startSandboxPromise
                                    .then(async lateHandle => {
                                        console.warn(`[SubmissionController] Sandbox ${lateHandle.containerId || '(no container)'} became ready after timeout; cleaning it up.`);
                                        await this.sandboxService.stopAsync(lateHandle);
                                    })
                                    .catch(lateError => {
                                        console.warn('[SubmissionController] Timed-out sandbox eventually failed:', lateError?.message || lateError);
                                    });
                            }
                        }
                    } catch (sandboxErr: any) {
                        console.error(`[SubmissionController] Sandbox start error:`, sandboxErr);
                        sandboxHandle = {
                            containerId: null,
                            baseUrl: null,
                            projectType: (publishedAssignment.metadata?.projectType as any) || 'unknown',
                            runtimeStack: 'unknown' as any,
                            isReady: false,
                            crashLogs: sandboxErr?.message || String(sandboxErr)
                        };
                    }

                    if (!isConsole) globalJobManager.recordEvent(submissionId, { stage: 1, status: sandboxHandle.isReady ? 'completed' : 'warning', message: sandboxHandle.isReady
                        ? `[Môi trường] Sandbox sẵn sàng; runtime: ${sandboxHandle.runtimeStack}; container: ${sandboxHandle.containerId || 'không có container ID'}.`
                        : `[Môi trường] Runtime: ${sandboxHandle.runtimeStack}; chưa thể chạy ứng dụng. ${sandboxHandle.crashLogs || 'Không có runner phù hợp với loại dự án này.'}` });

                    if (sandboxHandle.isReady && sandboxHandle.baseUrl) {
                        checkCancelled();
                        globalJobManager.updateProgress(submissionId, 10, 'Đang kiểm tra kết nối ứng dụng trong sandbox...');
                        try {
                            await fetch(sandboxHandle.baseUrl);
                        } catch (err) { }
                    }

                    checkCancelled();
                    globalJobManager.updateProgress(submissionId, 15, 'Đã chuẩn bị snapshot; đang chọn các bước kiểm chứng phù hợp...');

                    let playwrightEvidence: any[] = [];
                    if (sandboxHandle.isReady && sandboxHandle.baseUrl) {
                        checkCancelled();
                        globalJobManager.updateProgress(submissionId, 25, 'Đang thu thập bằng chứng kiểm thử giao diện...');
                        playwrightEvidence = await this.playwrightExecutor.executeAsync(
                            submissionId,
                            extractDir,
                            publishedAssignment,
                            sandboxHandle.baseUrl,
                            sandboxHandle.additionalUrls
                        );
                        globalJobManager.recordEvent(submissionId, { stage: 2, status: 'info', message: `[Kiểm chứng giao diện] Đã thu thập ${playwrightEvidence.length} bản ghi bằng chứng từ trình thực thi.` });
                    }

                    checkCancelled();
                    globalJobManager.updateProgress(submissionId, 40, 'Đang kiểm tra tài liệu bổ sung trong bài nộp...');
                    let extractedDoc: any = undefined;
                    try {
                        async function findDocx(dir: string): Promise<string | null> {
                            const entries = await fs.readdir(dir, { withFileTypes: true });
                            for (const entry of entries) {
                                const fullPath = path.join(dir, entry.name);
                                if (entry.isDirectory()) {
                                    const res = await findDocx(fullPath);
                                    if (res) return res;
                                } else if (['.docx', '.pdf', '.doc', '.txt'].some(ext => entry.name.toLowerCase().endsWith(ext))) {
                                    return fullPath;
                                }
                            }
                            return null;
                        }
                        const docPath = await findDocx(extractDir);
                        if (docPath) {
                            const buf = await fs.readFile(docPath);
                            const lowerPath = docPath.toLowerCase();
                            let mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                            if (lowerPath.endsWith('.pdf')) mime = 'application/pdf';
                            else if (lowerPath.endsWith('.doc')) mime = 'application/msword';
                            else if (lowerPath.endsWith('.txt')) mime = 'text/plain';

                            const extractor = new DocumentExtractor();
                            extractedDoc = await extractor.extractAsync(buf, mime);
                            globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: `[Tài liệu] Đã trích đọc ${path.basename(docPath)} (${buf.length} byte).` });
                        } else {
                            globalJobManager.recordEvent(submissionId, { stage: 0, status: 'info', message: '[Tài liệu] Bài nộp không có báo cáo DOCX/PDF/DOC/TXT; sử dụng mã nguồn đã đọc.' });
                        }
                    } catch (docErr) { globalJobManager.recordEvent(submissionId, { stage: 0, status: 'warning', message: `[Tài liệu] Không trích đọc được tài liệu bổ sung: ${docErr.message || 'Lỗi đọc tệp'}.` }); }

                    checkCancelled();
                    const context: EvaluationContext = {
                        sandbox: sandboxHandle,
                        sourceSnapshot,
                        evidencePool: [...playwrightEvidence],
                        extractedDocument: extractedDoc,
                        submissionPath: extractDir,
                        crashLogs: sandboxHandle.isReady === false ? sandboxHandle.crashLogs : undefined,
                        subjectCode: publishedAssignment.metadata?.subjectCode || publishedAssignment.subjectCode || (publishedAssignment as any).SubjectCode,
                        assignmentTitle: publishedAssignment.metadata?.title || (publishedAssignment as any).title,
                        projectType: sandboxHandle.projectType || publishedAssignment.metadata?.projectType
                    };
                    context.onExecutionEvent = event => globalJobManager.recordEvent(submissionId, event);

                    globalJobManager.updateProgress(submissionId, 45, 'Biên dịch và kiểm chứng testcase đã lưu...');
                    const consoleVerification = sourceExam ? await verifyConsoleTests(sourceExam, publishedAssignment.rubric.rules, extractDir, context.onExecutionEvent) : null;
                    if (consoleVerification) {
                        executionEvidence.consoleVerification = consoleVerification;
                        if (typeof consoleVerification.compilationPassed === 'boolean') executionEvidence.compilationSummary = { passed: consoleVerification.compilationPassed };
                        executionEvidence.executionSummary = { runtimeStack: 'console', ready: consoleVerification.status === 'completed', limitation: consoleVerification.status === 'completed' ? null : consoleVerification.error || 'Chưa thực thi testcase.' };
                    }
                    if (consoleVerification) context.crashLogs = undefined; // An unavailable web server is not a console-program crash.
                    if (consoleVerification?.status === 'completed') context.runtimeTestSummary = JSON.stringify({ compilationPassed: consoleVerification.compilationPassed, passed: consoleVerification.passedCases, total: consoleVerification.totalCases });
                    globalJobManager.updateProgress(submissionId, 50, 'Đang đánh giá các tiêu chí theo barem...');
                    globalJobManager.recordEvent(submissionId, { stage: 3, status: 'started', message: `[Barem] Bắt đầu đánh giá ${publishedAssignment.rubric.rules.length} tiêu chí của đề; dùng bằng chứng mã nguồn và kết quả thực thi hiện có.` });
                    const evaluatedReport = await this.evaluator.evaluateAsync(
                        submissionId,
                        publishedAssignment.id,
                        submission.studentId,
                        publishedAssignment.rubric,
                        context,
                        (current, total, msg, meta) => {
                            const pct = 50 + Math.floor((current / total) * 50);
                            globalJobManager.updateProgress(submissionId, pct, msg, meta);
                        }
                    );
                    if (consoleVerification) {
                        evaluatedReport.consoleVerification = consoleVerification;
                        if (consoleVerification.status === 'completed' && typeof consoleVerification.compilationPassed === 'boolean') evaluatedReport.compilationSummary = { passed: consoleVerification.compilationPassed };
                    }
                    return evaluatedReport;
                })();

                const timeoutPromise = new Promise((_, reject) =>
                    evaluationTimer = setTimeout(() => reject(new Error('Global evaluation timeout (15 minutes) exceeded')), 900000)
                );

                const report = await Promise.race([evaluationPromise, timeoutPromise]) as any;


                report.executionSummary = { runtimeStack: sandboxHandle?.runtimeStack || 'unknown', ready: sandboxHandle?.isReady === true, limitation: sandboxHandle?.isReady ? null : sandboxHandle?.crashLogs || 'No executable test environment was available.' };
                if (report.consoleVerification?.status === 'completed') report.executionSummary = { runtimeStack: 'console', ready: true, limitation: null };
                // --- Save to History DB ---
                try {
                    globalJobManager.updateProgress(submissionId, 99, 'Đang lưu báo cáo đánh giá...');
                    globalJobManager.recordEvent(submissionId, { stage: 4, status: 'started', message: '[Lưu báo cáo] Đang lưu điểm, tiêu chí và nhật ký của lượt chấm này; chưa tự công bố điểm.' });
                    report.gradingLogs = [...(globalJobManager.getJob(submissionId)?.logs || [])];
                    await this.historyRepo.saveAsync({
                        id: submissionId,
                        assignmentId: publishedAssignment.id,
                        studentId: submission.studentId,
                        score: report.totalScore || 0,
                        maxScore: report.maxPossibleScore || 0,
                        assessedAt: new Date().toISOString(),
                        title: publishedAssignment.metadata.title,
                        report: report
                    });
                    globalJobManager.completeJob(submissionId, report);
                    memoryCache.invalidatePrefix(`sub_detail_${submissionId}_`);
                    memoryCache.invalidatePrefix('subs_list_');
                    memoryCache.invalidatePrefix('subs_recent_');
                    memoryCache.invalidatePrefix('student_dash_');

                    globalJobManager.emitAssignmentEvent(publishedAssignment.id, {
                        type: 'SUBMISSION_GRADED',
                        assignmentId: publishedAssignment.id,
                        submissionId: submissionId,
                        score: report.totalScore || 0
                    });
                } catch (historyErr) {
                    console.error(`[SubmissionController] Failed to save history for ${submissionId}:`, historyErr);
                    throw historyErr;
                }

            } catch (err: any) {
                console.error(`[SubmissionController] Job ${submissionId} failed:`, err);
                const failedStage = globalJobManager.getJob(submissionId)?.currentStage || 0;
                globalJobManager.recordEvent(submissionId, { stage: failedStage, status: 'failed', message: `[Lỗi lượt chấm] ${err.message || 'Không xác định được nguyên nhân.'}` });

                try {
                    await this.historyRepo.saveAsync({ id: submissionId, assignmentId: publishedAssignment.id, studentId: submission.studentId, score: 0, maxScore: publishedAssignment.rubric.totalWeight || 0, assessedAt: new Date().toISOString(), report: { ...(err.partialReport || {}), ...executionEvidence, submissionId, assignmentId: publishedAssignment.id, gradingLogs: [...(globalJobManager.getJob(submissionId)?.logs || [])], error: err.message || 'Grading failed' } });
                    memoryCache.invalidatePrefix('sub_detail_'); memoryCache.invalidatePrefix('subs_list_'); memoryCache.invalidatePrefix('subs_recent_');
                } catch (dbErr) { console.error('[Grading] Failed to persist error state:', dbErr); }

                if (gradingLease.getStore()) throw err;
                globalJobManager.failJob(submissionId, err.message || 'Unknown error');
            } finally {
                if (evaluationTimer) clearTimeout(evaluationTimer);
                if (sandboxHandle) {
                    await this.sandboxService.stopAsync(sandboxHandle);
                }
                try {
                    await fs.rm(extractDir, { recursive: true, force: true });
                } catch (cleanupErr) { }
            }
        };

        return (queue ? queue.enqueue(job) : job()).catch(err => {
            console.error(`[SubmissionController] Queue error for ${submissionId}:`, err);
            if (gradingLease.getStore()) throw err;
        });
    }

    streamProgress = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const access = await this.assertSubmissionAccess(id, req.user, false);
        const hideUnpublishedResult = access.role === 'STUDENT' && !access.isPublished;
        const visibleJob = (value: any) => hideUnpublishedResult
            ? { ...value, result: undefined, meta: undefined, logs: undefined, currentTask: value.state === 'completed' ? 'Đã xử lý bài nộp. Chờ giảng viên công bố.' : 'Đang xử lý bài nộp...', ...(value?.error ? { error: 'Không thể hoàn tất lượt chấm. Giảng viên sẽ kiểm tra và chấm lại.' } : {}) }
            : access.role === 'STUDENT' ? { ...value, logs: undefined, meta: undefined } : value;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Send initial state
        let job = globalJobManager.getJob(id);
        if (!job) {
            try {
                const subRecord = await prisma.submission.findUnique({
                    where: { Id: id },
                    include: { Exam: true }
                });
                if (subRecord) {
                    const statusLower = String(subRecord.GradingStatus || '').toLowerCase();
                    const isGraded = ['graded', 'completed'].includes(statusLower);

                    if (isGraded) {
                        const scoreVal = Number(subRecord.FinalScore ?? subRecord.TotalScore ?? subRecord.RawScore ?? 0);
                        res.write(`data: ${JSON.stringify({
                            id,
                            state: 'completed',
                            progressPercent: 100,
                            currentTask: 'Hoàn tất chấm điểm',
                            ...(hideUnpublishedResult ? {} : { result: { totalScore: scoreVal } })
                        })}\n\n`);
                        setTimeout(() => {
                            try { res.end(); } catch (e) { }
                        }, 500);
                        return;
                    } else if (subRecord.ZipFileUrl) {
                        const strat = (subRecord as any).Exam?.GradingStrategy || 'CONTINUOUS_QUEUE';
                        if (strat === 'BATCH_POST_DEADLINE') {
                            res.write(`data: ${JSON.stringify({
                                id,
                                state: 'pending',
                                progressPercent: 0,
                                currentTask: 'Holding in pending status for batch grading'
                            })}\n\n`);
                            setTimeout(() => {
                                try { res.end(); } catch (e) { }
                            }, 500);
                            return;
                        }
                        // Self-healing: if in DB but memory job missing and in Continuous Queue mode, start grading job immediately
                        const task = await prisma.submissionGradingTask.findUnique({ where: { SubmissionId: id } });
                        job = {
                            submissionId: id,
                            state: ['failed', 'cancelled'].includes(task?.Status) || statusLower === 'error' || (!task && statusLower === 'processing') ? 'failed' : task?.Status === 'running' ? 'processing' : 'queued',
                            progressPercent: 0,
                            currentTask: task?.Status === 'running' ? 'Đang chấm bài...' : 'Đang chờ trong hàng đợi chấm bài...',
                            ...(['failed', 'cancelled'].includes(task?.Status) || statusLower === 'error' || (!task && statusLower === 'processing') ? { error: hideUnpublishedResult ? 'Lượt chấm chưa hoàn tất. Giảng viên sẽ kiểm tra và chấm lại.' : task?.LastError || 'Lượt chấm bị gián đoạn. Vui lòng chấm lại.' } : {})
                        };
                    }
                }
            } catch (e) { }
        }

        if (job) {
            res.write(`data: ${JSON.stringify(visibleJob(job))}\n\n`);
            if (job.state === 'completed' || job.state === 'failed') {
                setTimeout(() => {
                    try { res.end(); } catch (e) { }
                }, 1000);
                return;
            }
        } else {
            res.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
        }

        // SSE Keep-Alive heartbeat (every 15s) to prevent Cloudflare/Nginx idle timeouts
        const keepAliveInterval = setInterval(() => {
            try {
                res.write(`: keep-alive\n\n`);
            } catch (e) { }
        }, 15000);

        const onUpdate = (updatedJob: any) => {
            try {
                res.write(`data: ${JSON.stringify(visibleJob(updatedJob))}\n\n`);
                if (updatedJob.state === 'completed' || updatedJob.state === 'failed') {
                    clearInterval(keepAliveInterval);
                    setTimeout(() => {
                        try { res.end(); } catch (e) { }
                    }, 1000);
                    globalJobManager.removeListener(`update:${id}`, onUpdate);
                }
            } catch (e) {
                clearInterval(keepAliveInterval);
                globalJobManager.removeListener(`update:${id}`, onUpdate);
            }
        };

        globalJobManager.on(`update:${id}`, onUpdate);

        req.on('close', () => {
            clearInterval(keepAliveInterval);
            globalJobManager.removeListener(`update:${id}`, onUpdate);
        });
    };

    cancel = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await this.assertSubmissionAccess(id, req.user, false);
        await durableGradingQueue.cancel(id);
        const job = globalJobManager.getJob(id);

        if (!job) {
            this.ok(res, { success: true }, 'Đã ghi nhận yêu cầu hủy lượt chấm.');
            return;
        }

        if (job.state === 'completed') {
            throw new BadRequestError(`Cannot cancel job in state: ${job.state}`);
        }

        globalJobManager.cancelJob(id);
        this.ok(res, { success: true }, 'Job cancellation requested.');
    };

    cancelBatch = async (req: Request, res: Response) => {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id || id.length > 128)) {
            throw new BadRequestError('Missing or invalid ids array');
        }

        if (ids.length > 100) throw new BadRequestError('Maximum 100 submissions per request.');
        for (const id of ids) await this.assertSubmissionAccess(id, req.user, false);
        let cancelledCount = 0;
        for (const id of ids) if (await durableGradingQueue.cancel(id)) cancelledCount++;

        this.ok(res, { success: true, cancelledCount }, `Requested cancellation for ${cancelledCount} jobs.`);
    };

    getResult = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await this.assertSubmissionAccess(id, req.user, true);
        const job = globalJobManager.getJob(id);

        let report: any = null;

        if (!job || (job.state === 'completed' && !job.result)) {
            // Fallback to History Database if RAM doesn't have it
            const historyItem = await this.historyRepo.getByIdAsync(id);
            if (historyItem && historyItem.report && Object.keys(historyItem.report).length > 0) {
                report = historyItem.report;
            } else {
                throw new BadRequestError('Submission report not found. The grading data may have expired — please re-submit and grade again.');
            }
        } else {
            if (job.state === 'completed') {
                report = job.result;
                // Clear job to save memory since we've already saved it to History DB

            } else if (job.state === 'failed') {
                // Try to fetch partial report from history db
                const historyItem = await this.historyRepo.getByIdAsync(id);
                if (historyItem && historyItem.report && Object.keys(historyItem.report).length > 0) {
                    report = historyItem.report;
                } else {
                    throw new BadRequestError('Job failed and no partial report was generated. Error: ' + job.error);
                }
                // Clear job to save memory

            } else {
                const saved = await prisma.submission.findUnique({ where: { Id: id }, select: { GradingStatus: true, ReportData: true } });
                if (['graded', 'error'].includes(String(saved?.GradingStatus || '').toLowerCase()) && saved?.ReportData) report = parseValidationConfig(saved.ReportData);
                else throw new BadRequestError('Job is not completed yet. Current state: ' + job.state);
            }
        }

        let isPublished = false;
        let reviewStatus = 'DRAFT';
        let studentFeedback: string | null = null;
        let assignmentId: string | null = null;
        let dueDate: string | null = null;
        let effectiveScore = !report.error && report.totalScore != null && Number.isFinite(Number(report.totalScore)) ? Number(report.totalScore) : null;
        let effectiveFeedback = report.overallFeedback || '';

        try {
            const subRecord = await prisma.submission.findUnique({
                where: { Id: id },
                select: {
                    ReviewStatus: true,
                    StudentFeedback: true,
                    ExamId: true,
                    FinalScore: true,
                    TotalScore: true,
                    InstructorFeedback: true,
                    Exam: { select: { DueDate: true } }
                }
            });
            reviewStatus = subRecord?.ReviewStatus || 'DRAFT';
            isPublished = reviewStatus === 'PUBLISHED';
            studentFeedback = subRecord?.StudentFeedback || null;
            assignmentId = subRecord?.ExamId || null;
            dueDate = subRecord?.Exam?.DueDate ? new Date(subRecord.Exam.DueDate).toISOString() : null;

            if (!report.error && subRecord?.FinalScore !== null && subRecord?.FinalScore !== undefined) {
                effectiveScore = Number(subRecord.FinalScore);
            }

            if (subRecord?.InstructorFeedback) {
                const note = subRecord.InstructorFeedback.trim();
                if (note && !effectiveFeedback.includes(note)) {
                    effectiveFeedback = `${effectiveFeedback}\n\n---\n**Ghi chú đối soát & Nhận xét:**\n${note}`.trim();
                }
            }
        } catch (e) { }

        const visibleReport = req.user?.role?.toUpperCase() === 'STUDENT' ? studentReportView(report) : report;
        this.ok(res, {
            submissionId: id,
            assignmentId,
            dueDate,
            score: effectiveScore,
            maxScore: report.maxPossibleScore ?? null,
            gradingError: report.error || report.lastGradingError || null,
            executionSummary: report.executionSummary || null,
            consoleVerification: visibleReport.consoleVerification || null,
            compilationSummary: visibleReport.compilationSummary || null,
            gradingLogs: req.user?.role?.toUpperCase() === 'STUDENT' ? [] : visibleReport.lastGradingError ? visibleReport.lastGradingLogs || [] : visibleReport.gradingLogs || [],
            rules: visibleReport.passedRules || [],
            failedRules: visibleReport.failedRules || [],
            manualReviewNotes: report.manualReviewNotes || [],
            overallFeedback: effectiveFeedback,
            isPublished,
            reviewStatus,
            studentFeedback
        }, 'Result fetched successfully');
    };

    updateResult = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await this.assertSubmissionAccess(id, req.user, false);
        const { score, rules, failedRules, overallFeedback, ruleScores } = req.body || {};

        const historyItem = await this.historyRepo.getByIdAsync(id);
        if (historyItem) {
            const currentReport = historyItem.report || {};
            let updatedPassedRules = rules || (currentReport.passedRules ? [...currentReport.passedRules] : []);
            let updatedFailedRules = failedRules || (currentReport.failedRules ? [...currentReport.failedRules] : []);

            if (Array.isArray(ruleScores) && ruleScores.length > 0) {
                const scoreMap = new Map<string, any>();
                for (const rs of ruleScores) {
                    const key = rs.ruleId || rs.id;
                    if (key) scoreMap.set(String(key), rs);
                }
                const applyScores = (r: any) => {
                    const key = String(r.ruleId || r.id || '');
                    const match = scoreMap.get(key);
                    if (match) {
                        return {
                            ...r,
                            earnedScore: match.earnedScore !== undefined ? match.earnedScore : (match.score !== undefined ? match.score : r.earnedScore),
                            ...(match.score !== undefined ? { score: match.score } : {}),
                            ...(match.lecturerNote !== undefined ? { lecturerNote: match.lecturerNote } : {}),
                            ...(match.feedback !== undefined ? { feedback: match.feedback } : {}),
                        };
                    }
                    return r;
                };
                updatedPassedRules = updatedPassedRules.map(applyScores);
                updatedFailedRules = updatedFailedRules.map(applyScores);
            }

            const updatedReport = {
                ...currentReport,
                totalScore: score !== undefined ? score : (currentReport.totalScore ?? historyItem.score),
                passedRules: updatedPassedRules,
                failedRules: updatedFailedRules,
                overallFeedback: overallFeedback !== undefined ? overallFeedback : currentReport.overallFeedback,
            };
            await this.historyRepo.saveAsync({
                ...historyItem,
                score: score !== undefined ? score : historyItem.score,
                report: updatedReport,
            });
        } else {
            await prisma.submission.update({
                where: { Id: id },
                data: {
                    ...(score !== undefined ? { FinalScore: score, RawScore: score } : {})
                }
            });
        }

        memoryCache.invalidatePrefix(`sub_detail_${id}_`);
        memoryCache.invalidatePrefix('subs_list_');
        memoryCache.invalidatePrefix('subs_recent_');
        memoryCache.invalidatePrefix('student_dash_');
        this.ok(res, { success: true }, 'Result updated successfully');
    };

    publish = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await this.assertSubmissionAccess(id, req.user, false);
        const { score, rules, failedRules, overallFeedback, ruleScores } = req.body || {};

        const savedSubmission = await prisma.submission.findUnique({
            where: { Id: id }, select: { ReportData: true, GradingStatus: true }
        });
        const savedReport = parseValidationConfig(savedSubmission?.ReportData);
        if (savedReport.error || ['processing', 'pending', 'queued'].includes(String(savedSubmission?.GradingStatus || '').toLowerCase())) {
            throw new BadRequestError('Lượt chấm chưa hoàn tất. Vui lòng kiểm tra lỗi và chấm lại trước khi công bố điểm.');
        }

        if (rules || failedRules || score !== undefined || overallFeedback !== undefined || ruleScores) {
            const historyItem = await this.historyRepo.getByIdAsync(id);
            if (historyItem) {
                const currentReport = historyItem.report || {};
                let updatedPassedRules = rules || (currentReport.passedRules ? [...currentReport.passedRules] : []);
                let updatedFailedRules = failedRules || (currentReport.failedRules ? [...currentReport.failedRules] : []);

                if (Array.isArray(ruleScores) && ruleScores.length > 0) {
                    const scoreMap = new Map<string, any>();
                    for (const rs of ruleScores) {
                        const key = rs.ruleId || rs.id;
                        if (key) scoreMap.set(String(key), rs);
                    }
                    const applyScores = (r: any) => {
                        const key = String(r.ruleId || r.id || '');
                        const match = scoreMap.get(key);
                        if (match) {
                            return {
                                ...r,
                                earnedScore: match.earnedScore !== undefined ? match.earnedScore : (match.score !== undefined ? match.score : r.earnedScore),
                                ...(match.score !== undefined ? { score: match.score } : {}),
                                ...(match.lecturerNote !== undefined ? { lecturerNote: match.lecturerNote } : {}),
                                ...(match.feedback !== undefined ? { feedback: match.feedback } : {}),
                            };
                        }
                        return r;
                    };
                    updatedPassedRules = updatedPassedRules.map(applyScores);
                    updatedFailedRules = updatedFailedRules.map(applyScores);
                }

                const updatedReport = {
                    ...currentReport,
                    totalScore: score !== undefined ? score : (currentReport.totalScore ?? historyItem.score),
                    passedRules: updatedPassedRules,
                    failedRules: updatedFailedRules,
                    overallFeedback: overallFeedback !== undefined ? overallFeedback : currentReport.overallFeedback,
                };
                await this.historyRepo.saveAsync({
                    ...historyItem,
                    score: score !== undefined ? score : historyItem.score,
                    report: updatedReport,
                });
            }
        }

        const submission = await prisma.submission.update({
            where: { Id: id },
            data: {
                ReviewStatus: 'PUBLISHED',
                ...(score !== undefined ? { FinalScore: score, RawScore: score } : {})
            },
            select: { Id: true, StudentId: true, Exam: { select: { Title: true, Id: true } } }
        });

        if (submission.StudentId) {
            try {
                const title = submission.Exam?.Title ?? 'bài nộp';
                const notif = await prisma.notification.create({
                    data: {
                        Title: `Đã có điểm: ${title}`,
                        Message: `Giảng viên đã công bố điểm cho bài "${title}". Vào mục Kết quả để xem điểm và nhận xét.`,
                        Type: 'GRADE_PUBLISHED',
                        CreatedAt: new Date(),
                        ReferenceId: submission.Id,
                        ReferenceType: 'SUBMISSION',
                        CreatedBy: (req as any).user?.id,
                    }
                });
                await prisma.notificationRecipient.create({
                    data: { NotificationId: notif.Id, UserId: submission.StudentId, IsRead: false }
                });
                publishNotification([submission.StudentId], notif)
            } catch (notifErr) {
                console.error('Failed to create grade-published notification:', notifErr);
            }
        }

        memoryCache.invalidatePrefix(`sub_detail_${id}_`);
        memoryCache.invalidatePrefix('subs_list_');
        memoryCache.invalidatePrefix('subs_recent_');
        memoryCache.invalidatePrefix('student_dash_');
        this.ok(res, { success: true, isPublished: true, reviewStatus: 'PUBLISHED' }, 'Đã công bố kết quả cho học sinh thành công!');
    };

    unpublish = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        await this.assertSubmissionAccess(id, req.user, false);
        try {
            await prisma.submission.update({
                where: { Id: id },
                data: { ReviewStatus: 'DRAFT' }
            });
        } catch (e) { }
        memoryCache.invalidatePrefix(`sub_detail_${id}_`);
        memoryCache.invalidatePrefix('subs_list_');
        memoryCache.invalidatePrefix('subs_recent_');
        memoryCache.invalidatePrefix('student_dash_');
        this.ok(res, { success: true, isPublished: false, reviewStatus: 'DRAFT' }, 'Đã chuyển kết quả về trạng thái nháp.');
    };

    getHistory = async (req: Request, res: Response) => {
        try {
            const assignmentId = req.query.assignmentId as string | undefined;
            const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
            const search = req.query.search as string | undefined;
            const statusFilter = req.query.status as string | undefined;
            const scoreRange = req.query.scoreRange as string | undefined;
            const sortOrder = req.query.sort as string | undefined;
            const classIdFilter = req.query.classId as string | undefined;

            if (!assignmentId) throw new BadRequestError('Assignment ID is required');

            await assertAssignmentAccess(assignmentId, req.user!, false);
            const classScope = req.user?.role?.toUpperCase() === 'LECTURER' ? { InstructorClass: { some: { UserId: req.user.id } } } : {};
            // Fetch all classes linked to this assignment
            const examClasses = await prisma.examClass.findMany({
                where: { ExamId: assignmentId, Class: classScope },
                include: { Class: true }
            });
            const classesList = examClasses
                .map(ec => ec.Class)
                .filter(Boolean)
                .map(c => ({ id: c.Id, className: c.ClassCode, classCode: c.ClassCode }));

            const classDueDateMap = new Map(examClasses.map(ec => [ec.ClassId, ec.DueDate]));

            // Fetch all students enrolled in the classes of this assignment
            const allStudentClasses = await prisma.studentClass.findMany({
                where: {
                    Class: {
                        ...classScope,
                        ExamClass: {
                            some: {
                                ExamId: assignmentId
                            }
                        }
                    },
                    User: search ? {
                        OR: [
                            { FullName: { contains: search } },
                            { StudentCode: { contains: search } }
                        ]
                    } : undefined
                },
                include: {
                    User: true,
                    Class: true
                }
            });

            // Fetch latest submissions for these students
            const studentIds = allStudentClasses.map(sc => sc.UserId);
            const submissions = await prisma.submission.findMany({
                where: {
                    ExamId: assignmentId,
                    StudentId: { in: studentIds },
                    IsLatest: true
                }
            });

            // Fetch overrides
            const overrides = await prisma.submissionOverride.findMany({
                where: {
                    ExamId: assignmentId,
                    StudentId: { in: studentIds }
                }
            });
            const overrideMap = new Map(overrides.map(o => [o.StudentId, o]));

            const assignment = await prisma.exam.findUnique({
                where: { Id: assignmentId },
                select: {
                    Title: true,
                    TotalPoints: true,
                    DueDate: true,
                    LatePenaltyType: true,
                    LatePenaltyValue: true,
                    MaxLatePenalty: true,
                    AllowLateSubmission: true,
                }
            });

            const maxScore = assignment?.TotalPoints ? Number(assignment.TotalPoints) : 10;

            let history = allStudentClasses.map(sc => {
                const submission = submissions.find(s => s.StudentId === sc.UserId);

                let status = 'NotSubmitted';
                if (submission) {
                    if (submission.GradingStatus === 'Processing') {
                        status = 'Grading';
                    } else if (submission.GradingStatus === 'Graded' || submission.GradingStatus === 'GRADED') {
                        status = 'Graded';
                    } else {
                        status = 'Submitted';
                    }
                }

                const isGraded = status === 'Graded';
                const effectiveDueDate = (submission?.ClassId ? classDueDateMap.get(submission.ClassId) : null) || assignment?.DueDate || null;
                const submittedAt = submission?.SubmittedAt ? new Date(submission.SubmittedAt) : null;
                const studentOverride = sc.UserId ? overrideMap.get(sc.UserId) : null;

                let rawScore = submission?.RawScore !== null && submission?.RawScore !== undefined
                    ? Number(submission.RawScore)
                    : (submission?.FinalScore !== null && submission?.FinalScore !== undefined ? Number(submission.FinalScore) : 0);
                let latePenaltyAmount = submission?.LatePenaltyAmount !== null && submission?.LatePenaltyAmount !== undefined
                    ? Number(submission.LatePenaltyAmount)
                    : 0;
                let finalScore = submission?.FinalScore !== null && submission?.FinalScore !== undefined
                    ? Number(submission.FinalScore)
                    : rawScore;

                let isLate = false;
                let daysLate = 0;
                let hoursLate = 0;
                let lateReason = '';

                if (submittedAt && effectiveDueDate) {
                    const penaltyCalc = calculateLatePenalty({
                        rawScore,
                        submittedAt,
                        originalDueDate: effectiveDueDate,
                        override: studentOverride ? {
                            extendedDueDate: studentOverride.ExtendedDueDate,
                            penaltyMode: studentOverride.PenaltyMode,
                            customPenaltyRate: studentOverride.CustomPenaltyRate ? Number(studentOverride.CustomPenaltyRate) : null,
                            flatPenaltyAmount: studentOverride.FlatPenaltyAmount ? Number(studentOverride.FlatPenaltyAmount) : null,
                            scoreCap: studentOverride.ScoreCap ? Number(studentOverride.ScoreCap) : null,
                        } : null,
                        examPenaltyType: assignment?.LatePenaltyType,
                        examPenaltyValue: assignment?.LatePenaltyValue ? Number(assignment.LatePenaltyValue) : null,
                        maxLatePenalty: assignment?.MaxLatePenalty ? Number(assignment.MaxLatePenalty) : null,
                    });

                    isLate = penaltyCalc.isLate;
                    daysLate = penaltyCalc.daysLate || 0;
                    hoursLate = penaltyCalc.hoursLate || 0;
                    lateReason = penaltyCalc.lateReason || '';

                    // If already graded and late penalty was not yet deducted in DB, apply auto-sync
                    if (submission && isGraded && penaltyCalc.isLate && penaltyCalc.latePenaltyAmount > 0 && (submission.LatePenaltyAmount === null || Number(submission.LatePenaltyAmount) === 0)) {
                        latePenaltyAmount = penaltyCalc.latePenaltyAmount;
                        finalScore = penaltyCalc.finalScore;

                        // Async self-healing update in DB
                        (async () => {
                            try {
                                const dueFormatted = effectiveDueDate ? new Date(effectiveDueDate).toLocaleString('vi-VN') : 'Hạn nộp';
                                const subFormatted = submittedAt.toLocaleString('vi-VN');
                                const aiLateNote = `\n\n> ⚠️ **Lưu ý đánh giá từ AI (Trừ điểm nộp trễ / Late Submission Penalty)**:\n> - **Lý do bị trừ điểm / Reason**: Bài làm được nộp sau hạn chót (Hạn nộp / Deadline: **${dueFormatted}** ➔ Nộp lúc / Submitted: **${subFormatted}**). Thời gian nộp muộn: **${penaltyCalc.hoursLate} giờ** (tương đương **${penaltyCalc.daysLate} ngày / chu kỳ 24h**).\n> - **Mức phạt áp dụng / Applied Penalty**: ${penaltyCalc.lateReason || `Trừ ${penaltyCalc.latePenaltyAmount} điểm`} (Điểm gốc bài làm / Original: **${penaltyCalc.rawScore}**đ ➔ Điểm cuối cùng công bố / Final: **${penaltyCalc.finalScore}**đ).\n> - **Quy chế học thuật / Academic Policy**: Sinh viên vui lòng chú ý nộp bài đúng hạn để đảm bảo quyền lợi và bảo toàn trọn vẹn điểm số trong các bài tập tiếp theo.`;

                                let reportJson = submission.ReportData;
                                if (reportJson) {
                                    try {
                                        const rep = JSON.parse(reportJson);
                                        rep.totalScore = finalScore;
                                        rep.rawScore = rawScore;
                                        rep.latePenaltyAmount = latePenaltyAmount;
                                        rep.isLate = true;
                                        let currentOverall = rep.overallFeedback || '';
                                        if (currentOverall.includes('Lưu ý đánh giá từ AI (Trừ điểm nộp trễ') || currentOverall.includes('Late Submission Penalty')) {
                                            currentOverall = currentOverall.replace(/> ⚠️ \*\*Lưu ý[^\n]*\n(?:> [^\n]*\n?)*/g, aiLateNote.trim());
                                        } else {
                                            currentOverall = `${currentOverall}${aiLateNote}`;
                                        }
                                        rep.overallFeedback = currentOverall;
                                        reportJson = JSON.stringify(rep);
                                    } catch (e) { }
                                }

                                await prisma.submission.update({
                                    where: { Id: submission.Id },
                                    data: {
                                        RawScore: rawScore,
                                        LatePenaltyAmount: latePenaltyAmount,
                                        FinalScore: finalScore,
                                        ...(reportJson ? { ReportData: reportJson } : {})
                                    }
                                });
                            } catch (e) {
                                console.error('[getHistory] Auto-sync late penalty error:', e);
                            }
                        })();
                    }
                }

                const score = finalScore;
                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

                return {
                    id: submission?.Id || `${sc.UserId}-${assignmentId}`,
                    title: assignment?.Title || 'Assignment',
                    assignmentId,
                    studentId: sc.User.StudentCode || sc.UserId,
                    studentName: sc.User.FullName || 'Chưa cập nhật',
                    studentCode: sc.User.StudentCode || sc.UserId,
                    studentAvatar: sc.User.Avatar,
                    classId: sc.ClassId,
                    className: sc.Class?.ClassCode || 'Chưa phân lớp',
                    classCode: sc.Class?.ClassCode || '',
                    score,
                    rawScore,
                    latePenaltyAmount,
                    isLate,
                    daysLate,
                    hoursLate,
                    lateReason,
                    maxScore,
                    percentage,
                    assessedAt: submission?.SubmittedAt || new Date(0),
                    status
                };
            });

            // Apply Class Filter
            if (classIdFilter && classIdFilter !== 'ALL') {
                history = history.filter(h => h.classId === classIdFilter);
            }

            // Apply Status Filter
            if (statusFilter && statusFilter !== 'ALL') {
                history = history.filter(h => h.status === statusFilter);
            }

            // Apply Score Range Filter
            if (scoreRange && scoreRange !== 'ALL') {
                history = history.filter(h => {
                    if (h.status !== 'Graded') return false;
                    if (scoreRange === '9-10') return h.percentage >= 90;
                    if (scoreRange === '8-9') return h.percentage >= 80 && h.percentage < 90;
                    if (scoreRange === '7-8') return h.percentage >= 70 && h.percentage < 80;
                    if (scoreRange === '5-7') return h.percentage >= 50 && h.percentage < 70;
                    if (scoreRange === '<5') return h.percentage < 50;
                    return true;
                });
            }

            // Apply Sorting
            if (sortOrder === 'score_desc') {
                history.sort((a, b) => b.score - a.score);
            } else if (sortOrder === 'score_asc') {
                history.sort((a, b) => a.score - b.score);
            } else if (sortOrder === 'name_asc') {
                history.sort((a, b) => a.studentName.localeCompare(b.studentName));
            } else {
                // Default sort: latest submission first
                history.sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
            }

            const total = history.length;
            const paginatedHistory = history.slice((page - 1) * limit, page * limit);

            this.ok(res, {
                classes: classesList,
                history: paginatedHistory,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }, 'History fetched successfully');

        } catch (err) {
            res.status(500).json({ success: false, error: 'Failed to fetch history' });
        }
    };

    deleteHistory = async (req: Request, res: Response) => {
        await this.assertSubmissionAccess(req.params.id, req.user, false);
        try {
            const id = req.params.id as string;
            const deleted = await this.historyRepo.deleteAsync(id);
            if (deleted) {
                this.ok(res, null, 'Deleted successfully');
            } else {
                throw new BadRequestError('Not found');
            }
        } catch (err) {
            res.status(500).json({ success: false, error: 'Failed to delete history item' });
        }
    };

    private async buildSourceSnapshot(dir: string, projectType: string): Promise<ProjectSourceSnapshot> {
        const files: { relativePath: string; content: string }[] = [];

        async function walk(currentDir: string) {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    const ignoredDirs = ['bin', 'obj', 'node_modules', '.git', 'vendor', 'dist', 'build', 'out', '.next', '.nuxt', 'venv', 'target', 'Library', 'Temp', 'Logs', 'UserSettings'];
                    if (ignoredDirs.includes(entry.name)) {
                        continue;
                    }
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    const UNIVERSAL_SOURCE_EXTENSIONS = new Set([
                        // Web & JS Ecosystem
                        '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
                        // C# / .NET
                        '.cs', '.csproj', '.razor', '.xaml', '.fs', '.vb',
                        // Java & JVM
                        '.java', '.kt', '.scala', '.groovy', '.pom', '.gradle',
                        // Python
                        '.py', '.ipynb',
                        // C / C++
                        '.c', '.cpp', '.cxx', '.cc', '.h', '.hpp', '.hxx',
                        // Go
                        '.go', '.mod',
                        // Rust
                        '.rs', '.toml',
                        // PHP & Ruby
                        '.php', '.rb', '.erb',
                        // Mobile (Swift, Dart, Kotlin)
                        '.swift', '.dart',
                        // Unity
                        '.unity', '.asmdef', '.prefab', '.asset', '.shader', '.compute', '.hlsl', '.inputactions',
                        // Database
                        '.sql', '.prisma',
                        // Config & Docs
                        '.json', '.xml', '.yml', '.yaml', '.md', '.env', '.ini'
                    ]);

                    const ext = path.extname(entry.name).toLowerCase();
                    if (UNIVERSAL_SOURCE_EXTENSIONS.has(ext) || entry.name.toLowerCase() === 'dockerfile' || entry.name.toLowerCase() === 'makefile') {
                        const content = await fs.readFile(fullPath, 'utf8');
                        files.push({ relativePath: path.relative(dir, fullPath).split(path.sep).join('/'), content });
                    }
                }
            }
        }

        await walk(dir);
        return { files, projectType };
    }

    private async extractNestedZips(dir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.extractNestedZips(fullPath);
            } else if (entry.name.toLowerCase().endsWith('.zip')) {
                const extractPath = path.join(dir, entry.name.slice(0, -4));
                try {
                    await extractZipAsync(fullPath, extractPath);
                    await fs.unlink(fullPath);
                    await this.extractNestedZips(extractPath);
                } catch (e) {
                    console.error(`[SubmissionController] Failed to extract nested zip ${fullPath}:`, e);
                }
            }
        }
    }

    /**
     * GET /api/submissions/health
     * Simple health check for the submissions module.
     */
    healthCheck = (_req: Request, res: Response): void => {
        this.ok(res, { module: 'submissions', status: 'healthy', timestamp: new Date().toISOString() }, 'Healthy');
    };
}



