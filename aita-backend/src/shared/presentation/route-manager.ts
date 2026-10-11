import { Router } from 'express'
import { AuthRouter } from '../../modules/auth/presentation/auth.router.js'
import { ClassesRouter } from '../../modules/classes/presentation/classes.router.js'
import { SubjectsRouter } from '../../modules/subjects/presentation/subjects.router.js'
import { ExamsRouter } from '../../modules/exams/presentation/exams.router.js'
import { SubmissionsRouter } from '../../modules/submissions/presentation/submissions.router.js'
import { UsersRouter } from '../../modules/users/presentation/users.router.js'
import { AiRouter } from '../../modules/ai/presentation/ai.router.js'
import { ReportsRouter } from '../../modules/reports/presentation/reports.router.js'
import { AuditRouter } from '../../modules/audit/presentation/audit.router.js'
import { ConfigRouter } from '../../modules/config/presentation/config.router.js'
import { NotificationsRouter } from '../../modules/notifications/presentation/notifications.router.js'
import { RubricRouter } from '../../modules/rubric/presentation/rubric.router.js'
import { GradingRouter } from '../../modules/grading/presentation/grading.router.js'
import { StatsRouter } from '../../modules/stats/presentation/stats.router.js'
import { SettingsRouter } from '../../modules/settings/presentation/settings.router.js'
import { OptionsRouter } from '../../modules/settings/presentation/options.router.js'
import { SemestersRouter } from '../../modules/semesters/presentation/semesters.router.js'
import { StudentPortalRouter } from '../../modules/student-portal/presentation/student-portal.router.js'
import { PromptsRouter } from '../../modules/prompts/presentation/prompts.router.js'
import { NotesRouter } from '../../modules/notes/presentation/notes.router.js'

/**
 * ApiRouteManager — centrally manages all API routes.
 *
 * ┌─────────────────────┐
 * │  Clean Architecture │  /auth/*, /classes/*, /subjects/*
 * ├─────────────────────┤
 * │  Legacy (wrapped)   │  /submissions, ...
 * └─────────────────────┘
 */
export class ApiRouteManager {
  private readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    // ── Health Check ──────────────────────────────────────────────
    this.router.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // ── Clean Architecture Modules ───────────────────────────────
    this.router.use('/auth', new AuthRouter().router)
    this.router.use('/semesters', new SemestersRouter().router)
    this.router.use('/classes', new ClassesRouter().router)
    this.router.use('/subjects', new SubjectsRouter().router)
    this.router.use('/assignments', new ExamsRouter().router) // Legacy UI still calls /assignments
    this.router.use('/exams', new ExamsRouter().router)
    this.router.use('/submissions', new SubmissionsRouter().router)
    this.router.use('/users', new UsersRouter().router)
    this.router.use('/ai', new AiRouter().router)
    this.router.use('/reports', new ReportsRouter().router)
    this.router.use('/audit', new AuditRouter().router)
    this.router.use('/config', new ConfigRouter().router)
    this.router.use('/notifications', new NotificationsRouter().router)
    this.router.use('/rubric', new RubricRouter().router)
    this.router.use('/rubrics', new RubricRouter().router)
    this.router.use('/grading', new GradingRouter().router)
    this.router.use('/stats', new StatsRouter().router)
    this.router.use('/settings', new SettingsRouter().router)
    this.router.use('/options', new OptionsRouter().router)
    this.router.use('/student-portal', new StudentPortalRouter().router)
    this.router.use('/prompts', new PromptsRouter().router)
    this.router.use('/notes', new NotesRouter().router)

    // All legacy routes have been removed and migrated to Clean Architecture.
  }

  /**
   * Return the configured router instance.
   */
  getRouter(): Router {
    return this.router
  }
}

export const routeManager = new ApiRouteManager()
