// @ts-nocheck
import { Request, Response } from 'express';
import { assignments } from '../data/assignments';
import { AssignmentManagementService } from '../../../assignment/AssignmentManagementService';
import { DocumentExtractor, ExtractedImage } from '../../../assignment/DocumentExtractor';
import { RequirementParserService } from '../../../assignment/RequirementParserService';
import { BlueprintService } from '../../../assignment/BlueprintService';
import { RubricGeneratorService } from '../../../assignment/RubricGeneratorService';
import { TestSuiteGeneratorService } from '../../../assignment/TestSuiteGeneratorService';
import { PublishedAssignmentRepository, globalAssignmentRepository } from '../../../assignment/PublishedAssignmentRepository';
import { GeminiAiProvider } from '../../../infrastructure/ai/GeminiAiProvider';
import { PublishedAssignment } from '../../../core/domain/submission/PublishedAssignment';
import { isSqlGradedRule, findSqlRulesMissingAnswerKey, buildMissingAnswerKeyMessage } from '../../../core/domain/rubric/AnswerKeyGuard';
import { DocumentImage } from '../../../core/contracts/IAiProvider';
import { BadRequestError } from '../../../shared/errors';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as path from 'path';
import { sanitizeCloudinaryPathSegment } from '../../../../../../shared/utils/cloudinary-path.util.js';

import { BaseController } from '../../../../../../shared/presentation/base-controller.js';
import { ApiResponse } from '../../../../../../shared/presentation/api-response.js';
import { AppError } from '../../../../../../shared/application/app.error.js';
import { prisma } from '../../../../../../database/prisma.js';
import { CloudinaryService } from '../../../../../../shared/infrastructure/services/cloudinary.service.js';
import { globalJobManager } from '../../../application/queue/SubmissionJobManager.js';
import { SendAssignmentNotificationUseCase } from '../../../../../../modules/notifications/application/use-cases/send-assignment-notification.use-case.js';
import { NodemailerService } from '../../../../../../shared/infrastructure/email/nodemailer.service.js';

// ─── Server-Side Image Cache ─────────────────────────────────────────
// Stores extracted document images in-memory so they never need to
// round-trip through the frontend. Auto-expires after 30 minutes.
interface CachedImageEntry {
    images: DocumentImage[];
    createdAt: number;
}
const IMAGE_CACHE = new Map<string, CachedImageEntry>();
const IMAGE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanExpiredImageCache(): void {
    const now = Date.now();
    for (const [key, entry] of IMAGE_CACHE.entries()) {
        if (now - entry.createdAt > IMAGE_CACHE_TTL_MS) {
            IMAGE_CACHE.delete(key);
        }
    }
}

export function extractSqlSetupScript(rubric: any): string | null {
    if (!rubric || !rubric.rules || !Array.isArray(rubric.rules)) return null;
    for (const rule of rubric.rules) {
        if (rule.requiredEvidence && Array.isArray(rule.requiredEvidence)) {
            for (const ev of rule.requiredEvidence) {
                if (ev?.sqlProbe?.setupScript && typeof ev.sqlProbe.setupScript === 'string' && ev.sqlProbe.setupScript.trim().length > 0) {
                    return ev.sqlProbe.setupScript.trim();
                }
            }
        }
    }
    return null;
}

export class AssignmentController extends BaseController {
    private assignmentRepository: PublishedAssignmentRepository;
    private aiProvider: GeminiAiProvider;

    constructor(documentExtractor: DocumentExtractor, artifactStore: any) {
        super();
        this.aiProvider = new GeminiAiProvider();
        this.assignmentRepository = globalAssignmentRepository;
    }

    uploadAssignment = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) throw new BadRequestError('No file');
            // mock impl
            this.ok(res, { id: 'temp' }, 'Assignment uploaded');
        } catch (err) {
            throw new Error('Error upload');
        }
    };

    extractText = async (req: Request, res: Response): Promise<void> => {
        try {
            const { file } = req;
            const { semester, subject } = req.body;
            if (!file) throw new BadRequestError('No file');
            if (!semester || !subject) throw new BadRequestError('Semester and Subject are required');
            const docExt = new DocumentExtractor();
            const extractedDoc = await docExt.extractAsync(file.buffer, file.mimetype);

            // Collect ALL images from all sections for the image cache
            const allImages: DocumentImage[] = [];
            for (const section of extractedDoc.sections) {
                for (const img of section.images) {
                    allImages.push({
                        buffer: img.buffer,
                        contentType: img.contentType,
                        label: img.label,
                        isMockup: img.isMockup,
                    });
                }
            }

            // Cache images server-side if any exist
            let documentImageKey: string | null = null;
            if (allImages.length > 0) {
                documentImageKey = crypto.createHash('sha256')
                    .update(extractedDoc.rawText.substring(0, 500) + allImages.length)
                    .digest('hex')
                    .substring(0, 16);

                cleanExpiredImageCache();
                IMAGE_CACHE.set(documentImageKey, {
                    images: allImages,
                    createdAt: Date.now(),
                });
                console.log(`[AssignmentController] Cached ${allImages.length} document images under key: ${documentImageKey}`);
            }

            // Upload file to Cloudinary directly for Lecturer Assignment Attachment
            let uploadedFileUrl: string | null = null;
            let uploadErrorMessage: string | null = null;
            try {
                // Do NOT use `use_filename` here: it derives the public_id from the raw
                // upload name, so any document titled "... A & B.docx" is rejected with
                // "public_id is invalid". Build a sanitized id ourselves instead.
                const baseName = path.parse(file.originalname).name;
                const uploadOptions = {
                    folder: 'aita/assignments',
                    resource_type: 'raw' as any,
                    public_id: `${sanitizeCloudinaryPathSegment(baseName, 'assignment')}_${Date.now()}`,
                };
                const cloudinaryPromise = CloudinaryService.uploadStream(file.buffer, uploadOptions);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Cloudinary upload timeout')), 8000));
                const cloudinaryRes = await Promise.race([cloudinaryPromise, timeoutPromise]) as any;
                uploadedFileUrl = cloudinaryRes.secure_url;
                console.log(`[AssignmentController] Uploaded assignment document to Cloudinary: ${uploadedFileUrl}`);
            } catch (uploadError: any) {
                // Non-fatal: the extracted text is still useful. But report the reason
                // instead of silently returning uploadedFile: null.
                uploadErrorMessage = uploadError?.message || 'Unknown Cloudinary error';
                console.error(`[AssignmentController] Failed to upload assignment to Cloudinary:`, uploadError);
            }

            this.ok(res, {
                text: extractedDoc,
                documentImageKey,
                uploadedFile: uploadedFileUrl ? {
                    url: uploadedFileUrl,
                    fileName: file.originalname,
                    fileType: file.mimetype
                } : null,
                uploadError: uploadErrorMessage
            }, 'Text extracted');
        } catch (error: any) {
            // Preserve the original failure — a bare `new Error('Error extracting text')`
            // hides the real cause (bad mimetype, corrupt docx, Cloudinary rejection).
            console.error('[AssignmentController] extractText failed:', error);
            throw error instanceof Error ? error : new Error(`Error extracting text: ${String(error)}`);
        }
    };

    generateContent = async (req: Request, res: Response): Promise<void> => {
        try {
            req.setTimeout(300000);
            const { prompt, semester, subject, pageImages } = req.body;
            if (!semester || !subject) throw new BadRequestError('Semester and Subject are required');
            const markdown = await this.aiProvider.generateAssignmentContentAsync(prompt, pageImages);
            this.ok(res, { markdown }, 'Content generated');
        } catch (error: any) {
            console.error('[AssignmentController] Error generating content:', error);
            if (error instanceof AppError && error.statusCode !== 429) throw error;
            const rawStatus = error?.statusCode || error?.status || 502;
            const status = rawStatus === 429 ? 503 : rawStatus;
            throw new AppError('AI_GENERATION_FAILED', error?.message || 'Error generating content', status);
        }
    };

    parseRubric = async (req: Request, res: Response): Promise<void> => {
        try {
            req.setTimeout(300000);
            const { content, documentImageKey, subject } = req.body;
            if (!content) throw new BadRequestError('No content');

            const requirementParser = new RequirementParserService(this.aiProvider);
            const rubricGenerator = new RubricGeneratorService(this.aiProvider);

            let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
            if (typeof content === 'object' && content.rawText) {
                contentStr = content.rawText;
            }
            console.log(`[AssignmentController] parseRubric: contentStr length is ${contentStr.length}`);

            // Retrieve cached images if key was provided
            let documentImages: DocumentImage[] | undefined;
            if (documentImageKey && IMAGE_CACHE.has(documentImageKey)) {
                documentImages = IMAGE_CACHE.get(documentImageKey)!.images;
                console.log(`[AssignmentController] parseRubric: Retrieved ${documentImages.length} cached images for key: ${documentImageKey}`);
            }

            const draftBlueprint = await requirementParser.parseRequirementsAsync(contentStr, documentImages, subject);
            const rubric = await rubricGenerator.generateRubricAsync(draftBlueprint);

            this.ok(res, { rubric, blueprint: draftBlueprint }, 'Rubric parsed');
        } catch (error: any) {
            console.error('[AssignmentController] Error parsing rubric:', error);
            if (error instanceof AppError && error.statusCode !== 429) throw error;
            const rawStatus = error?.statusCode || error?.status || 502;
            const status = rawStatus === 429 ? 503 : rawStatus;
            throw new AppError('RUBRIC_PARSING_FAILED', error?.message || 'Error parsing rubric', status);
        }
    };

    parseSqlKey = async (req: Request, res: Response): Promise<void> => {
        try {
            req.setTimeout(300000);
            const { file } = req;
            const { rubricRules } = req.body;
            if (!file) throw new BadRequestError('No file provided');
            if (!rubricRules) throw new BadRequestError('Rubric rules are required');

            const sqlContent = file.buffer.toString('utf-8');
            const rules = typeof rubricRules === 'string' ? JSON.parse(rubricRules) : rubricRules;

            let updatedRules = await this.aiProvider.parseSqlAnswerKeyAsync(sqlContent, rules);

            // Automatically extract and inject setupScript from sqlContent
            const rubricGenerator = new RubricGeneratorService(this.aiProvider);
            updatedRules = rubricGenerator.extractAndInjectSqlSetupScript(updatedRules, sqlContent);

            this.ok(res, { rules: updatedRules }, 'SQL Key parsed');
        } catch (error: any) {
            console.error('[AssignmentController] Error parsing SQL Key:', error);
            if (error instanceof AppError && error.statusCode !== 429) throw error;
            const rawStatus = error?.statusCode || error?.status || 400;
            const status = rawStatus === 429 ? 503 : rawStatus;
            throw new AppError('SQL_KEY_PARSING_FAILED', error?.message || 'Error parsing SQL Key', status);
        }
    };

    parseRequirements = async (req: Request, res: Response): Promise<void> => {
        try {
            req.setTimeout(300000);
            // `subject` is optional: older callers omit it and fall back to keyword scoring.
            const { content, documentImageKey, subject } = req.body;
            if (!content) throw new BadRequestError('No content');
            const requirementParser = new RequirementParserService(this.aiProvider);

            let contentStr = typeof content === 'string' ? content : JSON.stringify(content);
            if (typeof content === 'object' && content.rawText) {
                contentStr = content.rawText;
            }
            console.log(`[AssignmentController] parseRequirements: contentStr length is ${contentStr.length}`);

            // Retrieve cached images if key was provided
            let documentImages: DocumentImage[] | undefined;
            if (documentImageKey && IMAGE_CACHE.has(documentImageKey)) {
                documentImages = IMAGE_CACHE.get(documentImageKey)!.images;
                console.log(`[AssignmentController] parseRequirements: Retrieved ${documentImages.length} cached images for key: ${documentImageKey}`);
            }

            const draftBlueprint = await requirementParser.parseRequirementsAsync(contentStr, documentImages, subject);
            this.ok(res, { blueprint: draftBlueprint }, 'Requirements parsed');
        } catch (error: any) {
            console.error('[AssignmentController] Error parsing requirements:', error);
            if (error instanceof AppError && error.statusCode !== 429) throw error;
            const rawStatus = error?.statusCode || error?.status || 502;
            const status = rawStatus === 429 ? 503 : rawStatus;
            throw new AppError('REQUIREMENT_PARSING_FAILED', error?.message || 'Error parsing requirements', status);
        }
    };

    generateRubric = async (req: Request, res: Response): Promise<void> => {
        try {
            req.setTimeout(300000);
            const { blueprint } = req.body;
            if (!blueprint) throw new BadRequestError('No blueprint');
            const rubricGenerator = new RubricGeneratorService(this.aiProvider);
            const rubric = await rubricGenerator.generateRubricAsync(blueprint);
            this.ok(res, { rubric }, 'Rubric generated');
        } catch (error: any) {
            console.error('[AssignmentController] Error generating rubric:', error);
            if (error instanceof AppError && error.statusCode !== 429) throw error;
            const rawStatus = error?.statusCode || error?.status || 502;
            const status = rawStatus === 429 ? 503 : rawStatus;
            throw new AppError('RUBRIC_GENERATION_FAILED', error?.message || 'Error generating rubric', status);
        }
    };

    publish = async (req: Request, res: Response): Promise<void> => {
        try {
            const { metadata, blueprint, rubric } = req.body;

            // A SqlExecutionProbe rule only has test cases once an answer key has been uploaded
            // and parsed. Publishing without one is silently destructive - see AnswerKeyGuard.
            const sqlRules = (rubric?.rules ?? []).filter(isSqlGradedRule);
            const rulesMissingKey = findSqlRulesMissingAnswerKey(rubric?.rules);
            if (rulesMissingKey.length > 0) {
                throw new BadRequestError(buildMissingAnswerKeyMessage(rulesMissingKey, sqlRules.length));
            }

            const testSuiteGen = new TestSuiteGeneratorService();
            const testSuites = await testSuiteGen.generateTestSuitesAsync(blueprint);

            const publishedAssignmentId = uuidv4();
            const publishedAssignment: PublishedAssignment = {
                id: publishedAssignmentId,
                version: '1.0.0',
                metadata,
                blueprintId: blueprint.id,
                rubric,
                testSuites
            };

            await this.assignmentRepository.saveAsync(publishedAssignment);

            // INTEGRATION WITH AITA CORE
            const { 
                title, 
                description, 
                subject, 
                semesterId, 
                classIds, 
                dueDate, 
                fileUrl, 
                fileName, 
                fileType, 
                examType, 
                assignmentType, 
                category, 
                weightPercentage, 
                gradingStrategy,
                allowLateSubmission,
                latePenaltyType,
                latePenaltyValue,
                maxLatePenalty,
                duplicatePenaltyType,
                duplicatePenaltyValue,
                lateSubmitHours
            } = metadata;
            const selectedGradingStrategy = gradingStrategy || 'CONTINUOUS_QUEUE';
            const resolvedExamType = assignmentType || category || examType || 'Assignment';

            const effectiveAllowLate = allowLateSubmission !== undefined ? Boolean(allowLateSubmission) : true;
            const effectivePenaltyType = latePenaltyType || (effectiveAllowLate ? 'DAILY_POINTS' : 'NONE');
            const effectivePenaltyValue = latePenaltyValue !== undefined && latePenaltyValue !== null ? Number(latePenaltyValue) : (effectivePenaltyType === 'NONE' ? 0 : 2);
            const effectiveMaxPenalty = maxLatePenalty !== undefined && maxLatePenalty !== null ? Number(maxLatePenalty) : null;
            const effectiveDuplicatePenaltyType = duplicatePenaltyType || 'FLAT_POINTS';
            const effectiveDuplicatePenaltyValue = duplicatePenaltyValue !== undefined && duplicatePenaltyValue !== null ? Number(duplicatePenaltyValue) : 5;

            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

            // 1. Resolve subject code or ID to SubjectId safely
            let subjectRecord: any = null;
            if (subject && typeof subject === 'string') {
                const isSubjectUuid = uuidRegex.test(subject);
                subjectRecord = await prisma.subject.findFirst({
                    where: isSubjectUuid
                        ? { OR: [{ Id: subject }, { SubjectCode: subject }] }
                        : { SubjectCode: subject }
                });
            }

            // Weight validation
            if (weightPercentage) {
                const existingExams = await prisma.exam.findMany({
                    where: { SubjectId: subjectRecord?.Id || null }
                });
                const currentTotalWeight = existingExams.reduce((sum, exam) => {
                    let w = 0;
                    if ((exam as any).WeightPercentage) w = Number((exam as any).WeightPercentage);
                    else if (exam.AiGeneratedContent) {
                        try {
                            const parsed = JSON.parse(exam.AiGeneratedContent);
                            if (parsed.weightPercentage) w = Number(parsed.weightPercentage);
                        } catch (e) { }
                    }
                    return sum + w;
                }, 0);
                if (currentTotalWeight + Number(weightPercentage) > 70) {
                    throw new BadRequestError(`Tổng tỷ trọng điểm không được vượt quá 70%. Tổng hiện tại là ${currentTotalWeight}%.`);
                }
            }

            const examId = publishedAssignmentId; // Keep 1:1 mapping
            const totalPoints = rubric?.rules ? rubric.rules.reduce((sum: number, r: any) => sum + (Number(r.weight) || 0), 0) : 10;
            if (rubric?.rules && Array.isArray(rubric.rules) && rubric.rules.length > 0) {
                if (Math.abs(totalPoints - 10) > 0.01) {
                    const msg = `Tổng điểm của các tiêu chí Rubric phải bằng chính xác 10.0 điểm. Hiện tại: ${totalPoints.toFixed(2)} điểm.`;
                    return res.status(400).json({ success: false, statusCode: 400, Message: msg, error: msg });
                }
            }

            let parsedDueDate: Date | undefined;
            if (dueDate) {
                const d = new Date(dueDate);
                if (!isNaN(d.getTime())) parsedDueDate = d;
            }

            const validClassIds = Array.isArray(classIds) ? classIds.filter((c: any) => typeof c === 'string' && uuidRegex.test(c)) : [];
            const creatorId = (req.user?.id && uuidRegex.test(req.user.id)) ? req.user.id : null;

            await prisma.exam.create({
                data: {
                    Id: examId,
                    Title: title || 'AI Assignment',
                    Description: description || '',
                    SubjectId: subjectRecord?.Id || null,
                    ExamType: resolvedExamType,
                    Status: 'Published',
                    TotalPoints: totalPoints,
                    CreatedBy: creatorId,
                    StartDate: new Date(),
                    DueDate: parsedDueDate,
                    GradingStrategy: selectedGradingStrategy,
                    AllowLateSubmission: effectiveAllowLate,
                    LatePenaltyType: effectivePenaltyType,
                    LatePenaltyValue: effectivePenaltyValue,
                    MaxLatePenalty: effectiveMaxPenalty,
                    AiGeneratedContent: JSON.stringify({
                        blueprintId: blueprint?.id,
                        weightPercentage: weightPercentage ? Number(weightPercentage) : 0,
                        duplicatePenaltyType: effectiveDuplicatePenaltyType,
                        duplicatePenaltyValue: effectiveDuplicatePenaltyValue,
                        lateSubmitHours: lateSubmitHours ? Number(lateSubmitHours) : null
                    }),
                    ...(validClassIds.length > 0 ? {
                        ExamClass: {
                            create: validClassIds.map((cId: string) => ({
                                ClassId: cId,
                                DueDate: parsedDueDate
                            }))
                        }
                    } : {})
                }
            });

            // 3. Create ExamAttachment if a file was uploaded
            if (fileUrl) {
                await prisma.examAttachment.create({
                    data: {
                        ExamId: examId,
                        FileUrl: fileUrl,
                        FileName: fileName || 'Assignment Document',
                        FileType: fileType || 'application/octet-stream'
                    }
                });
            }

            // 4. Send Notifications (In-App & Email)
            try {
                const sendNotificationUseCase = new SendAssignmentNotificationUseCase(new NodemailerService());
                sendNotificationUseCase.execute({
                    examId: examId,
                    title: title || 'AI Assignment',
                    type: 'Assignment',
                    classIds: validClassIds,
                    subjectId: subjectRecord?.Id,
                    dueDate: parsedDueDate,
                    createdBy: creatorId || 'system'
                }).catch((err) => console.error("Error sending assignment notification:", err));
            } catch (notifErr) {
                console.error("Failed to initialize assignment notification:", notifErr);
            }

            this.created(res, publishedAssignment, 'Assignment published successfully');
        } catch (error: any) {
            console.error("Publish Error:", error);
            const statusCode = error.statusCode || 500;
            const message = error.message || "Error publishing assignment";
            res.status(statusCode).json({ success: false, statusCode, Message: message, error: message });
        }
    };

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            const assignments = await this.assignmentRepository.getAllAsync();

            if (!assignments || assignments.length === 0) {
                this.ok(res, [], 'Assignments fetched');
                return;
            }

            const examIds = assignments.map(a => a.id);

            // Get Exam dates and related class/submission data
            const exams = await prisma.exam.findMany({
                where: { Id: { in: examIds } },
                select: {
                    Id: true,
                    StartDate: true,
                    DueDate: true,
                    GradingStrategy: true,
                    ExamClass: {
                        select: {
                            ClassId: true,
                            Class: {
                                select: {
                                    Id: true,
                                    ClassCode: true,
                                    StudentClass: {
                                        select: { UserId: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Fetch all latest submissions for these exams
            const submissions = await prisma.submission.findMany({
                where: {
                    ExamId: { in: examIds },
                    IsLatest: true
                },
                select: {
                    ExamId: true,
                    StudentId: true
                }
            });

            // Build a map for quick lookup
            const statsMap = new Map();
            exams.forEach(exam => {
                const enrolledStudentIds = new Set<string>();
                exam.ExamClass.forEach(ec => {
                    ec.Class?.StudentClass?.forEach(sc => {
                        if (sc.UserId) enrolledStudentIds.add(sc.UserId);
                    });
                });

                const totalStudents = enrolledStudentIds.size;
                const examSubmissions = submissions.filter(s => s.ExamId === exam.Id);
                const submittedStudentIds = new Set<string>();
                examSubmissions.forEach(s => {
                    if (s.StudentId && (enrolledStudentIds.size === 0 || enrolledStudentIds.has(s.StudentId))) {
                        submittedStudentIds.add(s.StudentId);
                    }
                });

                const submittedCount = submittedStudentIds.size;

                const classIds = exam.ExamClass.map(ec => ec.ClassId).filter(Boolean);

                statsMap.set(exam.Id, {
                    createdAt: exam.StartDate,
                    dueDate: exam.DueDate,
                    gradingStrategy: (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE',
                    submitted: submittedCount,
                    totalStudents: totalStudents,
                    classIds: classIds,
                    classId: classIds.length > 0 ? classIds[0] : null
                });
            });

            // Attach stats to assignment response
            const enhancedAssignments = assignments.map(a => {
                const stats = statsMap.get(a.id) || {
                    createdAt: new Date(),
                    dueDate: null,
                    gradingStrategy: 'CONTINUOUS_QUEUE',
                    submitted: 0,
                    totalStudents: 0
                };

                const percentage = stats.totalStudents > 0
                    ? Math.round((stats.submitted / stats.totalStudents) * 100)
                    : 0;

                return {
                    ...a,
                    classId: stats.classId,
                    classIds: stats.classIds,
                    stats: {
                        ...stats,
                        percentage
                    }
                };
            });

            this.ok(res, enhancedAssignments, 'Assignments fetched');
        } catch (error) {
            console.error("GetAll Error:", error);
            throw new Error('Error fetching assignments');
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            let assignment = await this.assignmentRepository.getAsync(id);

            // Fetch detailed stats / metadata for this assignment from Exam table
            const exam = await prisma.exam.findUnique({
                where: { Id: id },
                select: {
                    Id: true,
                    Title: true,
                    Description: true,
                    TotalPoints: true,
                    StartDate: true,
                    DueDate: true,
                    GradingStrategy: true,
                    AllowLateSubmission: true,
                    LatePenaltyType: true,
                    LatePenaltyValue: true,
                    MaxLatePenalty: true,
                    AiGeneratedContent: true,
                    Subject: {
                        select: {
                            SubjectCode: true,
                            SubjectName: true,
                        }
                    },
                    ExamClass: {
                        select: {
                            Class: {
                                select: {
                                    StudentClass: {
                                        select: { UserId: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!assignment && !exam) {
                res.status(404).json(ApiResponse.error('Assignment not found', 404));
                return;
            }

            // Fallback: If not in publishedAssignment, synthesize assignment from exam record
            if (!assignment && exam) {
                let rubricData: any = null;
                let contentStr = '';
                if (exam.AiGeneratedContent) {
                    try {
                        const parsed = JSON.parse(exam.AiGeneratedContent);
                        rubricData = parsed.rubric || parsed;
                        contentStr = parsed.content || parsed.description || '';
                    } catch (e) {}
                }
                assignment = {
                    id: exam.Id,
                    version: '1',
                    blueprintId: '',
                    metadata: {
                        title: exam.Title,
                        description: exam.Description,
                        content: contentStr,
                        subject: exam.Subject?.SubjectCode || exam.Subject?.SubjectName || '',
                        totalPoints: exam.TotalPoints,
                        dueDate: exam.DueDate,
                        allowLateSubmission: exam.AllowLateSubmission,
                        latePenaltyType: exam.LatePenaltyType,
                        latePenaltyValue: exam.LatePenaltyValue,
                        maxLatePenalty: exam.MaxLatePenalty,
                        gradingStrategy: (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE',
                    },
                    rubric: rubricData,
                    stats: {
                        dueDate: exam.DueDate,
                        createdAt: exam.StartDate || new Date(),
                        gradingStrategy: (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE',
                    }
                } as any;
            }

            let stats = {
                totalStudents: 0,
                submitted: 0,
                notSubmitted: 0,
                grading: 0,
                averageScore: 0,
                submittedPercentage: 0,
                notSubmittedPercentage: 0,
                gradingPercentage: 0,
                createdAt: new Date(),
                dueDate: null as any,
                gradingStrategy: 'CONTINUOUS_QUEUE'
            };

            if (exam) {
                const enrolledStudentIds = new Set<string>();
                exam.ExamClass.forEach(ec => {
                    ec.Class?.StudentClass?.forEach(sc => {
                        if (sc.UserId) enrolledStudentIds.add(sc.UserId);
                    });
                });

                const totalStudents = enrolledStudentIds.size;

                const latestSubmissions = await prisma.submission.findMany({
                    where: {
                        ExamId: id,
                        IsLatest: true,
                        ...(enrolledStudentIds.size > 0 ? { StudentId: { in: Array.from(enrolledStudentIds) } } : {})
                    },
                    select: {
                        StudentId: true,
                        TotalScore: true,
                        FinalScore: true,
                        GradingStatus: true
                    }
                });

                const submittedStudentIds = new Set(latestSubmissions.map(s => s.StudentId).filter(Boolean));
                const submittedCount = submittedStudentIds.size;
                const notSubmittedCount = Math.max(0, totalStudents - submittedCount);

                const gradingCount = latestSubmissions.filter(s => s.GradingStatus === 'Processing').length;

                const gradedSubmissions = latestSubmissions.filter(s =>
                    (s.GradingStatus === 'Graded' || s.GradingStatus === 'GRADED') &&
                    (s.FinalScore !== null || s.TotalScore !== null)
                );
                let averageScore = 0;
                if (gradedSubmissions.length > 0) {
                    const totalScore = gradedSubmissions.reduce((sum, s) => {
                        const scoreVal = s.FinalScore !== null && s.FinalScore !== undefined ? Number(s.FinalScore) : Number(s.TotalScore || 0);
                        return sum + scoreVal;
                    }, 0);
                    averageScore = totalScore / gradedSubmissions.length;
                }

                stats = {
                    totalStudents,
                    submitted: submittedCount,
                    notSubmitted: notSubmittedCount,
                    grading: gradingCount,
                    averageScore: Number(averageScore.toFixed(1)),
                    submittedPercentage: totalStudents > 0 ? Number(((submittedCount / totalStudents) * 100).toFixed(1)) : 0,
                    notSubmittedPercentage: totalStudents > 0 ? Number(((notSubmittedCount / totalStudents) * 100).toFixed(1)) : 0,
                    gradingPercentage: submittedCount > 0 ? Number(((gradingCount / submittedCount) * 100).toFixed(1)) : 0,
                    createdAt: exam.StartDate as any,
                    dueDate: exam.DueDate as any,
                    gradingStrategy: (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE'
                };
            }

            const sqlSetupScript = extractSqlSetupScript(assignment.rubric);

            const allowLate = exam?.AllowLateSubmission ?? assignment.metadata?.allowLateSubmission ?? true;
            const lateType = (exam?.LatePenaltyType && exam.LatePenaltyType !== 'NONE') ? exam.LatePenaltyType : (assignment.metadata?.latePenaltyType || 'DAILY_POINTS');
            const lateVal = exam?.LatePenaltyValue !== undefined && exam?.LatePenaltyValue !== null ? Number(exam.LatePenaltyValue) : (assignment.metadata?.latePenaltyValue ?? 2);
            const maxLate = exam?.MaxLatePenalty !== undefined && exam?.MaxLatePenalty !== null ? Number(exam.MaxLatePenalty) : (assignment.metadata?.maxLatePenalty ?? null);

            let aiContentParsed: any = {};
            if (exam?.AiGeneratedContent) {
                try {
                    aiContentParsed = JSON.parse(exam.AiGeneratedContent);
                } catch (e) { }
            }
            const duplicatePenaltyType = aiContentParsed.duplicatePenaltyType || assignment.metadata?.duplicatePenaltyType || 'FLAT_POINTS';
            const duplicatePenaltyValue = aiContentParsed.duplicatePenaltyValue !== undefined && aiContentParsed.duplicatePenaltyValue !== null ? Number(aiContentParsed.duplicatePenaltyValue) : (assignment.metadata?.duplicatePenaltyValue ?? 5);

            const enhancedAssignment = {
                ...assignment,
                sqlSetupScript,
                allowLateSubmission: allowLate,
                latePenaltyType: lateType,
                latePenaltyValue: lateVal,
                maxLatePenalty: maxLate,
                duplicatePenaltyType,
                duplicatePenaltyValue,
                metadata: {
                    ...assignment.metadata,
                    gradingStrategy: (stats as any)?.gradingStrategy || assignment.metadata?.gradingStrategy || 'CONTINUOUS_QUEUE',
                    allowLateSubmission: allowLate,
                    latePenaltyType: lateType,
                    latePenaltyValue: lateVal,
                    maxLatePenalty: maxLate,
                    duplicatePenaltyType,
                    duplicatePenaltyValue
                },
                stats
            };

            this.ok(res, enhancedAssignment, 'Assignment fetched');
        } catch (error) {
            console.error('Error fetching assignment in getById:', error);
            res.status(500).json(ApiResponse.error((error as any)?.message || 'Error fetching assignment', 500));
        }
    };

    downloadSqlKey = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            const assignment = await this.assignmentRepository.getAsync(id);
            if (!assignment) {
                throw new BadRequestError('Assignment not found');
            }
            const sqlSetupScript = extractSqlSetupScript(assignment.rubric);
            if (!sqlSetupScript) {
                throw new BadRequestError('No SQL Answer Key & Setup Script found for this assignment');
            }

            const safeTitle = (assignment.metadata?.title || 'DBI_Assignment').replace(/[^a-zA-Z0-9_]/g, '_');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_Setup_Script.sql"`);
            res.send(sqlSetupScript);
        } catch (error: any) {
            console.error('[AssignmentController] Error downloading SQL Key:', error);
            res.status(400).json({ error: error.message || 'Error downloading SQL Key' });
        }
    };

    /**
     * POST /api/grading/assignments/:id/update-answer-key
     * Upload a new Answer Key file for an already-published assignment.
     * Parses the SQL content, generates test cases via AI, and updates the rubric in DB.
     */
    updateAnswerKey = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            const { file } = req;
            if (!file) throw new BadRequestError('No file provided');

            const assignment = await this.assignmentRepository.getAsync(id);
            if (!assignment) {
                throw new BadRequestError('Assignment not found');
            }

            const sqlContent = file.buffer.toString('utf-8');
            const rules = assignment.rubric?.rules || [];

            console.log(`[AssignmentController] updateAnswerKey: Parsing SQL answer key for assignment ${id} (${rules.length} rules)`);

            // 1. AI parses the SQL answer key and maps queries to rubric rules
            let updatedRules = await this.aiProvider.parseSqlAnswerKeyAsync(sqlContent, rules);

            // 2. Automatically extract and inject setupScript from sqlContent
            const rubricGenerator = new RubricGeneratorService(this.aiProvider);
            updatedRules = rubricGenerator.extractAndInjectSqlSetupScript(updatedRules, sqlContent);

            // 3. Update the assignment in DB
            const updatedAssignment = {
                ...assignment,
                rubric: {
                    ...assignment.rubric,
                    rules: updatedRules
                }
            };

            await this.assignmentRepository.saveAsync(updatedAssignment);

            const testCaseCount = updatedRules.reduce((sum: number, r: any) => {
                return sum + (r.requiredEvidence?.[0]?.sqlProbe?.testCases?.length || 0);
            }, 0);

            console.log(`[AssignmentController] updateAnswerKey: Successfully updated ${testCaseCount} test cases for assignment ${id}`);

            this.ok(res, {
                rules: updatedRules,
                testCaseCount,
                message: `Answer Key updated successfully. ${testCaseCount} test cases generated.`
            }, 'Answer Key updated');
        } catch (error: any) {
            console.error('[AssignmentController] Error updating Answer Key:', error);
            throw new Error(`Error updating Answer Key: ${error.message}`);
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            const { title, description, dueDate, gradingStrategy, allowLateSubmission, latePenaltyType, latePenaltyValue, maxLatePenalty, duplicatePenaltyType, duplicatePenaltyValue, lateSubmitHours } = req.body;

            let assignment = await this.assignmentRepository.getAsync(id);
            const examRecord = await prisma.exam.findUnique({
                where: { Id: id },
                include: { Subject: true }
            });

            if (!assignment && !examRecord) {
                throw new BadRequestError('Assignment not found');
            }

            // Fallback: If not in publishedAssignment, synthesize assignment from exam record
            if (!assignment && examRecord) {
                let rubricData: any = null;
                let contentStr = '';
                if (examRecord.AiGeneratedContent) {
                    try {
                        const parsed = JSON.parse(examRecord.AiGeneratedContent);
                        rubricData = parsed.rubric || parsed;
                        contentStr = parsed.content || parsed.description || '';
                    } catch (e) {}
                }
                assignment = {
                    id: examRecord.Id,
                    version: '1',
                    blueprintId: '',
                    metadata: {
                        title: examRecord.Title,
                        description: examRecord.Description,
                        content: contentStr,
                        subject: examRecord.Subject?.SubjectCode || examRecord.Subject?.SubjectName || '',
                        totalPoints: examRecord.TotalPoints,
                        dueDate: examRecord.DueDate,
                        allowLateSubmission: examRecord.AllowLateSubmission,
                        latePenaltyType: examRecord.LatePenaltyType,
                        latePenaltyValue: examRecord.LatePenaltyValue,
                        maxLatePenalty: examRecord.MaxLatePenalty,
                        gradingStrategy: examRecord.GradingStrategy || 'CONTINUOUS_QUEUE',
                    },
                    rubric: rubricData,
                    stats: {
                        dueDate: examRecord.DueDate,
                        createdAt: examRecord.StartDate || new Date(),
                        gradingStrategy: examRecord.GradingStrategy || 'CONTINUOUS_QUEUE',
                    }
                } as any;
            }

            let parsedDueDate: Date | undefined;
            if (dueDate) {
                parsedDueDate = new Date(dueDate);
                if (examRecord.StartDate && parsedDueDate < examRecord.StartDate) {
                    throw new BadRequestError('Due date cannot be earlier than the assignment start date');
                }
            }

            let currentAiContent: any = {};
            if (examRecord.AiGeneratedContent) {
                try {
                    currentAiContent = JSON.parse(examRecord.AiGeneratedContent);
                } catch (e) {}
            }
            if (duplicatePenaltyType !== undefined) currentAiContent.duplicatePenaltyType = duplicatePenaltyType;
            if (duplicatePenaltyValue !== undefined && duplicatePenaltyValue !== null) currentAiContent.duplicatePenaltyValue = Number(duplicatePenaltyValue);
            if (lateSubmitHours !== undefined) currentAiContent.lateSubmitHours = lateSubmitHours !== null ? Number(lateSubmitHours) : null;

            const updateData: any = {
                Title: title,
                Description: description,
                DueDate: parsedDueDate,
                GradingStrategy: gradingStrategy || examRecord.GradingStrategy || 'CONTINUOUS_QUEUE',
                AiGeneratedContent: JSON.stringify(currentAiContent)
            };
            if (allowLateSubmission !== undefined) updateData.AllowLateSubmission = Boolean(allowLateSubmission);
            if (latePenaltyType !== undefined) updateData.LatePenaltyType = latePenaltyType;
            if (latePenaltyValue !== undefined && latePenaltyValue !== null) updateData.LatePenaltyValue = Number(latePenaltyValue);
            if (maxLatePenalty !== undefined) updateData.MaxLatePenalty = maxLatePenalty !== null ? Number(maxLatePenalty) : null;
            if (req.body.status) {
                const s = String(req.body.status).toLowerCase();
                updateData.Status = s === 'published' ? 'Published' : s === 'draft' ? 'Draft' : req.body.status;
            }
            if (req.body.maxScore !== undefined || req.body.totalPoints !== undefined) {
                updateData.TotalPoints = Number(req.body.maxScore ?? req.body.totalPoints);
            }

            await prisma.exam.update({
                where: { Id: id },
                data: updateData
            });

            // 2. Update Prisma ExamClass Records
            await prisma.examClass.updateMany({
                where: { ExamId: id },
                data: {
                    DueDate: parsedDueDate
                }
            });

            // 2.1 Đồng bộ: Nếu deadline được gia hạn tới tương lai hoặc chính sách nộp trễ được mở, dọn dẹp các bài nộp 0 điểm tạm thời để sinh viên có thể nộp bài bình thường
            const effectiveAllow = allowLateSubmission !== undefined ? Boolean(allowLateSubmission) : (examRecord.AllowLateSubmission ?? true);
            const effectiveType = latePenaltyType !== undefined ? latePenaltyType : (examRecord.LatePenaltyType ?? 'NONE');
            if ((parsedDueDate && parsedDueDate > new Date()) || (effectiveAllow && effectiveType !== 'NONE')) {
                await prisma.submission.deleteMany({
                    where: {
                        ExamId: id,
                        ReportData: { contains: '"isAutoZero":true' },
                        GradingStatus: 'Graded',
                        TotalScore: 0
                    }
                }).catch(err => {
                    console.warn('[AssignmentController] Cleanup auto-zero submissions error:', err);
                });
            }

            try {
                const { globalJobManager } = await import('../../application/queue/SubmissionJobManager.js');
                globalJobManager.emit(`assignment_event:${id}`, {
                    type: 'ASSIGNMENT_DEADLINE_UPDATED',
                    assignmentId: id,
                    dueDate: parsedDueDate ? parsedDueDate.toISOString() : null
                });
            } catch (e) {}

            // 3. Update Document Store Metadata
            const updatedAssignment = {
                ...assignment,
                metadata: {
                    ...assignment.metadata,
                    title,
                    description,
                    dueDate,
                    gradingStrategy: gradingStrategy || examRecord.GradingStrategy || 'CONTINUOUS_QUEUE',
                    ...(allowLateSubmission !== undefined ? { allowLateSubmission } : {}),
                    ...(latePenaltyType !== undefined ? { latePenaltyType } : {}),
                    ...(latePenaltyValue !== undefined ? { latePenaltyValue } : {}),
                    ...(maxLatePenalty !== undefined ? { maxLatePenalty } : {}),
                    ...(duplicatePenaltyType !== undefined ? { duplicatePenaltyType } : {}),
                    ...(duplicatePenaltyValue !== undefined ? { duplicatePenaltyValue } : {}),
                    ...(lateSubmitHours !== undefined ? { lateSubmitHours: lateSubmitHours !== null ? Number(lateSubmitHours) : null } : {})
                }
            };

            await this.assignmentRepository.saveAsync(updatedAssignment);

            // 4. Gửi thông báo hệ thống và Email cho các sinh viên CHƯA NỘP BÀI
            try {
                const sendNotificationUseCase = new SendAssignmentNotificationUseCase(new NodemailerService());
                sendNotificationUseCase.execute({
                    examId: id,
                    title: title || examRecord.Title || 'AI Assignment',
                    type: 'Assignment',
                    dueDate: parsedDueDate || examRecord.DueDate,
                    createdBy: (req as any).user?.id || examRecord.CreatedBy || 'system',
                    isUpdate: true,
                    filterUnsubmittedOnly: true
                }).catch((err) => console.error("[AssignmentController] Error sending update notification:", err));
            } catch (notifErr) {
                console.error("[AssignmentController] Failed to initialize update notification:", notifErr);
            }

            this.ok(res, updatedAssignment, 'Assignment updated successfully');
        } catch (error: any) {
            console.error("Update Error:", error);
            if (error instanceof BadRequestError) {
                res.status(400).json({ success: false, message: error.message });
                return;
            }
            res.status(500).json({ success: false, message: error.message || 'Error updating assignment' });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;

            // 1. Soft Delete Core SQL record
            try {
                await prisma.exam.update({
                    where: { Id: id },
                    data: {
                        IsDeleted: true,
                        Status: 'Deleted',
                        DeletedAt: new Date()
                    }
                });
            } catch (e) {
                console.warn(`[AssignmentController] Failed to soft-delete exam record for ${id}:`, e);
            }

            // 2. Soft Delete in PublishedAssignmentRepository
            await this.assignmentRepository.softDeleteAsync(id);
            this.ok(res, null, 'Assignment soft-deleted successfully');
        } catch (error) {
            throw new Error('Error soft-deleting assignment');
        }
    };

    getTrash = async (_req: Request, res: Response): Promise<void> => {
        try {
            const publishedTrash = await this.assignmentRepository.getTrashAsync().catch(() => []);

            const deletedExams = await prisma.exam.findMany({
                where: {
                    OR: [
                        { IsDeleted: true },
                        { Status: 'Deleted' },
                        { DeletedAt: { not: null } }
                    ]
                },
                include: {
                    Subject: {
                        select: {
                            SubjectCode: true,
                            SubjectName: true
                        }
                    },
                    ExamClass: {
                        select: {
                            ClassId: true,
                            Class: {
                                select: {
                                    Id: true,
                                    Name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    DeletedAt: 'desc'
                }
            }).catch(err => {
                console.error('[AssignmentController] Error fetching deleted exams:', err);
                return [];
            });

            const trashMap = new Map<string, any>();

            // 1. Add PublishedAssignment trash items
            for (const pa of publishedTrash) {
                if (pa && pa.id) {
                    trashMap.set(pa.id, {
                        ...pa,
                        status: 'deleted',
                        isDeleted: true
                    });
                }
            }

            // 2. Add / Merge Exam trash items
            for (const exam of deletedExams) {
                const classIds = exam.ExamClass.map(ec => ec.ClassId).filter(Boolean);
                let desc = exam.Description || '';
                if (exam.AiGeneratedContent) {
                    try {
                        const parsed = JSON.parse(exam.AiGeneratedContent);
                        if (!desc && (parsed.description || parsed.content)) {
                            desc = parsed.description || parsed.content;
                        }
                    } catch (e) {}
                }

                const examItem = {
                    id: exam.Id,
                    title: exam.Title,
                    description: desc,
                    subjectCode: exam.Subject?.SubjectCode || '',
                    subjectName: exam.Subject ? `${exam.Subject.SubjectCode} - ${exam.Subject.SubjectName}` : '',
                    status: 'deleted',
                    isDeleted: true,
                    dueDate: exam.DueDate,
                    dueAt: exam.DueDate,
                    due: exam.DueDate,
                    maxScore: exam.TotalPoints || 10,
                    classId: classIds.length > 0 ? classIds[0] : null,
                    classIds: classIds,
                    deletedAt: exam.DeletedAt || new Date(),
                    metadata: {
                        title: exam.Title,
                        description: desc,
                        subject: exam.Subject?.SubjectCode || exam.Subject?.SubjectName || '',
                        dueDate: exam.DueDate,
                        classes: classIds
                    }
                };

                if (trashMap.has(exam.Id)) {
                    trashMap.set(exam.Id, { ...trashMap.get(exam.Id), ...examItem });
                } else {
                    trashMap.set(exam.Id, examItem);
                }
            }

            const combinedTrash = Array.from(trashMap.values()).sort((a, b) => {
                const timeA = new Date(a.deletedAt || 0).getTime();
                const timeB = new Date(b.deletedAt || 0).getTime();
                return timeB - timeA;
            });

            this.ok(res, combinedTrash, 'Trash assignments fetched');
        } catch (error) {
            console.error("GetTrash Error:", error);
            res.status(500).json(ApiResponse.error((error as any)?.message || 'Error fetching trash assignments', 500));
        }
    };

    restore = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;

            // 1. Restore Core SQL record
            try {
                await prisma.exam.update({
                    where: { Id: id },
                    data: {
                        IsDeleted: false,
                        Status: 'Published',
                        DeletedAt: null
                    }
                });
            } catch (e) {
                console.warn(`[AssignmentController] Failed to restore exam record for ${id}:`, e);
            }

            // 2. Restore in PublishedAssignmentRepository
            await this.assignmentRepository.restoreAsync(id);
            this.ok(res, null, 'Assignment restored successfully');
        } catch (error) {
            throw new Error('Error restoring assignment');
        }
    };

    private async safelyDeleteExamSql(examId: string): Promise<void> {
        try {
            await prisma.submissionOverride.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            await prisma.examAttachment.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            await prisma.examClass.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            await (prisma as any).aiUsageLog?.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            await (prisma as any).examGenerationHistory?.deleteMany({ where: { ExamId: examId } }).catch(() => {});

            const subs = await prisma.submission.findMany({ where: { ExamId: examId }, select: { Id: true } }).catch(() => []);
            const subIds = subs.map(s => s.Id);
            if (subIds.length > 0) {
                await prisma.criterionScore.deleteMany({ where: { RuleScore: { ExecutionResult: { SubmissionId: { in: subIds } } } } }).catch(() => {});
                await prisma.evidence.deleteMany({ where: { RuleScore: { ExecutionResult: { SubmissionId: { in: subIds } } } } }).catch(() => {});
                await prisma.ruleScore.deleteMany({ where: { ExecutionResult: { SubmissionId: { in: subIds } } } }).catch(() => {});
                await prisma.executionResult.deleteMany({ where: { SubmissionId: { in: subIds } } }).catch(() => {});
                await (prisma as any).buildArtifact?.deleteMany({ where: { GradingSession: { SubmissionId: { in: subIds } } } }).catch(() => {});
                await prisma.gradingSession.deleteMany({ where: { SubmissionId: { in: subIds } } }).catch(() => {});
                await prisma.submission.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            }

            const sections = await prisma.examSection.findMany({ where: { ExamId: examId }, select: { Id: true } }).catch(() => []);
            const sectionIds = sections.map(s => s.Id);
            if (sectionIds.length > 0) {
                const rules = await prisma.rubricRule.findMany({ where: { SectionId: { in: sectionIds } }, select: { Id: true } }).catch(() => []);
                const ruleIds = rules.map(r => r.Id);
                if (ruleIds.length > 0) {
                    await prisma.rubricCriterion.deleteMany({ where: { RubricRuleId: { in: ruleIds } } }).catch(() => {});
                    await prisma.rubricRule.deleteMany({ where: { SectionId: { in: sectionIds } } }).catch(() => {});
                }
                await prisma.examSection.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            }

            await prisma.testCase.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            await prisma.sampleCode.deleteMany({ where: { ExamId: examId } }).catch(() => {});
            await prisma.referenceArtifact.deleteMany({ where: { ExamId: examId } }).catch(() => {});

            await prisma.exam.delete({ where: { Id: examId } });
        } catch (e) {
            console.warn(`[AssignmentController] Soft-deleting SQL exam ${examId} instead of hard delete:`, e);
            await prisma.exam.update({
                where: { Id: examId },
                data: { IsDeleted: true, Status: 'Deleted', DeletedAt: new Date() }
            }).catch(() => {});
        }
    }

    hardDelete = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            await this.safelyDeleteExamSql(id);
            await this.assignmentRepository.deleteAsync(id);
            this.ok(res, null, 'Assignment permanently deleted');
        } catch (error) {
            throw new Error('Error permanently deleting assignment');
        }
    };

    bulkHardDelete = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                throw new BadRequestError('Ids array is required');
            }

            for (const id of ids) {
                await this.safelyDeleteExamSql(id);
                await this.assignmentRepository.deleteAsync(id);
            }

            this.ok(res, { count: ids.length }, 'Assignments permanently deleted');
        } catch (error) {
            throw new Error('Error performing bulk hard delete');
        }
    };

    bulkRestore = async (req: Request, res: Response): Promise<void> => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                throw new BadRequestError('Ids array is required');
            }

            for (const id of ids) {
                try {
                    await prisma.exam.update({
                        where: { Id: id },
                        data: {
                            IsDeleted: false,
                            Status: 'Published',
                            DeletedAt: null
                        }
                    });
                } catch (e) {
                    console.warn(`[AssignmentController] Failed to restore exam record for bulk restore ${id}:`, e);
                }
                await this.assignmentRepository.restoreAsync(id);
            }

            this.ok(res, { count: ids.length }, 'Assignments restored successfully');
        } catch (error) {
            throw new Error('Error performing bulk restore');
        }
    };

    updateAllStrategy = async (req: Request, res: Response): Promise<void> => {
        try {
            const { strategy } = req.body;
            if (!strategy || !['CONTINUOUS_QUEUE', 'BATCH_POST_DEADLINE'].includes(strategy)) {
                throw new BadRequestError('Invalid grading strategy');
            }

            // Update all exams in SQL Database
            await prisma.exam.updateMany({
                data: { GradingStrategy: strategy }
            });

            // Update all published assignments in Document Store
            const allAssignments = await this.assignmentRepository.getAllAsync();
            for (const assignment of allAssignments) {
                const updated = {
                    ...assignment,
                    metadata: {
                        ...assignment.metadata,
                        gradingStrategy: strategy
                    }
                };
                await this.assignmentRepository.saveAsync(updated);
            }

            this.ok(res, { strategy }, 'All assignment grading strategies updated successfully');
        } catch (error: any) {
            console.error("UpdateAllStrategy Error:", error);
            res.status(500).json({ error: error.message || "Error updating all grading strategies" });
        }
    };

    streamAssignmentEvents = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Send initial heartbeat
        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', assignmentId: id })}\n\n`);

        const onAssignmentEvent = (eventData: any) => {
            try {
                res.write(`data: ${JSON.stringify(eventData)}\n\n`);
            } catch (e) { }
        };

        globalJobManager.on(`assignment_event:${id}`, onAssignmentEvent);

        req.on('close', () => {
            globalJobManager.removeListener(`assignment_event:${id}`, onAssignmentEvent);
        });
    };
}


