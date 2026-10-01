import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { ReportsController } from './reports.controller.js'

export class ReportsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<ReportsController>(TOKENS.ReportsController)

        this.router.get('/', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.adminReport(req, res)))
        this.router.get('/health', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.systemHealth(req, res)))
    }
}
