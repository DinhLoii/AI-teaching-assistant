import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { StatsController } from './stats.controller.js'

export class StatsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<StatsController>(TOKENS.StatsController)

        this.router.get('/overview', authenticate, asyncHandler((req, res) => ctrl.overview(req, res)))
        this.router.get('/activity', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.activityLogs(req, res)))
        this.router.get('/lecturer-report', authenticate, requireRoles('LECTURER'), asyncHandler((req, res) => ctrl.lecturerReport(req, res)))
        this.router.get('/student-progress', authenticate, requireRoles('STUDENT'), asyncHandler((req, res) => ctrl.studentProgress(req, res)))
        this.router.get('/student-history', authenticate, requireRoles('STUDENT'), asyncHandler((req, res) => ctrl.studentHistory(req, res)))
    }
}
