import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { PromptsController } from './prompts.controller.js'

export class PromptsRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<PromptsController>(TOKENS.PromptsController)

    this.router.get('/subject/:subjectId', authenticate, asyncHandler((req, res) => controller.listBySubject(req, res)))
    this.router.post('/', authenticate, asyncHandler((req, res) => controller.create(req, res)))
    this.router.put('/:id', authenticate, asyncHandler((req, res) => controller.update(req, res)))
    this.router.delete('/:id', authenticate, asyncHandler((req, res) => controller.remove(req, res)))
    this.router.post('/:id/increment-usage', authenticate, asyncHandler((req, res) => controller.incrementUsage(req, res)))
  }
}
