import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { ExamsController } from './exams.controller.js'
import { uploadMiddleware } from '../../../middleware/upload.js'

export class ExamsRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<ExamsController>(TOKENS.ExamsController)

    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.post('/', authenticate, uploadMiddleware.single('file'), asyncHandler((req, res) => controller.create(req, res)))

    // Must be before /:id to avoid treating 'attachments' as an exam ID
    this.router.get('/attachments/:attachmentId/download', authenticate, asyncHandler((req, res) => controller.downloadAttachment(req, res)))

    this.router.get('/:id', authenticate, asyncHandler((req, res) => controller.getOne(req, res)))
    // Put or Patch for update depending on UI needs. Keeping both for compatibility if needed, but PUT is what was there.
    this.router.put('/:id', authenticate, asyncHandler((req, res) => controller.update(req, res)))
    this.router.patch('/:id', authenticate, asyncHandler((req, res) => controller.update(req, res)))
  }
}
