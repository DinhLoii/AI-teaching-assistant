import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import { AiController } from './ai.controller.js'
import multer from 'multer'
import { rateLimiter } from '../../../middleware/rate-limiter.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 30 } })

export class AiRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<AiController>('AiController')
        const staff = requireRoles('ADMIN', 'LECTURER')
        this.router.use(authenticate, rateLimiter(30, 60000))

        this.router.post('/generate-exercise', staff, asyncHandler((req, res) => ctrl.generateExercise(req, res)))
        this.router.post('/generate-rubric', staff, upload.single('file'), asyncHandler((req, res) => ctrl.generateRubric(req, res)))
        this.router.post('/auto-configure-assignment', staff, upload.single('file'), asyncHandler((req, res) => ctrl.autoConfigureAssignment(req, res)))
        this.router.post('/save-assignment', staff, asyncHandler((req, res) => ctrl.saveAssignmentFromAI(req, res)))
        this.router.post('/assess/:submissionId', staff, asyncHandler((req, res) => ctrl.assessSubmission(req, res)))
        this.router.get('/feedback/:studentId', asyncHandler((req, res) => ctrl.learningFeedback(req, res)))
        this.router.post('/prompts/generate', staff, asyncHandler((req, res) => ctrl.generatePrompt(req, res)))
        this.router.post('/prompts/refine', staff, asyncHandler((req, res) => ctrl.refinePrompt(req, res)))

        // ── RAG Intelligent AI Tutor & Code Assessment Routes ──
        this.router.post('/rag/chat', asyncHandler((req, res) => ctrl.ragChat(req, res)))
        this.router.post('/rag/diagnose', asyncHandler((req, res) => ctrl.ragDiagnose(req, res)))
        this.router.post('/rag/assess/:submissionId', staff, asyncHandler((req, res) => ctrl.ragAssess(req, res)))

        // ── RAG Rubric Management & Semantic Retrieval ──
        this.router.get('/rubrics/similar', asyncHandler((req, res) => ctrl.searchSimilarRubrics(req, res)))
        this.router.get('/rubrics/:id', asyncHandler((req, res) => ctrl.getRubricDetail(req, res)))
        this.router.put('/rubrics/:id/approve', requireRoles('LECTURER', 'ADMIN'), asyncHandler((req, res) => ctrl.approveRubric(req, res)))
        this.router.put('/rubrics/:id', requireRoles('LECTURER', 'ADMIN'), asyncHandler((req, res) => ctrl.updateRubric(req, res)))

        // Config routes
        this.router.get('/config', requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getConfig(req, res)))
        this.router.put('/config', requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.updateConfig(req, res)))
    }
}
