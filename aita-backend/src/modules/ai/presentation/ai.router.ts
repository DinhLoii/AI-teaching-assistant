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
        this.router.post('/auto-configure-assignment', authenticate, upload.single('file'), asyncHandler((req, res) => ctrl.autoConfigureAssignment(req, res)))
        this.router.post('/save-assignment', authenticate, asyncHandler((req, res) => ctrl.saveAssignmentFromAI(req, res)))
        this.router.post('/assess/:submissionId', authenticate, asyncHandler((req, res) => ctrl.assessSubmission(req, res)))
        this.router.get('/feedback/:studentId', authenticate, asyncHandler((req, res) => ctrl.learningFeedback(req, res)))
        this.router.post('/prompts/generate', authenticate, asyncHandler((req, res) => ctrl.generatePrompt(req, res)))
        this.router.post('/prompts/refine', authenticate, asyncHandler((req, res) => ctrl.refinePrompt(req, res)))

        // ── RAG Intelligent AI Tutor & Code Assessment Routes ──
        this.router.post('/rag/chat', authenticate, asyncHandler((req, res) => ctrl.ragChat(req, res)))
        this.router.post('/rag/diagnose', authenticate, asyncHandler((req, res) => ctrl.ragDiagnose(req, res)))
        this.router.post('/rag/assess/:submissionId', authenticate, asyncHandler((req, res) => ctrl.ragAssess(req, res)))

        // ── RAG Rubric Management & Semantic Retrieval ──
        this.router.get('/rubrics/similar', authenticate, asyncHandler((req, res) => ctrl.searchSimilarRubrics(req, res)))
        this.router.get('/rubrics/:id', authenticate, asyncHandler((req, res) => ctrl.getRubricDetail(req, res)))
        this.router.put('/rubrics/:id/approve', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler((req, res) => ctrl.approveRubric(req, res)))
        this.router.put('/rubrics/:id', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler((req, res) => ctrl.updateRubric(req, res)))

        // Config routes
        this.router.get('/config', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getConfig(req, res)))
        this.router.put('/config', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.updateConfig(req, res)))
    }
}
