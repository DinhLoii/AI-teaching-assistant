import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { ClassesController } from './classes.controller.js'

export class ClassesRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<ClassesController>('ClassController')

    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.get('/codes', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.listClassCodes(req, res)))
    this.router.get('/subjects', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.listSubjectsBySemester(req, res)))
    this.router.post('/', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.create(req, res)))
    this.router.get('/:id', authenticate, asyncHandler((req, res) => controller.getById(req, res)))
    this.router.get('/:id/students', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.getStudents(req, res)))
    this.router.post('/:id/enroll', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.enroll(req, res)))
    this.router.patch('/:id/note', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.updateNote(req, res)))
    this.router.patch('/:id', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.update(req, res)))
    this.router.get('/:id/announcements/stream', asyncHandler((req, res) => controller.streamAnnouncements(req, res)))
    this.router.get('/:id/announcements', authenticate, asyncHandler((req, res) => controller.listAnnouncements(req, res)))
    this.router.post('/:id/announcements', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.createAnnouncement(req, res)))
    this.router.put('/:id/announcements/:announcementId', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.updateAnnouncement(req, res)))
    this.router.patch('/:id/announcements/:announcementId', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.updateAnnouncement(req, res)))
    this.router.delete('/:id/announcements/:announcementId', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.deleteAnnouncement(req, res)))
    this.router.delete('/:id', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => controller.delete(req, res)))
  }
}
