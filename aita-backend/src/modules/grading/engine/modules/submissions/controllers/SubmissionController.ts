// @ts-nocheck
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
import { globalSubmissionQueue, continuousSubmissionQueue, SubmissionQueue } from '../../../application/queue/SubmissionQueue.js';
import { globalJobManager } from '../../../application/queue/SubmissionJobManager.js';
import { SubmissionHistoryRepository } from '../../../infrastructure/file-system/SubmissionHistoryRepository.js';
import { calculateLatePenalty } from '../../../../../submissions/domain/utils/late-penalty-calculator.js';

import { BaseController } from '../../../../../../shared/presentation/base-controller.js';
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

    /**
     * POST /api/submissions
     * Accepts a .zip file upload, processes and returns the assessment.
     */
    submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.file) {
                throw new BadRequestError('No file uploaded. Please upload a .zip file.');
            }

            if (!req.file.originalname.endsWith('.zip')) {
                throw new BadRequestError('Only .zip files are accepted.');
            }

            const submissionId = uuidv4();

            const assignmentIdFromReq = req.body.assignmentId;

            let publishedAssignment = null;
            if (assignmentIdFromReq) {
                publishedAssignment = await globalAssignmentRepository.getAsync(assignmentIdFromReq);
            }

            if (!publishedAssignment) {
                // Fallback to latest published assignment
                publishedAssignment = await globalAssignmentRepository.getLatestAsync();
            }

            if (!publishedAssignment) {
                throw new BadRequestError('No published assignments found. Please publish an assignment first.');
            }

            const studentName = req.file.originalname.replace('.zip', '');

            const submission: Submission = {
                id: submissionId,
                assignmentId: publishedAssignment.id,
                studentId: studentName,
                sourceCodeUri: req.file.path,
                currentState: SubmissionState.Queued,
                statusHistory: []
            };

            // 1. Unzip the file
            const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
            await this.extractOrCopyFile(req.file.path, extractDir, req.file.originalname);
            await this.extractNestedZips(extractDir);

            // Initialize Job
            globalJobManager.initJob(submissionId);

            this.enqueueSubmissionJob(submissionId, publishedAssignment, submission, extractDir);

            this.ok(res, { submissionId, statusUrl: `/api/submissions/${submissionId}/stream` }, 'Submission accepted for processing');

        } catch (error: any) {
            next(error);
        }
    };

    /**
     * POST /api/submissions/upload-batch
     * Accepts multiple .zip files, processes them in the queue, and returns an array of submissionIds.
     */
    submitBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                throw new BadRequestError('No files uploaded. Please upload .zip files.');
            }

            const assignmentIdFromReq = req.body.assignmentId;

            let publishedAssignment = null;
            if (assignmentIdFromReq) {
                publishedAssignment = await globalAssignmentRepository.getAsync(assignmentIdFromReq);
            } else {
                publishedAssignment = await globalAssignmentRepository.getLatestAsync();
            }

            if (!publishedAssignment) {
                throw new BadRequestError('No published assignments found. Please publish an assignment first.');
            }

            const results = [];

            for (const file of files) {
                if (!file.originalname.endsWith('.zip')) {
                    continue; // Skip non-zip files
                }

                const submissionId = uuidv4();

                // Use original file name without extension as student/submission name for display
                const studentName = file.originalname.replace('.zip', '');

                const submission: Submission = {
                    id: submissionId,
                    assignmentId: publishedAssignment.id,
                    studentId: studentName, // Using filename as student identifier
                    sourceCodeUri: file.path,
                    currentState: SubmissionState.Queued,
                    statusHistory: []
                };

                const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
                await this.extractOrCopyFile(file.path, extractDir, file.originalname);
                await this.extractNestedZips(extractDir);

                globalJobManager.initJob(submissionId);
                this.enqueueSubmissionJob(submissionId, publishedAssignment, submission, extractDir);

                results.push({
                    fileName: file.originalname,
                    studentName: studentName,
                    submissionId: submissionId
                });
            }

            this.ok(res, { jobs: results }, `${results.length} submissions accepted for processing`);

        } catch (error: any) {
            next(error);
        }
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
        try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                const fetchUrl = url.split('?')[0]; // Remove query params
                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const buffer = await response.arrayBuffer();

                // Ensure directory exists
                const dir = path.dirname(destPath);
                await fs.mkdir(dir, { recursive: true });

                await fs.writeFile(destPath, Buffer.from(buffer));
            } else {
                // Local file path
                let localPath = url.split('?')[0];
                if (localPath.startsWith('/')) localPath = localPath.substring(1);
                const sourcePath = path.join(process.cwd(), localPath);

                // Ensure directory exists
                const dir = path.dirname(destPath);
                await fs.mkdir(dir, { recursive: true });

                await fs.copyFile(sourcePath, destPath);
            }
        } catch (err: any) {
            throw new Error(`Failed to download file from ${url}: ${err.message}`);
        }
    }

    public executeGradingForSubmission = async (submissionId: string, queue: SubmissionQueue | null = globalSubmissionQueue): Promise<void> => {
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
                        rules: examDb.ExamSection.flatMap(s => s.RubricRule.map(r => ({
                            id: r.Id,
                            title: r.Title || 'Rule',
                            description: r.Description || '',
                            weight: Number(r.Weight || 1),
                            criteria: r.RubricCriterion.map(c => ({
                                id: c.Id,
                                description: c.Description || '',
                                points: Number(c.Points || 1)
                            }))
                        })))
                    }
                };
            }
        }

        if (!publishedAssignment) {
            throw new BadRequestError('Published assignment not found for this submission');
        }

        const studentCode = submissionRecord.User_Submission_StudentIdToUser?.StudentCode ||
            submissionRecord.User_Submission_StudentIdToUser?.Username ||
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
        const tempZipPath = path.join(process.cwd(), 'temp', 'uploads', `${submissionId}_${originalFileName}`);
        await this.downloadFile(submissionRecord.ZipFileUrl, tempZipPath);

        // 2. Unzip file or copy
        const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
        await this.extractOrCopyFile(tempZipPath, extractDir, originalFileName);
        await this.extractNestedZips(extractDir);

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

        globalJobManager.clearJob(submissionId);
        globalJobManager.initJob(submissionId);

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
    public enqueueContinuousGrading = (submissionId: string): Promise<void> => {
        globalJobManager.initJob(submissionId);

        const reserve = prisma.submission
            .update({ where: { Id: submissionId }, data: { GradingStatus: 'Processing' } })
            .catch(err => {
                console.error(`[ContinuousQueue] Could not reserve submission ${submissionId}:`, err);
            });

        return reserve.then(() =>
            continuousSubmissionQueue.enqueue(() => this.executeGradingForSubmission(submissionId, null))
        );
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

            const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
            if (!publishedAssignment) {
                throw new BadRequestError('Published assignment not found');
            }

            // Snapshot: Get all submissions for this exam that have a ZipFileUrl and are not currently processing or graded
            const pendingSubmissions = await prisma.submission.findMany({
                where: {
                    ExamId: assignmentId,
                    OR: [
                        { GradingStatus: { notIn: ['Processing', 'Graded', 'GRADED'] } },
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
                const submissionId = record.Id;
                const studentCode = record.User_Submission_StudentIdToUser?.StudentCode ||
                    record.User_Submission_StudentIdToUser?.Username ||
                    record.StudentId;

                let fileName = 'submission.zip';
                if (record.ZipFileUrl) {
                    try {
                        const urlObj = new URL(record.ZipFileUrl);
                        if (urlObj.searchParams.has('filename')) {
                            fileName = urlObj.searchParams.get('filename')!;
                        } else {
                            fileName = urlObj.pathname.split('/').pop() || fileName;
                        }
                    } catch (e) {
                        fileName = record.ZipFileUrl.split('/').pop()?.split('?')[0] || fileName;
                    }
                }

                try {
                    const tempZipPath = path.join(process.cwd(), 'temp', 'uploads', `${submissionId}_${fileName}`);
                    await this.downloadFile(record.ZipFileUrl!, tempZipPath);

                    const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
                    await this.extractOrCopyFile(tempZipPath, extractDir, fileName);
                    await this.extractNestedZips(extractDir);

                    const engineSubmission: Submission = {
                        id: submissionId,
                        assignmentId: assignmentId,
                        studentId: studentCode!,
                        sourceCodeUri: tempZipPath,
                        currentState: SubmissionState.Queued,
                        statusHistory: []
                    };

                    globalJobManager.initJob(submissionId);
                    this.enqueueSubmissionJob(submissionId, publishedAssignment, engineSubmission, extractDir);

                    results.push({
                        submissionId: submissionId,
                        studentName: studentCode,
                        fileName: fileName
                    });
                } catch (err: any) {
                    console.error(`[SubmissionController] Failed to queue batch submission ${submissionId}:`, err);
                    // Optionally mark as failed in DB here if you want
                }
            }

            // Update all successfully queued submissions to 'Processing'
            if (results.length > 0) {
                const queuedIds = results.map(r => r.submissionId);
                await prisma.submission.updateMany({
                    where: { Id: { in: queuedIds } },
                    data: { GradingStatus: 'Processing' }
                });
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
            if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
                throw new BadRequestError('submissionIds array is required');
            }

            const publishedAssignment = await globalAssignmentRepository.getAsync(assignmentId);
            if (!publishedAssignment) {
                throw new BadRequestError('Published assignment not found');
            }

            // Get submissions by IDs that have a ZipFileUrl
            const pendingSubmissions = await prisma.submission.findMany({
                where: {
                    Id: { in: submissionIds },
                    ExamId: assignmentId,
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
                const submissionId = record.Id;
                const studentCode = record.User_Submission_StudentIdToUser?.StudentCode ||
                    record.User_Submission_StudentIdToUser?.Username ||
                    record.StudentId;

                let fileName = 'submission.zip';
                if (record.ZipFileUrl) {
                    try {
                        const urlObj = new URL(record.ZipFileUrl);
                        if (urlObj.searchParams.has('filename')) {
                            fileName = urlObj.searchParams.get('filename')!;
                        } else {
                            fileName = urlObj.pathname.split('/').pop() || fileName;
                        }
                    } catch (e) {
                        fileName = record.ZipFileUrl.split('/').pop()?.split('?')[0] || fileName;
                    }
                }

                try {
                    const tempZipPath = path.join(process.cwd(), 'temp', 'uploads', `${submissionId}_${fileName}`);
                    await this.downloadFile(record.ZipFileUrl!, tempZipPath);

                    const extractDir = path.join(process.cwd(), 'temp', 'submissions', submissionId);
                    await this.extractOrCopyFile(tempZipPath, extractDir, fileName);
                    await this.extractNestedZips(extractDir);

                    const engineSubmission: Submission = {
                        id: submissionId,
                        assignmentId: assignmentId,
                        studentId: studentCode!,
                        sourceCodeUri: tempZipPath,
                        currentState: SubmissionState.Queued,
                        statusHistory: []
                    };

                    globalJobManager.initJob(submissionId);
                    this.enqueueSubmissionJob(submissionId, publishedAssignment, engineSubmission, extractDir);

                    results.push({
                        submissionId: submissionId,
                        studentName: studentCode,
                        fileName: fileName
                    });
                } catch (err: any) {
                    console.error(`[SubmissionController] Failed to queue selected submission ${submissionId}:`, err);
                }
            }

            if (results.length > 0) {
                const queuedIds = results.map(r => r.submissionId);
                await prisma.submission.updateMany({
                    where: { Id: { in: queuedIds } },
                    data: { GradingStatus: 'Processing' }
                });
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
            const statuses: Record<string, any> = {};

            for (const id of ids) {
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
                }
            }

            this.ok(res, { statuses }, 'Batch status fetched successfully');
        } catch (err) {
            res.status(500).json({ success: false, error: 'Failed to fetch batch status' });
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
            try {
                const checkCancelled = () => {
                    const job = globalJobManager.getJob(submissionId);
                    if (job?.isCancelled) throw new Error('Cancelled by user');
                };

                const evaluationPromise = (async () => {
                    checkCancelled();
                    globalJobManager.updateProgress(submissionId, 5, 'Initialize the execution environment (Sandbox)...');
                    try {
                        const startSandboxPromise = this.sandboxService.startAsync(extractDir, publishedAssignment.metadata?.projectType as any);
                        const startTimeoutPromise = new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('Sandbox initialization timed out (60s). Proceeding to source analysis.')), 60000)
                        );
                        sandboxHandle = await Promise.race([startSandboxPromise, startTimeoutPromise]);
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

                    if (sandboxHandle.isReady && sandboxHandle.baseUrl) {
                        checkCancelled();
                        globalJobManager.updateProgress(submissionId, 10, 'Running Migration / Build DB...');
                        try {
                            await fetch(sandboxHandle.baseUrl);
                        } catch (err) { }
                    }

                    checkCancelled();
                    globalJobManager.updateProgress(submissionId, 15, 'Running Source Analysis (Source Snapshot)...');
                    const sourceSnapshot = await this.buildSourceSnapshot(extractDir, sandboxHandle.projectType);

                    let playwrightEvidence: any[] = [];
                    if (sandboxHandle.isReady && sandboxHandle.baseUrl) {
                        checkCancelled();
                        globalJobManager.updateProgress(submissionId, 25, 'Running AI Vision / UI Tests...');
                        playwrightEvidence = await this.playwrightExecutor.executeAsync(
                            submissionId,
                            extractDir,
                            publishedAssignment,
                            sandboxHandle.baseUrl,
                            sandboxHandle.additionalUrls
                        );
                    }

                    checkCancelled();
                    globalJobManager.updateProgress(submissionId, 40, 'Reading report document (DOCX/PDF)...');
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
                        }
                    } catch (docErr) { }

                    checkCancelled();
                    globalJobManager.updateProgress(submissionId, 50, 'Starting evaluation of criteria...');
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

                    return await this.evaluator.evaluateAsync(
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
                })();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Global evaluation timeout (15 minutes) exceeded')), 900000)
                );

                const report = await Promise.race([evaluationPromise, timeoutPromise]) as any;

                globalJobManager.completeJob(submissionId, report);

                // --- Save to History DB ---
                try {
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

                    globalJobManager.emit(`assignment_event:${publishedAssignment.id}`, {
                        type: 'SUBMISSION_GRADED',
                        assignmentId: publishedAssignment.id,
                        submissionId: submissionId,
                        score: report.totalScore || 0
                    });
                } catch (historyErr) {
                    console.error(`[SubmissionController] Failed to save history for ${submissionId}:`, historyErr);
                }

            } catch (err: any) {
                console.error(`[SubmissionController] Job ${submissionId} failed:`, err);

                if (err.partialReport) {
                    try {
                        await this.historyRepo.saveAsync({
                            id: submissionId,
                            assignmentId: publishedAssignment.id,
                            studentId: submission.studentId,
                            score: err.partialReport.totalScore || 0,
                            maxScore: err.partialReport.maxPossibleScore || 0,
                            assessedAt: new Date().toISOString(),
                            title: publishedAssignment.metadata.title,
                            report: err.partialReport
                        });
                    } catch (historyErr) {
                        console.error(`[SubmissionController] Failed to save partial history for ${submissionId}:`, historyErr);
                    }
                }
                try {
                    await prisma.submission.update({
                        where: { Id: submissionId },
                        data: { GradingStatus: null }
                    });
                } catch (dbErr) {
                    console.error(`[SubmissionController] Failed to reset GradingStatus for ${submissionId}:`, dbErr);
                }

                globalJobManager.failJob(submissionId, err.message || 'Unknown error');
            } finally {
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
        });
    }

    streamProgress = async (req: Request, res: Response) => {
        const id = req.params.id as string;

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
                    const isGraded = ['graded', 'completed'].includes(statusLower) || 
                        ((subRecord.FinalScore !== null || subRecord.TotalScore !== null) && statusLower !== 'processing');

                    if (isGraded) {
                        const scoreVal = Number(subRecord.FinalScore ?? subRecord.TotalScore ?? subRecord.RawScore ?? 0);
                        res.write(`data: ${JSON.stringify({
                            id,
                            state: 'completed',
                            progressPercent: 100,
                            currentTask: 'Hoàn tất chấm điểm',
                            result: { totalScore: scoreVal }
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
                        await this.executeGradingForSubmission(id).catch(() => { });
                        job = globalJobManager.getJob(id);
                    }
                }
            } catch (e) { }
        }

        if (job) {
            res.write(`data: ${JSON.stringify(job)}\n\n`);
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
                res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
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
        const job = globalJobManager.getJob(id);

        if (!job) {
            try {
                await prisma.submission.update({
                    where: { Id: id },
                    data: { GradingStatus: null }
                });
            } catch (e) { }
            this.ok(res, { success: true }, 'Job not found in memory. Database state has been force reset.');
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
        if (!Array.isArray(ids)) {
            throw new BadRequestError('Missing or invalid ids array');
        }

        let cancelledCount = 0;
        for (const id of ids) {
            const job = globalJobManager.getJob(id);
            if (job && job.state !== 'completed') {
                globalJobManager.cancelJob(id);
                cancelledCount++;
            }
        }

        this.ok(res, { success: true, cancelledCount }, `Requested cancellation for ${cancelledCount} jobs.`);
    };

    getResult = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const job = globalJobManager.getJob(id);

        let report: any = null;

        if (!job) {
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
                globalJobManager.clearJob(id);
            } else if (job.state === 'failed') {
                // Try to fetch partial report from history db
                const historyItem = await this.historyRepo.getByIdAsync(id);
                if (historyItem && historyItem.report && Object.keys(historyItem.report).length > 0) {
                    report = historyItem.report;
                } else {
                    throw new BadRequestError('Job failed and no partial report was generated. Error: ' + job.error);
                }
                // Clear job to save memory
                globalJobManager.clearJob(id);
            } else {
                throw new BadRequestError('Job is not completed yet. Current state: ' + job.state);
            }
        }

        let isPublished = false;
        let reviewStatus = 'DRAFT';
        let studentFeedback: string | null = null;
        let assignmentId: string | null = null;
        let dueDate: string | null = null;
        let effectiveScore = report.totalScore !== undefined ? report.totalScore : 0;
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

            if (subRecord?.FinalScore !== null && subRecord?.FinalScore !== undefined) {
                effectiveScore = Number(subRecord.FinalScore);
            }

            if (subRecord?.InstructorFeedback) {
                const note = subRecord.InstructorFeedback.trim();
                if (note && !effectiveFeedback.includes(note)) {
                    effectiveFeedback = `${effectiveFeedback}\n\n---\n**Ghi chú đối soát & Nhận xét:**\n${note}`.trim();
                }
            }
        } catch (e) { }

        this.ok(res, {
            submissionId: id,
            assignmentId,
            dueDate,
            score: effectiveScore,
            maxScore: report.maxPossibleScore || 0,
            rules: report.passedRules || [],
            failedRules: report.failedRules || [],
            manualReviewNotes: report.manualReviewNotes || [],
            overallFeedback: effectiveFeedback,
            isPublished,
            reviewStatus,
            studentFeedback
        }, 'Result fetched successfully');
    };

    updateResult = async (req: Request, res: Response) => {
        const id = req.params.id as string;
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

        this.ok(res, { success: true }, 'Result updated successfully');
    };

    publish = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const { score, rules, failedRules, overallFeedback, ruleScores } = req.body || {};

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
                        ReferenceId: submission.Id,
                        ReferenceType: 'SUBMISSION',
                        CreatedBy: (req as any).user?.id,
                    }
                });
                await prisma.notificationRecipient.create({
                    data: { NotificationId: notif.Id, UserId: submission.StudentId, IsRead: false }
                });
            } catch (notifErr) {
                console.error('Failed to create grade-published notification:', notifErr);
            }
        }

        this.ok(res, { success: true, isPublished: true, reviewStatus: 'PUBLISHED' }, 'Đã công bố kết quả cho học sinh thành công!');
    };

    unpublish = async (req: Request, res: Response) => {
        const id = req.params.id as string;
        try {
            await prisma.submission.update({
                where: { Id: id },
                data: { ReviewStatus: 'DRAFT' }
            });
        } catch (e) { }
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

            // Fetch all classes linked to this assignment
            const examClasses = await prisma.examClass.findMany({
                where: { ExamId: assignmentId },
                include: { Class: true }
            });
            const classesList = examClasses
                .map(ec => ec.Class)
                .filter(Boolean)
                .map(c => ({ id: c.Id, className: c.ClassName || c.ClassCode, classCode: c.ClassCode }));

            const classDueDateMap = new Map(examClasses.map(ec => [ec.ClassId, ec.DueDate]));

            // Fetch all students enrolled in the classes of this assignment
            const allStudentClasses = await prisma.studentClass.findMany({
                where: {
                    Class: {
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
                    if (isGraded && penaltyCalc.isLate && penaltyCalc.latePenaltyAmount > 0 && (submission.LatePenaltyAmount === null || Number(submission.LatePenaltyAmount) === 0)) {
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
                    className: sc.Class?.ClassName || sc.Class?.ClassCode || 'Chưa phân lớp',
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
                        files.push({ relativePath: fullPath.replace(dir, ''), content });
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



