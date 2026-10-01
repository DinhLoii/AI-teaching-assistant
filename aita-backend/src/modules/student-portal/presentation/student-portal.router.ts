import { Router } from 'express'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import { StudentPortalController } from './student-portal.controller.js'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'

export class StudentPortalRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    // If not using DI container for this specific controller yet, instantiate directly
    let ctrl: StudentPortalController
    try {
      ctrl = container.get<StudentPortalController>(Symbol.for('StudentPortalController'))
    } catch (e) {
      const logger = container.get<any>(TOKENS.Logger)
      ctrl = new StudentPortalController(logger)
    }

    this.router.get('/dashboard', authenticate, requireRoles('STUDENT'), asyncHandler((req, res) => ctrl.getDashboard(req, res)))
    this.router.get('/subjects', authenticate, requireRoles('STUDENT'), asyncHandler((req, res) => ctrl.getSubjects(req, res)))
    this.router.get('/classes/:id', authenticate, requireRoles('STUDENT'), asyncHandler((req, res) => ctrl.getClassDetail(req, res)))
  }
}
