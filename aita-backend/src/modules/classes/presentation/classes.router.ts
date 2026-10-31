import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { asyncHandler } from '../../../utils/async-handler.js'
import type { ClassesController } from './classes.controller.js'
import { AdminGradebookService } from '../application/admin-gradebook.service.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class ClassesRouter {
  public readonly router: Router

  constructor() {
    this.router = Router()
    this.registerRoutes()
  }

  private registerRoutes() {
    const controller = container.get<ClassesController>('ClassController')
    const gradebook = new AdminGradebookService()

    this.router.get('/gradebook/catalog', authenticate, requireRoles('ADMIN'), asyncHandler(async (req, res) => {
      res.setHeader('Cache-Control', 'private, no-store')
      res.json(ApiResponse.success('Thành công', await gradebook.catalog(req.user!)))
    }))
    this.router.get('/:id/gradebook', authenticate, requireRoles('ADMIN'), asyncHandler(async (req, res) => {
      res.setHeader('Cache-Control', 'private, no-store')
      res.json(ApiResponse.success('Thành công', await gradebook.get(String(req.params.id), req.user!)))
    }))
    this.router.get('/:id/gradebook/:submissionId/history', authenticate, requireRoles('ADMIN'), asyncHandler(async (req, res) => {
      res.setHeader('Cache-Control', 'private, no-store')
      res.json(ApiResponse.success('Thành công', await gradebook.history(String(req.params.id), String(req.params.submissionId), req.user!)))
    }))
    this.router.patch('/:id/gradebook', authenticate, requireRoles('ADMIN'), asyncHandler(async (req, res) => {
      res.json(ApiResponse.success('Đã cập nhật bảng điểm', await gradebook.update(String(req.params.id), req.body, req.user!, req.ip)))
    }))
    this.router.put('/:id/gradebook/weights', authenticate, requireRoles('ADMIN'), asyncHandler(async (req, res) => {
      res.json(ApiResponse.success('Đã cập nhật trọng số', await gradebook.updateWeights(String(req.params.id), req.body, req.user!, req.ip)))
    }))

    this.router.get('/', authenticate, asyncHandler((req, res) => controller.list(req, res)))
    this.router.get('/codes', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.listClassCodes(req, res)))
    this.router.get('/subjects', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.listSubjectsBySemester(req, res)))
    this.router.post('/', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.create(req, res)))
    this.router.get('/:id', authenticate, asyncHandler((req, res) => controller.getById(req, res)))
    this.router.get('/:id/students', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.getStudents(req, res)))
    this.router.post('/:id/enroll', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.enroll(req, res)))
    this.router.patch('/:id/note', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.updateNote(req, res)))
    this.router.patch('/:id', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.update(req, res)))
    this.router.get('/:id/announcements/stream', authenticate, asyncHandler((req, res) => controller.streamAnnouncements(req, res)))
    this.router.get('/:id/announcements', authenticate, asyncHandler((req, res) => controller.listAnnouncements(req, res)))
    this.router.post('/:id/announcements', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.createAnnouncement(req, res)))
    this.router.put('/:id/announcements/:announcementId', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.updateAnnouncement(req, res)))
    this.router.patch('/:id/announcements/:announcementId', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.updateAnnouncement(req, res)))
    this.router.delete('/:id/announcements/:announcementId', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler((req, res) => controller.deleteAnnouncement(req, res)))
    this.router.delete('/:id', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => controller.delete(req, res)))
  }
}
