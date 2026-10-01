import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import type { SubjectsController } from './subjects.controller.js'

export class SubjectsRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<SubjectsController>(TOKENS.SubjectController)

    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.get('/:id', authenticate, asyncHandler((req, res) => controller.getById(req, res)))
    this.router.post('/', authenticate, asyncHandler((req, res) => controller.create(req, res)))
    this.router.get('/:id/students', authenticate, asyncHandler((req, res) => controller.getStudents(req, res)))
    this.router.put('/:id', authenticate, asyncHandler((req, res) => controller.update(req, res)))
    this.router.delete('/:id', authenticate, asyncHandler((req, res) => controller.remove(req, res)))
  }
}
