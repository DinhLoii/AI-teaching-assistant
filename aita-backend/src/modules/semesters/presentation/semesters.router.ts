import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { createSemestersRouter } from './semesters.routes.js'
import type { SemestersController } from './semesters.controller.js'

export class SemestersRouter {
  public readonly router: Router

  constructor() {
    const controller = container.get<SemestersController>(TOKENS.SemestersController)
    this.router = createSemestersRouter(controller)
  }
}
