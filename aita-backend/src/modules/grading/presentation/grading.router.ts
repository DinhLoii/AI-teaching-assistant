import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { GradingController } from './grading.controller.js'
import { createSubmissionRoutes } from '../engine/modules/submissions/routes/index.js'
import { createAssignmentRoutes } from '../engine/modules/assignments/routes/index.js'

export class GradingRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<GradingController>(TOKENS.GradingController)

        // ── AITA Clean Architecture routes ──
        this.router.get('/sessions/:sessionId', authenticate, asyncHandler((req, res) => ctrl.getSessionStatus(req, res)))
        this.router.post('/start', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => ctrl.startGrading(req, res)))

        // ── Engine adapter routes (submissions & assignments) ──
        this.router.use('/submissions', authenticate, createSubmissionRoutes())
        this.router.use('/assignments', authenticate, createAssignmentRoutes())
    }
}
