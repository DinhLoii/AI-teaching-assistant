/**
 * Centralized DI tokens for all injectable services and repositories.
 * Using Symbols ensures uniqueness and prevents string-key typos.
 *
 * Grouped by layer:
 *   - Shared infrastructure services
 *   - Module-specific repositories
 *   - Module controllers
 */

// ── Shared Infrastructure ────────────────────────────────────

export const TOKENS = {
  // Core services
  UnitOfWork: Symbol.for('UnitOfWork'),
  TokenService: Symbol.for('TokenService'),
  HashService: Symbol.for('HashService'),
  Logger: Symbol.for('Logger'),
  AIService: Symbol.for('AIService'),
  EventDispatcher: Symbol.for('EventDispatcher'),

  // ── Repositories ─────────────────────────────────────────
  UserRepository: Symbol.for('UserRepository'),
  ActivityRepository: Symbol.for('ActivityRepository'),
  ClassRepository: Symbol.for('ClassRepository'),
  SubjectRepository: Symbol.for('SubjectRepository'),
  EnrollmentRepository: Symbol.for('EnrollmentRepository'),
  ExamRepository: Symbol.for('ExamRepository'),
  SubmissionRepository: Symbol.for('SubmissionRepository'),
  SemesterRepository: Symbol.for('SemesterRepository'),
  AiRepository: Symbol.for('AiRepository'),
  ReportsRepository: Symbol.for('ReportsRepository'),
  AuditRepository: Symbol.for('AuditRepository'),
  ConfigRepository: Symbol.for('ConfigRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  RubricRepository: Symbol.for('RubricRepository'),
  GradingRepository: Symbol.for('GradingRepository'),
  StatsRepository: Symbol.for('StatsRepository'),
  SettingsRepository: Symbol.for('SettingsRepository'),
  RefreshTokenRepository: Symbol.for('RefreshTokenRepository'),
  PromptTemplateRepository: Symbol.for('PromptTemplateRepository'),

  // ── Controllers ──────────────────────────────────────────
  AuthController: Symbol.for('AuthController'),
  LoginUseCase: Symbol.for('LoginUseCase'),
  RegisterStudentUseCase: Symbol.for('RegisterStudentUseCase'),
  GetMeUseCase: Symbol.for('GetMeUseCase'),
  RefreshTokenUseCase: Symbol.for('RefreshTokenUseCase'),
  LogoutUseCase: Symbol.for('LogoutUseCase'),
  ChangePasswordUseCase: Symbol.for('ChangePasswordUseCase'),
  ForgotPasswordUseCase: Symbol.for('ForgotPasswordUseCase'),
  ResetPasswordUseCase: Symbol.for('ResetPasswordUseCase'),
  ClassesController: Symbol.for('ClassesController'),
  SubjectController: Symbol.for('SubjectController'),
  AssignmentsController: Symbol.for('AssignmentsController'),
  SubmissionController: Symbol.for('SubmissionController'),
  UsersController: Symbol.for('UsersController'),
  AiController: Symbol.for('AiController'),
  ReportsController: Symbol.for('ReportsController'),
  AuditController: Symbol.for('AuditController'),
  ConfigController: Symbol.for('ConfigController'),
  PromptsController: Symbol.for('PromptsController'),
  NotificationsController: Symbol.for('NotificationsController'),
  RubricController: Symbol.for('RubricController'),
  GradingController: Symbol.for('GradingController'),
  StatsController: Symbol.for('StatsController'),
  SettingsController: Symbol.for('SettingsController'),
  ExamsController: Symbol.for('ExamsController'),
  SemestersController: Symbol.for('SemestersController'),
  OptionsController: Symbol.for('OptionsController'),
} as const
