import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { uploadMiddleware } from '../../../middleware/upload.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { RubricController } from './rubric.controller.js'

export class RubricRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<RubricController>(TOKENS.RubricController)

        this.router.get('/rules', authenticate, asyncHandler((req, res) => ctrl.listRules(req, res)))
        this.router.get('/rules/:id', authenticate, asyncHandler((req, res) => ctrl.getRuleWithCriteria(req, res)))
        this.router.post('/exams/:examId', authenticate, requireRoles('LECTURER', 'ADMIN'), uploadMiddleware.single('file'), asyncHandler((req, res) => ctrl.saveExamRubric(req, res)))
    }
}
