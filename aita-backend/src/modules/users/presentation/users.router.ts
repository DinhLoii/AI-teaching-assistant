import { Router } from 'express'
import { container } from '../../../shared/infrastructure/di-container.js'
import { TOKENS } from '../../../shared/infrastructure/tokens.js'
import { authenticate, requireRoles } from '../../../middleware/auth.js'
import { uploadExcelMiddleware, uploadAvatarMiddleware } from '../../../middleware/upload.js'
import { asyncHandler } from '../../../shared/presentation/async-handler.js'
import { UsersController } from './users.controller.js'

export class UsersRouter {
    public readonly router: Router

    constructor() {
        this.router = Router()
        this.registerRoutes()
    }

    private registerRoutes() {
        const ctrl = container.get<UsersController>(TOKENS.UsersController)

        this.router.get('/', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.list(req, res)))
        this.router.get('/:id', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.getById(req, res)))
        this.router.post('/', authenticate, requireRoles('ADMIN'), uploadAvatarMiddleware.single('avatar'), asyncHandler((req, res) => ctrl.create(req, res)))
        this.router.post('/import', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.import(req, res)))
        this.router.post('/preview-import-students-excel', authenticate, requireRoles('ADMIN'), uploadExcelMiddleware.single('file'), asyncHandler((req, res) => ctrl.previewImportStudentsExcel(req, res)))
        this.router.post('/import-students-excel', authenticate, requireRoles('ADMIN'), uploadExcelMiddleware.single('file'), asyncHandler((req, res) => ctrl.importStudentsExcel(req, res)))
        this.router.post('/preview-import-lecturers-excel', authenticate, requireRoles('ADMIN'), uploadExcelMiddleware.single('file'), asyncHandler((req, res) => ctrl.previewImportLecturersExcel(req, res)))
        this.router.post('/import-lecturers-excel', authenticate, requireRoles('ADMIN'), uploadExcelMiddleware.single('file'), asyncHandler((req, res) => ctrl.importLecturersExcel(req, res)))
        this.router.post('/import-teaching-assignments-excel', authenticate, requireRoles('ADMIN'), uploadExcelMiddleware.single('file'), asyncHandler((req, res) => ctrl.importTeachingAssignmentsExcel(req, res)))
        this.router.post('/bulk-delete', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.bulkDelete(req, res)))
        this.router.patch('/:id', authenticate, requireRoles('ADMIN'), uploadAvatarMiddleware.single('avatar'), asyncHandler((req, res) => ctrl.update(req, res)))
        this.router.delete('/:id', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.delete(req, res)))
        this.router.patch('/:id/lock', authenticate, requireRoles('ADMIN'), asyncHandler((req, res) => ctrl.toggleLock(req, res)))
    }
}
