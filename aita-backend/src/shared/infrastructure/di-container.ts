import { logger } from './logger.js'
import { TOKENS } from './tokens.js'
import { JwtTokenService } from './jwt-token-service.js'
import { BcryptHashService } from './bcrypt-hash-service.js'
import { InMemoryEventDispatcher } from './event-dispatcher.js'
import { PrismaUserRepository } from '../../modules/users/infrastructure/repositories/prisma-user-repository.js'
import { PrismaActivityRepository } from '../../modules/auth/infrastructure/repositories/prisma-activity-repository.js'
import { PrismaRefreshTokenRepository } from '../../modules/auth/infrastructure/repositories/prisma-refresh-token.repository.js'

// Clean Architecture components
import { PrismaUnitOfWork } from './prisma-unit-of-work.js'
import { LoginUseCase } from '../../modules/auth/application/use-cases/login.use-case.js'
import { RegisterStudentUseCase } from '../../modules/auth/application/use-cases/register.use-case.js'
import { PrismaExamRepository } from '../../modules/exams/infrastructure/repositories/prisma-exam-repository.js'
import { ListExamsUseCase } from '../../modules/exams/application/use-cases/list-exams.use-case.js'
import { CreateExamUseCase } from '../../modules/exams/application/use-cases/create-exam.use-case.js'
import { UpdateExamUseCase } from '../../modules/exams/application/use-cases/update-exam.use-case.js'
import { GetExamUseCase } from '../../modules/exams/application/use-cases/get-exam.use-case.js'
import { ExamsController } from '../../modules/exams/presentation/exams.controller.js'
import { GetMeUseCase } from '../../modules/auth/application/use-cases/get-me.use-case.js'
import { RefreshTokenUseCase } from '../../modules/auth/application/use-cases/refresh-token.use-case.js'
import { LogoutUseCase } from '../../modules/auth/application/use-cases/logout.use-case.js'
import { ChangePasswordUseCase } from '../../modules/auth/application/use-cases/change-password.use-case.js'
import { ForgotPasswordUseCase } from '../../modules/auth/application/use-cases/forgot-password.use-case.js'
import { ResetPasswordUseCase } from '../../modules/auth/application/use-cases/reset-password.use-case.js'
import { UpdateProfileUseCase } from '../../modules/auth/application/use-cases/update-profile.use-case.js'
import { DismissPasswordChangeUseCase } from '../../modules/auth/application/use-cases/dismiss-password-change.use-case.js'
import { AuthController } from '../../modules/auth/presentation/auth.controller.js'
import { ListClassesUseCase } from '../../modules/classes/application/use-cases/list-classes.use-case.js'
import { CreateClassUseCase } from '../../modules/classes/application/use-cases/create-class.use-case.js'
import { GetClassStudentsUseCase } from '../../modules/classes/application/use-cases/get-class-students.use-case.js'
import { EnrollStudentUseCase } from '../../modules/classes/application/use-cases/enroll-student.use-case.js'
import { UpdateClassNoteUseCase } from '../../modules/classes/application/use-cases/update-class-note.use-case.js'
import { UpdateClassUseCase } from '../../modules/classes/application/use-cases/update-class.use-case.js'
import { DeleteClassUseCase } from '../../modules/classes/application/use-cases/delete-class.use-case.js'
import { GetClassCodesBySubjectUseCase } from '../../modules/classes/application/use-cases/get-class-codes-by-subject.use-case.js'
import { PrismaClassRepository } from '../../modules/classes/infrastructure/repositories/prisma-class-repository.js'
import { PrismaEnrollmentRepository } from '../../modules/classes/infrastructure/repositories/prisma-enrollment-repository.js'
import { ClassesController } from '../../modules/classes/presentation/classes.controller.js'
import { ListSubjectsUseCase } from '../../modules/subjects/application/use-cases/list-subjects.use-case.js'
import { CreateSubjectUseCase } from '../../modules/subjects/application/use-cases/create-subject.use-case.js'
import { UpdateSubjectUseCase } from '../../modules/subjects/application/use-cases/update-subject.use-case.js'
import { DeleteSubjectUseCase } from '../../modules/subjects/application/use-cases/delete-subject.use-case.js'
import { PrismaSubjectRepository } from '../../modules/subjects/infrastructure/repositories/prisma-subject-repository.js'
import { SubjectsController } from '../../modules/subjects/presentation/subjects.controller.js'
import { GetSubjectStudentsUseCase } from '../../modules/subjects/application/use-cases/get-subject-students.use-case.js'
import { GetSubjectByIdUseCase } from '../../modules/subjects/application/use-cases/get-subject-by-id.use-case.js'
import { SemesterRepository } from '../../modules/semesters/infrastructure/repositories/semester.repository.js'
import { ListSemestersUseCase } from '../../modules/semesters/application/use-cases/list-semesters.use-case.js'
import { CreateSemesterUseCase } from '../../modules/semesters/application/use-cases/create-semester.use-case.js'
import { CreateSeasonUseCase } from '../../modules/semesters/application/use-cases/create-season.use-case.js'
import { UpdateSemesterUseCase } from '../../modules/semesters/application/use-cases/update-semester.use-case.js'
import { DeleteSemesterUseCase } from '../../modules/semesters/application/use-cases/delete-semester.use-case.js'
import { DeleteSeasonUseCase } from '../../modules/semesters/application/use-cases/delete-season.use-case.js'
import { ManageSemesterSubjectsUseCase } from '../../modules/semesters/application/use-cases/manage-semester-subjects.use-case.js'
import { SemestersController } from '../../modules/semesters/presentation/semesters.controller.js'
// Removed assignments module use cases
import { PrismaSubmissionRepository } from '../../modules/submissions/infrastructure/repositories/prisma-submission-repository.js'
import { ListSubmissionsUseCase } from '../../modules/submissions/application/use-cases/list-submissions.use-case.js'
import { CreateSubmissionUseCase } from '../../modules/submissions/application/use-cases/create-submission.use-case.js'
import { GetSubmissionUseCase } from '../../modules/submissions/application/use-cases/get-submission.use-case.js'
import { PublishGradeUseCase } from '../../modules/submissions/application/use-cases/publish-grade.use-case.js'
import { BulkPublishGradesUseCase } from '../../modules/submissions/application/use-cases/bulk-publish-grades.use-case.js'
import { RecentSubmissionsUseCase } from '../../modules/submissions/application/use-cases/recent-submissions.use-case.js'
import { SubmitFeedbackUseCase } from '../../modules/submissions/application/use-cases/submit-feedback.use-case.js'
import { GetAiHintUseCase } from '../../modules/submissions/application/use-cases/get-ai-hint.use-case.js'
import { SubmissionsController } from '../../modules/submissions/presentation/submissions.controller.js'
import { ListUsersUseCase } from '../../modules/users/application/use-cases/list-users.use-case.js'
import { CreateUserUseCase } from '../../modules/users/application/use-cases/create-user.use-case.js'
import { UpdateUserUseCase } from '../../modules/users/application/use-cases/update-user.use-case.js'
import { DeleteUserUseCase } from '../../modules/users/application/use-cases/delete-user.use-case.js'
import { BulkDeleteUsersUseCase } from '../../modules/users/application/use-cases/bulk-delete-users.use-case.js'
import { ToggleLockUseCase } from '../../modules/users/application/use-cases/toggle-lock.use-case.js'
import { ImportUsersUseCase } from '../../modules/users/application/use-cases/import-users.use-case.js'
import { ImportStudentsExcelUseCase } from '../../modules/users/application/use-cases/import-students-excel.use-case.js'
import { PreviewImportStudentsExcelUseCase } from '../../modules/users/application/use-cases/preview-import-students-excel.use-case.js'
import { ImportLecturersExcelUseCase } from '../../modules/users/application/use-cases/import-lecturers-excel.use-case.js'
import { PreviewImportLecturersExcelUseCase } from '../../modules/users/application/use-cases/preview-import-lecturers-excel.use-case.js'
import { ImportTeachingAssignmentsExcelUseCase } from '../../modules/users/application/use-cases/import-teaching-assignments-excel.use-case.js'
import { GetUserDetailsUseCase } from '../../modules/users/application/use-cases/get-user-details.use-case.js'
import { UsersController as ModularUsersController } from '../../modules/users/presentation/users.controller.js'
import { ExternalAiService } from '../../modules/ai/infrastructure/external-ai.service.js'
import { GenerateExerciseUseCase } from '../../modules/ai/application/use-cases/generate-exercise.use-case.js'
import { SaveAiAssignmentUseCase } from '../../modules/ai/application/use-cases/save-ai-assignment.use-case.js'
import { AssessSubmissionUseCase } from '../../modules/ai/application/use-cases/assess-submission.use-case.js'
import { GetLearningFeedbackUseCase } from '../../modules/ai/application/use-cases/get-learning-feedback.use-case.js'
import { GetAiConfigUseCase, UpdateAiConfigUseCase } from '../../modules/ai/application/use-cases/ai-config.use-case.js'
import { GenerateRubricUseCase } from '../../modules/ai/application/use-cases/generate-rubric.use-case.js'
import { GeneratePromptUseCase } from '../../modules/ai/application/use-cases/generate-prompt.use-case.js'
import { RefinePromptUseCase } from '../../modules/ai/application/use-cases/refine-prompt.use-case.js'
import { AiController as ModularAiController } from '../../modules/ai/presentation/ai.controller.js'
import { PrismaAuditRepository } from '../../modules/audit/infrastructure/repositories/prisma-audit-repository.js'
import { GetAuditLogsUseCase } from '../../modules/audit/application/use-cases/get-audit-logs.use-case.js'
import { GetAiUsageLogsUseCase } from '../../modules/audit/application/use-cases/get-ai-usage-logs.use-case.js'
import { AuditController } from '../../modules/audit/presentation/audit.controller.js'
import { PrismaConfigRepository } from '../../modules/config/infrastructure/repositories/prisma-config-repository.js'
import { ListProjectTypesUseCase, GetProjectTypeUseCase, UpdateProjectTypeUseCase } from '../../modules/config/application/use-cases/config.use-case.js'
import { ConfigController } from '../../modules/config/presentation/config.controller.js'
import { PrismaNotificationRepository } from '../../modules/notifications/infrastructure/repositories/prisma-notification-repository.js'
import { ListUserNotificationsUseCase, MarkNotificationAsReadUseCase, MarkAllNotificationsAsReadUseCase, DeleteNotificationUseCase, DeleteAllNotificationsUseCase } from '../../modules/notifications/application/use-cases/notification.use-case.js'
import { BroadcastNotificationUseCase } from '../../modules/notifications/application/use-cases/broadcast-notification.use-case.js'
import { SendAssignmentNotificationUseCase } from '../../modules/notifications/application/use-cases/send-assignment-notification.use-case.js'
import { NotificationsController } from '../../modules/notifications/presentation/notifications.controller.js'
import { NodemailerService } from './email/nodemailer.service.js'

// Prompts
import { PrismaPromptTemplateRepository } from '../../modules/prompts/infrastructure/repositories/prisma-prompt-template-repository.js'
import { ListPromptsBySubjectUseCase } from '../../modules/prompts/application/use-cases/list-prompts-by-subject.use-case.js'
import { CreatePromptUseCase } from '../../modules/prompts/application/use-cases/create-prompt.use-case.js'
import { UpdatePromptUseCase } from '../../modules/prompts/application/use-cases/update-prompt.use-case.js'
import { DeletePromptUseCase } from '../../modules/prompts/application/use-cases/delete-prompt.use-case.js'
import { IncrementPromptUsageUseCase } from '../../modules/prompts/application/use-cases/increment-prompt-usage.use-case.js'
import { PromptsController } from '../../modules/prompts/presentation/prompts.controller.js'
import { PrismaRubricRepository } from '../../modules/rubric/infrastructure/repositories/prisma-rubric-repository.js'
import { ListRubricRulesUseCase, GetRubricRuleWithCriteriaUseCase } from '../../modules/rubric/application/use-cases/rubric.use-case.js'
import { SaveExamRubricUseCase } from '../../modules/rubric/application/use-cases/save-exam-rubric.use-case.js'
import { RubricController } from '../../modules/rubric/presentation/rubric.controller.js'
import { PrismaGradingRepository } from '../../modules/grading/infrastructure/repositories/prisma-grading-repository.js'
import { GetGradingSessionStatusUseCase, StartGradingSessionUseCase } from '../../modules/grading/application/use-cases/grading.use-case.js'
import { GradingController as ModularGradingController } from '../../modules/grading/presentation/grading.controller.js'
import { PrismaStatsRepository } from '../../modules/stats/infrastructure/repositories/prisma-stats-repository.js'
import { GetOverviewUseCase, GetActivityLogsUseCase, GetLecturerReportUseCase, GetStudentProgressUseCase, GetStudentHistoryUseCase } from '../../modules/stats/application/use-cases/stats.use-case.js'
import { StatsController } from '../../modules/stats/presentation/stats.controller.js'
import { PrismaReportsRepository } from '../../modules/reports/infrastructure/repositories/prisma-reports-repository.js'
import { GetAdminReportUseCase, GetSystemHealthUseCase } from '../../modules/reports/application/use-cases/reports.use-case.js'
import { ReportsController } from '../../modules/reports/presentation/reports.controller.js'
import { PrismaAiRepository } from '../../modules/ai/infrastructure/repositories/prisma-ai-repository.js'
import { GetSystemConfigUseCase, UpdateSystemConfigUseCase, GetOptionsUseCase } from '../../modules/settings/application/use-cases/settings.use-case.js'
import { PrismaSettingsRepository } from '../../modules/settings/infrastructure/repositories/prisma-settings-repository.js'
import { SettingsController } from '../../modules/settings/presentation/settings.controller.js'

// Legacy controllers (functions)
// import { list as listNotifications, create as createNotification, markRead as markNotificationRead } from '../../controllers/notifications.controller.js'
// import * as statsController from '../../controllers/stats.controller.js' // REMOVED
// import * as settingsController from '../../controllers/settings.controller.js' // REMOVED
// import * as optionsController from '../../controllers/options.controller.js' // REMOVED


/**
 * DI Container — wraps legacy services/controllers for backward compatibility.
 * The legacy layer uses singleton services and function-based controllers.
 * This container provides a unified interface for route handlers.
 */
export class DIContainer {
  private static instance: DIContainer
  private services: Map<string | symbol, unknown> = new Map()

  private constructor() {
    this.registerDependencies()
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer()
    }
    return DIContainer.instance
  }

  private registerDependencies() {
    try {
      // ── Shared Infrastructure ────────────────────────────────────
      const uow = new PrismaUnitOfWork()
      const tokenService = new JwtTokenService()
      const hashService = new BcryptHashService()
      const eventDispatcher = new InMemoryEventDispatcher()

      this.services.set('UnitOfWork', uow)
      this.services.set(TOKENS.UnitOfWork, uow)
      this.services.set(TOKENS.TokenService, tokenService)
      this.services.set(TOKENS.HashService, hashService)
      this.services.set(TOKENS.Logger, logger)
      this.services.set(TOKENS.EventDispatcher, eventDispatcher)

      // ── Repositories (Shared/Cross-cutting) ──────────────────────
      const userRepo = new PrismaUserRepository(uow.getClient())
      const activityRepo = new PrismaActivityRepository(uow.getClient())
      const examRepo = new PrismaExamRepository(uow.getClient())
      const submissionRepo = new PrismaSubmissionRepository(uow.getClient())
      const classRepo = new PrismaClassRepository(uow.getClient())
      const enrollmentRepo = new PrismaEnrollmentRepository(uow.getClient())

      this.services.set(TOKENS.UserRepository, userRepo)
      this.services.set(TOKENS.ActivityRepository, activityRepo)
      this.services.set(TOKENS.ExamRepository, examRepo)
      this.services.set(TOKENS.SubmissionRepository, submissionRepo)
      this.services.set(TOKENS.ClassRepository, classRepo)
      this.services.set(TOKENS.EnrollmentRepository, enrollmentRepo)

      // Register repository factories for UoW transactions
      uow.registerFactory(TOKENS.UserRepository, (client) => new PrismaUserRepository(client))
      uow.registerFactory(TOKENS.ActivityRepository, (client) => new PrismaActivityRepository(client))
      uow.registerFactory(TOKENS.ExamRepository, (client) => new PrismaExamRepository(client))
      uow.registerFactory(TOKENS.SubmissionRepository, (client) => new PrismaSubmissionRepository(client))
      uow.registerFactory(TOKENS.ClassRepository, (client) => new PrismaClassRepository(client))
      uow.registerFactory(TOKENS.EnrollmentRepository, (client) => new PrismaEnrollmentRepository(client))
      uow.registerFactory(TOKENS.RefreshTokenRepository, (client) => new PrismaRefreshTokenRepository(client))

      // ── Email Service ──────────────────────────────────────────
      const emailService = new NodemailerService()

      // ── Auth Module ─────────────────────────────────────────────
      const refreshTokenRepo = new PrismaRefreshTokenRepository(uow.getClient())
      this.services.set(TOKENS.RefreshTokenRepository, refreshTokenRepo)

      const loginUseCase = new LoginUseCase(userRepo, refreshTokenRepo, tokenService, hashService, logger)
      const registerStudentUseCase = new RegisterStudentUseCase(userRepo, uow, tokenService, hashService, logger)
      const getMeUseCase = new GetMeUseCase(userRepo, logger)
      const refreshTokenUseCase = new RefreshTokenUseCase(refreshTokenRepo, userRepo, tokenService, logger)
      const logoutUseCase = new LogoutUseCase(refreshTokenRepo, logger)
      const changePasswordUseCase = new ChangePasswordUseCase(userRepo, hashService, logger)
      const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepo, emailService)
      const resetPasswordUseCase = new ResetPasswordUseCase(userRepo, hashService)
      const updateProfileUseCase = new UpdateProfileUseCase(userRepo)
      const dismissPasswordChangeUseCase = new DismissPasswordChangeUseCase(userRepo)

      const authController = new AuthController(
        loginUseCase,
        registerStudentUseCase,
        getMeUseCase,
        refreshTokenUseCase,
        logoutUseCase,
        changePasswordUseCase,
        forgotPasswordUseCase,
        resetPasswordUseCase,
        updateProfileUseCase,
        dismissPasswordChangeUseCase,
        logger
      )
      this.services.set('AuthController', authController)
      this.services.set(TOKENS.AuthController, authController)

      // ── Classes ───────────────────────────────────────────────
      const listClassesUseCase = new ListClassesUseCase(classRepo, uow)
      const createClassUseCase = new CreateClassUseCase(uow)
      const getClassStudentsUseCase = new GetClassStudentsUseCase(classRepo, uow)
      const enrollStudentUseCase = new EnrollStudentUseCase(classRepo, uow)
      const updateClassNoteUseCase = new UpdateClassNoteUseCase(classRepo)
      const updateClassUseCase = new UpdateClassUseCase(uow)
      const deleteClassUseCase = new DeleteClassUseCase(uow)
      const getClassCodesBySubjectUseCase = new GetClassCodesBySubjectUseCase(uow)

      const classController = new ClassesController(
        listClassesUseCase,
        createClassUseCase,
        getClassStudentsUseCase,
        enrollStudentUseCase,
        updateClassNoteUseCase,
        updateClassUseCase,
        deleteClassUseCase,
        getClassCodesBySubjectUseCase,
        logger
      )
      this.services.set('ClassController', classController)
      this.services.set(TOKENS.ClassesController, classController)

      // ── Subjects ──────────────────────────────────────────────
      const subjectRepo = new PrismaSubjectRepository(uow.getClient())
      this.services.set(TOKENS.SubjectRepository, subjectRepo)
      uow.registerFactory(TOKENS.SubjectRepository, (client) => new PrismaSubjectRepository(client))

      const listSubjectsUseCase = new ListSubjectsUseCase(subjectRepo)
      const createSubjectUseCase = new CreateSubjectUseCase(subjectRepo)
      const updateSubjectUseCase = new UpdateSubjectUseCase(subjectRepo)
      const deleteSubjectUseCase = new DeleteSubjectUseCase(subjectRepo)
      const getSubjectStudentsUseCase = new GetSubjectStudentsUseCase(uow)
      const getSubjectByIdUseCase = new GetSubjectByIdUseCase(logger)

      const subjectController = new SubjectsController(
        listSubjectsUseCase,
        createSubjectUseCase,
        updateSubjectUseCase,
        deleteSubjectUseCase,
        getSubjectStudentsUseCase,
        getSubjectByIdUseCase,
        logger
      )
      this.services.set('SubjectController', subjectController)
      this.services.set(TOKENS.SubjectController, subjectController)

      // ── Semesters ───────────────────────────────────────────
      const semesterRepo = new SemesterRepository(uow.getClient())
      this.services.set(TOKENS.SemesterRepository, semesterRepo)
      uow.registerFactory(TOKENS.SemesterRepository, (client) => new SemesterRepository(client))

      const listSemestersUseCase = new ListSemestersUseCase(semesterRepo)
      const createSemesterUseCase = new CreateSemesterUseCase(semesterRepo)
      const createSeasonUseCase = new CreateSeasonUseCase(semesterRepo)
      const updateSemesterUseCase = new UpdateSemesterUseCase(semesterRepo)
      const deleteSemesterUseCase = new DeleteSemesterUseCase(semesterRepo)
      const deleteSeasonUseCase = new DeleteSeasonUseCase(uow)
      const manageSemesterSubjectsUseCase = new ManageSemesterSubjectsUseCase(semesterRepo)

      const semestersController = new SemestersController(
        semesterRepo,
        listSemestersUseCase,
        createSemesterUseCase,
        createSeasonUseCase,
        updateSemesterUseCase,
        deleteSemesterUseCase,
        deleteSeasonUseCase,
        manageSemesterSubjectsUseCase,
        logger
      )
      this.services.set('SemestersController', semestersController)
      this.services.set(TOKENS.SemestersController, semestersController)

      // ── Email & Notifications for Exams ──────────────────────
      const sendAssignmentNotificationUseCase = new SendAssignmentNotificationUseCase(emailService)

      // ── Exams (Replaces Assignments) ─────────────────────────
      const listExamsUseCase = new ListExamsUseCase(examRepo, uow)
      const createExamUseCase = new CreateExamUseCase(examRepo, sendAssignmentNotificationUseCase)
      const updateExamUseCase = new UpdateExamUseCase(examRepo, sendAssignmentNotificationUseCase)
      const getExamUseCase = new GetExamUseCase(examRepo)

      const examsController = new ExamsController(
        listExamsUseCase,
        createExamUseCase,
        updateExamUseCase,
        getExamUseCase,
        logger,
        examRepo
      )
      this.services.set('ExamsController', examsController)
      this.services.set(TOKENS.ExamsController, examsController)

      // ── AI (Moved up for Submissions) ───────────────────────
      const aiService = new ExternalAiService()
      const aiRepo = uow.getRepo(PrismaAiRepository)
      const generateExerciseUseCase = new GenerateExerciseUseCase(aiService, aiRepo)
      const saveAiAssignmentUseCase = new SaveAiAssignmentUseCase(uow)
      const assessSubmissionUseCase = new AssessSubmissionUseCase(uow, aiService, aiRepo)
      const getLearningFeedbackUseCase = new GetLearningFeedbackUseCase(aiService, aiRepo)
      const getAiConfigUseCase = new GetAiConfigUseCase(uow)
      const updateAiConfigUseCase = new UpdateAiConfigUseCase(uow)
      const generateRubricUseCase = new GenerateRubricUseCase(aiService, logger)
      const generatePromptUseCase = new GeneratePromptUseCase(aiService, aiRepo)
      const refinePromptUseCase = new RefinePromptUseCase(aiService, aiRepo)

      const modularAiController = new ModularAiController(
        generateExerciseUseCase,
        saveAiAssignmentUseCase,
        assessSubmissionUseCase,
        getLearningFeedbackUseCase,
        getAiConfigUseCase,
        updateAiConfigUseCase,
        generateRubricUseCase,
        generatePromptUseCase,
        refinePromptUseCase
      )
      this.services.set('AiController', modularAiController)

      // ── Submissions ──────────────────────────────────────────
      const listSubmissionsUseCase = new ListSubmissionsUseCase(submissionRepo)
      const submitSubmissionUseCase = new CreateSubmissionUseCase(submissionRepo, uow)
      const getSubmissionUseCase = new GetSubmissionUseCase(submissionRepo)
      const publishGradeUseCase = new PublishGradeUseCase(submissionRepo)
      const bulkPublishGradesUseCase = new BulkPublishGradesUseCase(submissionRepo)
      const recentSubmissionsUseCase = new RecentSubmissionsUseCase(submissionRepo)
      const submitFeedbackUseCase = new SubmitFeedbackUseCase(uow.getClient())
      const getAiHintUseCase = new GetAiHintUseCase()

      const submissionController = new SubmissionsController(
        listSubmissionsUseCase,
        recentSubmissionsUseCase,
        getSubmissionUseCase,
        submitSubmissionUseCase,
        publishGradeUseCase,
        submitFeedbackUseCase,
        bulkPublishGradesUseCase,
        getAiHintUseCase,
        logger
      )
      this.services.set('SubmissionController', submissionController)
      this.services.set(TOKENS.SubmissionController, submissionController)

      // ── Users ────────────────────────────────────────────────
      const listUsersUseCase = new ListUsersUseCase(userRepo, logger)
      const createUserUseCase = new CreateUserUseCase(userRepo, uow, hashService, logger, emailService)
      const updateUserUseCase = new UpdateUserUseCase(userRepo, hashService, logger)
      const deleteUserUseCase = new DeleteUserUseCase(userRepo, logger)
      const bulkDeleteUsersUseCase = new BulkDeleteUsersUseCase(userRepo, logger)
      const toggleLockUseCase = new ToggleLockUseCase(userRepo, logger)
      const importUsersUseCase = new ImportUsersUseCase()
      const importStudentsExcelUseCase = new ImportStudentsExcelUseCase(emailService)
      const previewImportStudentsExcelUseCase = new PreviewImportStudentsExcelUseCase()
      const importLecturersExcelUseCase = new ImportLecturersExcelUseCase(emailService)
      const previewImportLecturersExcelUseCase = new PreviewImportLecturersExcelUseCase()
      const importTeachingAssignmentsExcelUseCase = new ImportTeachingAssignmentsExcelUseCase(emailService)
      const getUserDetailsUseCase = new GetUserDetailsUseCase(logger)

      const modularUsersController = new ModularUsersController(
        listUsersUseCase,
        createUserUseCase,
        updateUserUseCase,
        deleteUserUseCase,
        bulkDeleteUsersUseCase,
        toggleLockUseCase,
        importUsersUseCase,
        importStudentsExcelUseCase,
        previewImportStudentsExcelUseCase,
        importLecturersExcelUseCase,
        previewImportLecturersExcelUseCase,
        importTeachingAssignmentsExcelUseCase,
        getUserDetailsUseCase,
        logger
      )
      this.services.set('UsersController', modularUsersController)
      this.services.set(TOKENS.UsersController, modularUsersController)


      // ── Reports ──────────────────────────────────────────────
      const reportsRepo = new PrismaReportsRepository(uow.getClient())
      this.services.set(TOKENS.ReportsRepository, reportsRepo)

      const getAdminReportUseCase = new GetAdminReportUseCase(reportsRepo)
      const getSystemHealthUseCase = new GetSystemHealthUseCase()

      const reportsController = new ReportsController(
        getAdminReportUseCase,
        getSystemHealthUseCase,
        logger
      )
      this.services.set('ReportsController', reportsController)
      this.services.set(TOKENS.ReportsController, reportsController)

      // ── Audit ────────────────────────────────────────────────
      const auditRepo = new PrismaAuditRepository(uow.getClient())
      this.services.set(TOKENS.AuditRepository, auditRepo)

      const getAuditLogsUseCase = new GetAuditLogsUseCase(auditRepo)
      const getAiUsageLogsUseCase = new GetAiUsageLogsUseCase(auditRepo)

      const auditController = new AuditController(
        getAuditLogsUseCase,
        getAiUsageLogsUseCase,
        logger
      )
      this.services.set('AuditController', auditController)
      this.services.set(TOKENS.AuditController, auditController)

      // ── Config ───────────────────────────────────────────────
      const configRepo = new PrismaConfigRepository(uow.getClient())
      this.services.set(TOKENS.ConfigRepository, configRepo)

      const listProjectTypesUseCase = new ListProjectTypesUseCase(configRepo)
      const getProjectTypeUseCase = new GetProjectTypeUseCase(configRepo)
      const updateProjectTypeUseCase = new UpdateProjectTypeUseCase(configRepo)

      const configController = new ConfigController(
        listProjectTypesUseCase,
        getProjectTypeUseCase,
        updateProjectTypeUseCase,
        logger
      )
      this.services.set('ConfigController', configController)
      this.services.set(TOKENS.ConfigController, configController)

      // ── Notifications ────────────────────────────────────────
      const notificationRepo = new PrismaNotificationRepository(uow.getClient())
      this.services.set(TOKENS.NotificationRepository, notificationRepo)

      const listUserNotificationsUseCase = new ListUserNotificationsUseCase(notificationRepo)
      const markNotificationAsReadUseCase = new MarkNotificationAsReadUseCase(notificationRepo)
      const markAllNotificationsAsReadUseCase = new MarkAllNotificationsAsReadUseCase(notificationRepo)
      const broadcastNotificationUseCase = new BroadcastNotificationUseCase(notificationRepo)
      const deleteNotificationUseCase = new DeleteNotificationUseCase(notificationRepo)
      const deleteAllNotificationsUseCase = new DeleteAllNotificationsUseCase(notificationRepo)

      const notificationsController = new NotificationsController(
        listUserNotificationsUseCase,
        markNotificationAsReadUseCase,
        markAllNotificationsAsReadUseCase,
        broadcastNotificationUseCase,
        deleteNotificationUseCase,
        deleteAllNotificationsUseCase,
        logger
      )
      this.services.set('NotificationsController', notificationsController)
      this.services.set(TOKENS.NotificationsController, notificationsController)

      // ── Rubric ───────────────────────────────────────────────
      const rubricRepo = new PrismaRubricRepository(uow.getClient())
      this.services.set(TOKENS.RubricRepository, rubricRepo)

      const listRubricRulesUseCase = new ListRubricRulesUseCase(rubricRepo)
      const getRubricRuleWithCriteriaUseCase = new GetRubricRuleWithCriteriaUseCase(rubricRepo)
      const saveExamRubricUseCase = new SaveExamRubricUseCase(rubricRepo)

      const rubricController = new RubricController(
        listRubricRulesUseCase,
        getRubricRuleWithCriteriaUseCase,
        saveExamRubricUseCase,
        logger
      )
      this.services.set('RubricController', rubricController)
      this.services.set(TOKENS.RubricController, rubricController)

      // ── Grading ──────────────────────────────────────────────
      const gradingRepo = uow.getRepo(PrismaGradingRepository)
      const getGradingSessionStatusUseCase = new GetGradingSessionStatusUseCase(gradingRepo)
      const startGradingSessionUseCase = new StartGradingSessionUseCase(gradingRepo)

      const modularGradingController = new ModularGradingController(
        getGradingSessionStatusUseCase,
        startGradingSessionUseCase,
        logger
      )
      this.services.set('GradingController', modularGradingController)
      this.services.set(TOKENS.GradingController, modularGradingController)

      // ── Stats ────────────────────────────────────────────────
      const statsRepo = new PrismaStatsRepository(uow.getClient())
      this.services.set(TOKENS.StatsRepository, statsRepo)

      const getOverviewUseCase = new GetOverviewUseCase(statsRepo)
      const getActivityLogsUseCase = new GetActivityLogsUseCase(statsRepo)
      const getLecturerReportUseCase = new GetLecturerReportUseCase(statsRepo)
      const getStudentProgressUseCase = new GetStudentProgressUseCase(statsRepo)
      const getStudentHistoryUseCase = new GetStudentHistoryUseCase(statsRepo)

      const statsController = new StatsController(
        getOverviewUseCase,
        getActivityLogsUseCase,
        getLecturerReportUseCase,
        getStudentProgressUseCase,
        getStudentHistoryUseCase,
        logger
      )
      this.services.set('StatsController', statsController)
      this.services.set(TOKENS.StatsController, statsController)

      // ── Settings & Options ───────────────────────────────────
      const settingsRepo = new PrismaSettingsRepository(uow.getClient())
      this.services.set(TOKENS.SettingsRepository, settingsRepo)

      const getSystemConfigUseCase = new GetSystemConfigUseCase(settingsRepo)
      const updateSystemConfigUseCase = new UpdateSystemConfigUseCase(settingsRepo)
      const getOptionsUseCase = new GetOptionsUseCase(settingsRepo)

      const settingsController = new SettingsController(
        getSystemConfigUseCase,
        updateSystemConfigUseCase,
        getOptionsUseCase,
        logger
      )
      this.services.set('SettingsController', settingsController)
      this.services.set(TOKENS.SettingsController, settingsController)
      this.services.set('OptionsController', settingsController)
      this.services.set(TOKENS.OptionsController, settingsController)

      // ── Prompts ───────────────────────────────────────────────
      const promptTemplateRepo = new PrismaPromptTemplateRepository(uow.getClient())
      this.services.set(TOKENS.PromptTemplateRepository, promptTemplateRepo)
      uow.registerFactory(TOKENS.PromptTemplateRepository, (client) => new PrismaPromptTemplateRepository(client))

      const listPromptsUseCase = new ListPromptsBySubjectUseCase(promptTemplateRepo)
      const createPromptUseCase = new CreatePromptUseCase(promptTemplateRepo)
      const updatePromptUseCase = new UpdatePromptUseCase(promptTemplateRepo)
      const deletePromptUseCase = new DeletePromptUseCase(promptTemplateRepo)
      const incrementPromptUsageUseCase = new IncrementPromptUsageUseCase(promptTemplateRepo)

      const promptsController = new PromptsController(
        listPromptsUseCase,
        createPromptUseCase,
        updatePromptUseCase,
        deletePromptUseCase,
        incrementPromptUsageUseCase
      )
      this.services.set('PromptsController', promptsController)
      this.services.set(TOKENS.PromptsController, promptsController)

      // Legacy: Assignments - Migrated to Clean Architecture


      // Legacy: Users - Migrated to modular version above


      // ── Legacy: Submissions ─────────────────────────────────────
      // Moved to Clean Architecture above


      // All Legacy controllers migrated to modular versions

      // Legacy Stats, Settings, Reports, AI, Options - ALL REMOVED/MIGRATED

      // Legacy: AI - Migrated to modular version above


      logger.info('DI Container initialized successfully with Clean Architecture and legacy services')
    } catch (error) {
      logger.error('DI Container initialization failed', error as Error)
      throw error
    }
  }

  get<T>(serviceName: string | symbol): T {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${String(serviceName)} not found in container`)
    }
    return service as T
  }
}

export const container = DIContainer.getInstance()
