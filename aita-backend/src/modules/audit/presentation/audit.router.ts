import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { AuditController } from './audit.controller.js'

export class AuditRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<AuditController>(TOKENS.AuditController)

        this.router.get('/logs', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getAuditLogs(req, res)))
        this.router.get('/ai-usage', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getAiUsageLogs(req, res)))
    }
}
