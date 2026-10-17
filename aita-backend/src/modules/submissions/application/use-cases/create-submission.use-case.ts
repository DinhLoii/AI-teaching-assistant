import { publishNotification } from '../../../../shared/infrastructure/publish-notification.js'
import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { ISubmissionRepository } from '../../domain/repositories/submission-repository.interface.js'
import type { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import type { AuthUser } from '../../../../types/express.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/application/app.error.js'
import { CreateSubmissionRequestDto, SubmissionResponseDto } from '../dtos/submission.dto.js'
import { Submission } from '../../domain/entities/submission.entity.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import { sanitizeCloudinaryPathSegment } from '../../../../shared/utils/cloudinary-path.util.js'
import path from 'path'
import fs from 'fs'
import { privateSubmissionRoot } from '../../infrastructure/submission-storage.js'
import { inspectSourceArchive } from '../../infrastructure/source-archive.js'

export class CreateSubmissionUseCase implements IUseCase<{ dto: CreateSubmissionRequestDto; file?: Express.Multer.File; user: AuthUser }, ReturnType<typeof SubmissionResponseDto.from>> {
  constructor(
    private readonly submissionRepo: ISubmissionRepository,
    private readonly uow: IUnitOfWork
  ) { }

  async execute({ dto, file, user }: { dto: CreateSubmissionRequestDto; file?: Express.Multer.File; user: AuthUser }) {
    const examId = dto.data.examId ?? dto.data.assignmentId
    if (!examId) throw new ValidationError(MESSAGES.SUBMISSION_MISSING_EXAM_ID)

    // Uses uow for legacy exam checking until all modules are pure
    const exam = await this.uow.resolve<any>(Symbol.for('ExamRepository')).findById(examId)
    if (!exam) throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)

    let classId = dto.data.classId

    if (!classId) {
      // Find the intersection of ExamClasses and Student Enrollments
      const { prisma } = await import('../../../../database/prisma.js')
      const examClasses = await prisma.examClass.findMany({
        where: { ExamId: examId },
        select: { ClassId: true }
      });
      const enrollments = await prisma.studentClass.findMany({
        where: { UserId: user.id },
        select: { ClassId: true }
      });

      const enrolledClassIds = new Set(enrollments.map(e => e.ClassId));
      const matchingClass = examClasses.find(ec => enrolledClassIds.has(ec.ClassId));

      if (matchingClass) {
        classId = matchingClass.ClassId;
      } else {
        // An exam is not always attached to a class (ExamClass can be empty), which made
        // submission impossible even though the student is plainly enrolled in a class for
        // its subject. Fall back to that enrolment — the same relationship the subject list
        // and the lecturer lookup use. Still scoped to classes this student belongs to, so
        // it cannot open up a subject they are not enrolled in.
        const subjectId = (exam as any)?.subjectId ?? (exam as any)?.SubjectId
        if (subjectId) {
          const enrolledForSubject = await prisma.class.findFirst({
            where: {
              SubjectId: subjectId,
              StudentClass: { some: { UserId: user.id } }
            },
            select: { Id: true }
          });
          if (enrolledForSubject) classId = enrolledForSubject.Id;
        }
      }
    }

    if (!classId) throw new ValidationError("Sinh viên không thuộc bất kỳ lớp học nào được giao bài tập này")

    // Get Class and Subject details for Cloudinary folder structure
    const classRepo = this.uow.resolve<any>(Symbol.for('ClassRepository'))
    const classInfo = await classRepo.findById(classId)
    if (!classInfo) throw new NotFoundError('Không tìm thấy lớp học')

    const subjectRepo = this.uow.resolve<any>(Symbol.for('SubjectRepository'))
    const subjectInfo = await subjectRepo.findById(classInfo.subjectId)
    if (!subjectInfo) throw new NotFoundError('Không tìm thấy môn học')

    // Verify student is enrolled in the class using legacy repo access
    const enrollmentRepo = this.uow.resolve<any>(Symbol.for('EnrollmentRepository'))
    const enrollment = await enrollmentRepo.findMany({
      ClassId: classId,
      UserId: user.id,
    })
    if (!enrollment || enrollment.length === 0) {
      throw new ForbiddenError(MESSAGES.SUBMISSION_NOT_ENROLLED)
    }

    // Check for existing submission for this student & exam
    const existingSubmissionList = await this.submissionRepo.findMany({
      examId,
      studentId: user.id,
      classId,
    })
    const existingSubmission = existingSubmissionList && existingSubmissionList.length > 0 ? existingSubmissionList[0] : null

    // Check deadline considering student-specific SubmissionOverride extension and late penalty policy
    const { prisma } = await import('../../../../database/prisma.js')
    const examRecord = await (prisma.exam as any).findUnique({
      where: { Id: examId },
      select: {
        Status: true,
        DueDate: true,
        AllowLateSubmission: true,
        LatePenaltyType: true,
        LatePenaltyValue: true,
        MaxLatePenalty: true,
        SubmissionOverride: {
          where: { StudentId: user.id }
        }
      }
    })

    let publishedMeta: any = null
    try {
      const pubRow = await prisma.publishedAssignment.findUnique({
        where: { Id: examId },
        select: { Data: true },
      })
      if (pubRow?.Data) {
        publishedMeta = JSON.parse(pubRow.Data)?.metadata
      }
    } catch (e) {}

    const userOverride = examRecord?.SubmissionOverride?.[0]
    const effectiveDueDate = userOverride?.ExtendedDueDate 
      ? new Date(userOverride.ExtendedDueDate) 
      : (examRecord?.DueDate ? new Date(examRecord.DueDate) : (exam.dueDate ? new Date(exam.dueDate) : null))

    const allowLateSubmission = examRecord?.AllowLateSubmission ?? publishedMeta?.allowLateSubmission ?? (exam as any)?.allowLateSubmission ?? true
    const rawPenaltyType = examRecord?.LatePenaltyType && examRecord.LatePenaltyType !== 'NONE'
      ? examRecord.LatePenaltyType
      : (publishedMeta?.latePenaltyType || (exam as any)?.latePenaltyType || 'DAILY_POINTS')
    const latePenaltyType = String(rawPenaltyType).toUpperCase()
    const isClosed = (examRecord?.Status || (exam as any)?.status || '').toLowerCase() === 'closed'

    let lateSubmitHours: number | null = null
    if (publishedMeta?.lateSubmitHours !== undefined && publishedMeta.lateSubmitHours !== null) {
      lateSubmitHours = Number(publishedMeta.lateSubmitHours)
    } else if ((examRecord as any)?.LateSubmitHours !== undefined && (examRecord as any).LateSubmitHours !== null) {
      lateSubmitHours = Number((examRecord as any).LateSubmitHours)
    } else if ((examRecord as any)?.lateSubmitHours !== undefined && (examRecord as any).lateSubmitHours !== null) {
      lateSubmitHours = Number((examRecord as any).lateSubmitHours)
    } else if ((exam as any)?.lateSubmitHours !== undefined && (exam as any).lateSubmitHours !== null) {
      lateSubmitHours = Number((exam as any).lateSubmitHours)
    } else if (examRecord?.AiGeneratedContent || (exam as any)?.aiGeneratedContent) {
      try {
        const parsed = JSON.parse(examRecord?.AiGeneratedContent || (exam as any)?.aiGeneratedContent)
        if (parsed?.lateSubmitHours !== undefined && parsed.lateSubmitHours !== null) {
          lateSubmitHours = Number(parsed.lateSubmitHours)
        }
      } catch (e) {}
    }

    if (isClosed) {
      throw new ValidationError('Bài tập này đã bị đóng bởi giảng viên, không thể nộp bài.')
    }

    if (effectiveDueDate) {
      const now = new Date()
      if (now > effectiveDueDate) {
        // Chỉ chặn nộp bài khi giảng viên KHÔNG cho phép nộp trễ hoặc chính sách phạt là khóa (NONE_LOCKED)
        if (!allowLateSubmission || latePenaltyType === 'NONE_LOCKED') {
          throw new ValidationError('Hạn nộp bài (bao gồm thời gian gia hạn) đã hết, bài tập đã đóng không thể nộp bài.')
        }

        // Nếu cho phép nộp trễ nhưng có cấu hình giới hạn số giờ nộp trễ
        if (lateSubmitHours !== null && lateSubmitHours > 0) {
          const lateCutoff = new Date(effectiveDueDate.getTime() + lateSubmitHours * 60 * 60 * 1000)
          if (now > lateCutoff) {
            throw new ValidationError(`Đã hết thời gian cho phép nộp trễ (${lateSubmitHours} giờ sau hạn chót), bài tập đã đóng không thể nộp bài.`)
          }
        }
      }
    }

    if (dto.data.zipFileUrl) throw new ValidationError('Vui lòng tải ZIP lên trực tiếp; không chấp nhận đường dẫn bài nộp bên ngoài.')
    let fileUrl = ''
    let localFilePath: string | undefined;

    if (file) {
      if (path.extname(file.originalname).toLowerCase() !== '.zip') throw new ValidationError('Bài nộp phải là tệp ZIP.')
      try { inspectSourceArchive(file.buffer) } catch { throw new ValidationError('Tệp ZIP không hợp lệ hoặc vượt giới hạn đọc an toàn.') }
      // Sanitized here, not at the call sites: these also become a local directory
      // path in the >10MB fallback below, so a stray "/" or ".." must never survive.
      const subjectCode = sanitizeCloudinaryPathSegment(subjectInfo.subjectCode || subjectInfo.Code, 'UnknownSubject')
      const classCode = sanitizeCloudinaryPathSegment(classInfo.classCode || classInfo.Code, 'UnknownClass')
      const studentNameSafe = ((user as any).name || (user as any).email || user.id).replace(/[^a-zA-Z0-9]/g, '_')

      // Ultra-fast local write (takes < 5ms, eliminating long upload waits)
      const uploadDir = path.join(privateSubmissionRoot(), subjectCode, classCode);
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const fileName = `${studentNameSafe}_${randomUUID()}${path.extname(file.originalname) || '.zip'}`;
      localFilePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(localFilePath, file.buffer);

      // Relative URL so frontend and engine access it immediately
      fileUrl = `/private-submissions/${subjectCode}/${classCode}/${fileName}?filename=${encodeURIComponent(file.originalname)}`;


    } else if (fileUrl && !this.isValidFileUrl(fileUrl)) {
      throw new ValidationError(MESSAGES.SUBMISSION_INVALID_URL)
    }

    let targetSubmission: Submission
    const isResubmission = !!existingSubmission

    {
      // Every upload has its own immutable file/report identity; never overwrite history.
      targetSubmission = Submission.create(
        randomUUID(),
        user.id,
        examId,
        classId,
        1, // attemptNumber
        fileUrl
      )
      if (dto.data.content) {
        (targetSubmission as any).content = dto.data.content;
      }
    }

    let persisted = false
    try {
      await this.submissionRepo.createAttempt(targetSubmission)
      persisted = true

      // Invalidate student dashboard cache
      try {
        const { memoryCache } = await import('../../../../shared/infrastructure/memory-cache.js');
        memoryCache.del(`student_dash_${user.id}`);
      } catch (_) {}

      try {
        const { globalJobManager } = await import('../../../grading/engine/application/queue/SubmissionJobManager.js');
        globalJobManager.emitAssignmentEvent(examId, {
          type: 'SUBMISSION_CREATED',
          assignmentId: examId,
          submissionId: targetSubmission.id
        });
      } catch (e) { }

      // Gửi thông báo đến Giảng viên khi sinh viên nộp lại bài
      if (examId) {
        try {
          const { prisma } = await import('../../../../database/prisma.js');
          const studentUser = await prisma.user.findUnique({
            where: { Id: user.id },
            select: { FullName: true, StudentCode: true, Email: true }
          });
          const studentName = studentUser?.FullName || studentUser?.StudentCode || (user as any).name || 'Một sinh viên';

          const examRecord: any = await (prisma.exam as any).findUnique({
            where: { Id: examId },
            include: {
              ExamClass: {
                where: { ClassId: classId },
                include: {
                  Class: {
                    include: {
                      InstructorClass: true
                    }
                  }
                }
              }
            }
          });

          const recipientUserIds = new Set<string>();
          if (examRecord?.CreatedBy) {
            recipientUserIds.add(examRecord.CreatedBy);
          }
          if (examRecord?.ExamClass) {
            for (const ec of examRecord.ExamClass) {
              for (const ic of ec.Class?.InstructorClass || []) {
                if (ic.UserId) recipientUserIds.add(ic.UserId);
              }
            }
          }

          const examTitle = (exam as any).title || examRecord?.Title || 'Bài tập';

          for (const targetUserId of recipientUserIds) {
            const notification = await prisma.notification.create({
              data: {
                Title: isResubmission ? 'Sinh viên nộp lại bài tập' : 'Sinh viên nộp bài tập',
                Message: `Sinh viên ${studentName} đã ${isResubmission ? 'nộp lại' : 'nộp'} bài làm cho bài tập "${examTitle}".`,
                Type: isResubmission ? 'RESUBMISSION' : 'NEW_SUBMISSION',
                ReferenceId: examId,
                ReferenceType: 'ASSIGNMENT_GRADING',
                CreatedBy: user.id,
                NotificationRecipient: {
                  create: {
                    UserId: targetUserId,
                    IsRead: false
                  }
                }
              }
            });
            publishNotification([targetUserId], notification)
          }
        } catch (resubmitNotifErr) {
          console.error('Lỗi tạo thông báo nộp lại bài cho giảng viên:', resubmitNotifErr);
        }
      }

      // Clean up any deadline warning notifications for this student and assignment
      try {
        const { prisma } = await import('../../../../database/prisma.js');
        await prisma.notificationRecipient.deleteMany({
          where: {
            UserId: user.id,
            Notification: {
              OR: [
                { ReferenceId: examId },
                { Message: { contains: (exam as any).title || examId } },
                { Title: { contains: (exam as any).title || examId } }
              ],
              Type: { in: ['Reminder', 'DEADLINE_WARNING'] }
            }
          }
        });
      } catch (notifErr) {
        console.error('Failed to cleanup deadline notifications on submission:', notifErr);
      }

      // If continuous queue (Chấm ngầm) is enabled, auto-enqueue grading job immediately
      const { prisma } = await import('../../../../database/prisma.js');
      const dbExam = await prisma.exam.findUnique({
        where: { Id: examId },
        select: { GradingStrategy: true }
      });
      const strat = dbExam?.GradingStrategy || (exam as any).gradingStrategy || (exam as any).GradingStrategy || 'CONTINUOUS_QUEUE';
      const isContinuousQueue = strat === 'CONTINUOUS_QUEUE';
      if (isContinuousQueue) {
        try {
          const { engineSubmissionController } = await import('../../../grading/engine/modules/submissions/routes/index.js');
          if (engineSubmissionController) {
            // Enqueue here, at submit time, so queue position equals submission order.
            // The slot covers download + unzip + grading, one submission at a time.
            engineSubmissionController.enqueueContinuousGrading(targetSubmission.id).catch(err => {
              console.error('[ContinuousQueue] Error executing auto-grading job for submission:', targetSubmission.id, err);
            });
          }
        } catch (statusErr) {
          console.error('Failed to trigger auto-grading for continuous queue:', statusErr);
        }
      } else {
        console.log(`[BatchPostDeadline] Submission ${targetSubmission.id} held in pending status until lecturer triggers batch grading.`);
      }
    } catch (dbError: any) {
      if (persisted) {
        console.error('Post-submit side effect failed; the saved archive and durable grading task are retained.')
        return SubmissionResponseDto.from(targetSubmission as any, user.role)
      }
      if (localFilePath) {
        try {
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup Local file after DB save failure:', cleanupError)
        }
      }
      throw dbError
    }

    return SubmissionResponseDto.from(targetSubmission as any, user.role)
  }

  private isValidFileUrl(url: string): boolean {
    try {
      if (url.startsWith('data:')) return true;
      if (url.startsWith('blob:')) return true;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
