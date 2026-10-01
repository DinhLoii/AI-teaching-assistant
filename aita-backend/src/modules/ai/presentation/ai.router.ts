import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { AiController } from './ai.controller.js'
import multer from 'multer'

const upload = multer({ storage: multer.memoryStorage() })

export class AiRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<AiController>('AiController')

        this.router.post('/generate-exercise', authenticate, asyncHandler((req, res) => ctrl.generateExercise(req, res)))
        this.router.post('/generate-rubric', authenticate, upload.single('file'), asyncHandler((req, res) => ctrl.generateRubric(req, res)))
        this.router.post('/save-assignment', authenticate, asyncHandler((req, res) => ctrl.saveAssignmentFromAI(req, res)))
        this.router.post('/assess/:submissionId', authenticate, asyncHandler((req, res) => ctrl.assessSubmission(req, res)))
        this.router.get('/feedback/:studentId', authenticate, asyncHandler((req, res) => ctrl.learningFeedback(req, res)))
        this.router.post('/prompts/generate', authenticate, asyncHandler((req, res) => ctrl.generatePrompt(req, res)))
        this.router.post('/prompts/refine', authenticate, asyncHandler((req, res) => ctrl.refinePrompt(req, res)))

        // Config routes
        this.router.get('/config', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getConfig(req, res)))
        this.router.put('/config', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.updateConfig(req, res)))
    }
}
