import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { SettingsController } from './settings.controller.js'

export class OptionsRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<SettingsController>(TOKENS.SettingsController)

        this.router.get('/classes', authenticate, asyncHandler((req, res) => ctrl.classOptions(req, res)))
        this.router.get('/lecturers', authenticate, asyncHandler((req, res) => ctrl.lecturerOptions(req, res)))
        this.router.get('/assignments', authenticate, asyncHandler((req, res) => ctrl.assignmentOptions(req, res)))
    }
}
