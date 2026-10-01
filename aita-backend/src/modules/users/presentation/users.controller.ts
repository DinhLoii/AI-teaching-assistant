import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js'
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js'
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js'
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case.js'
import { BulkDeleteUsersUseCase } from '../application/use-cases/bulk-delete-users.use-case.js'
import { ToggleLockUseCase } from '../application/use-cases/toggle-lock.use-case.js'
import { ImportUsersUseCase } from '../application/use-cases/import-users.use-case.js'
import { ImportStudentsExcelUseCase } from '../application/use-cases/import-students-excel.use-case.js'
import { PreviewImportStudentsExcelUseCase } from '../application/use-cases/preview-import-students-excel.use-case.js'
import { ImportLecturersExcelUseCase } from '../application/use-cases/import-lecturers-excel.use-case.js'
import { PreviewImportLecturersExcelUseCase } from '../application/use-cases/preview-import-lecturers-excel.use-case.js'
import { ImportTeachingAssignmentsExcelUseCase } from '../application/use-cases/import-teaching-assignments-excel.use-case.js'
import { CreateUserDto, UpdateUserDto, ImportUsersBatchDto } from '../application/dtos/user.dto.js'
import { GetUserDetailsUseCase } from '../application/use-cases/get-user-details.use-case.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import fs from 'fs'

import { CloudinaryService } from '../../../shared/infrastructure/services/cloudinary.service.js'

export class UsersController extends BaseController {
    constructor(
        private readonly listUseCase: ListUsersUseCase,
        private readonly createUseCase: CreateUserUseCase,
        private readonly updateUseCase: UpdateUserUseCase,
        private readonly deleteUseCase: DeleteUserUseCase,
        private readonly bulkDeleteUseCase: BulkDeleteUsersUseCase,
        private readonly toggleLockUseCase: ToggleLockUseCase,
        private readonly importUseCase: ImportUsersUseCase,
        private readonly importStudentsExcelUseCase: ImportStudentsExcelUseCase,
        private readonly previewImportStudentsExcelUseCase: PreviewImportStudentsExcelUseCase,
        private readonly importLecturersExcelUseCase: ImportLecturersExcelUseCase,
        private readonly previewImportLecturersExcelUseCase: PreviewImportLecturersExcelUseCase,
        private readonly importTeachingAssignmentsExcelUseCase: ImportTeachingAssignmentsExcelUseCase,
        private readonly getUserDetailsUseCase: GetUserDetailsUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async list(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received list users request')
        const role = String(req.query.role ?? 'all')
        const page = parseInt(req.query.page as string) || 1
        const limit = parseInt(req.query.limit as string) || 10
        const search = req.query.search ? String(req.query.search) : undefined
        const result = await this.listUseCase.execute({ role, page, limit, search })
        this.ok(res, result, MESSAGES.USER_LIST_SUCCESS)
    }

    async getById(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received get user details request for ID: ${req.params.id}`)
        const result = await this.getUserDetailsUseCase.execute(String(req.params.id))
        this.ok(res, result, 'Lấy thông tin người dùng thành công')
    }

    async create(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received create user request')
        
        let avatarUrl: string | undefined = undefined
        if (req.file) {
            if (CloudinaryService.isConfigured()) {
                try {
                    const fileBuffer = fs.readFileSync(req.file.path)
                    const result = await CloudinaryService.uploadStream(fileBuffer, {
                        folder: 'avatars',
                        public_id: `avatar_${Date.now()}`
                    })
                    avatarUrl = result.secure_url
                } catch (e) {
                    this.logger.warn(`Failed to upload avatar to Cloudinary: ${e}`)
                    avatarUrl = `/uploads/avatars/${req.file.filename}`
                }
            } else {
                avatarUrl = `/uploads/avatars/${req.file.filename}`
            }
        } else if (req.body.avatar) {
            avatarUrl = req.body.avatar
        }

        let classIds: string[] | undefined = undefined
        if (req.body.classIds) {
            if (typeof req.body.classIds === 'string') {
                try {
                    const parsed = JSON.parse(req.body.classIds)
                    classIds = Array.isArray(parsed) ? parsed : [req.body.classIds]
                } catch {
                    classIds = req.body.classIds.split(',').map((s: string) => s.trim()).filter(Boolean)
                }
            } else if (Array.isArray(req.body.classIds)) {
                classIds = req.body.classIds
            }
        }

        const rawData = {
            ...req.body,
            avatar: avatarUrl || undefined,
            classIds
        }

        const dto = CreateUserDto.parse(rawData)
        const result = await this.createUseCase.execute(dto)
        this.created(res, result, MESSAGES.USER_CREATE_SUCCESS)
    }

    async update(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received update user request for ID: ${req.params.id}`)
        
        let avatarUrl: string | undefined = undefined
        if (req.file) {
            if (CloudinaryService.isConfigured()) {
                try {
                    const fileBuffer = fs.readFileSync(req.file.path)
                    const result = await CloudinaryService.uploadStream(fileBuffer, {
                        folder: 'avatars',
                        public_id: `avatar_${Date.now()}`
                    })
                    avatarUrl = result.secure_url
                } catch (e) {
                    this.logger.warn(`Failed to upload avatar to Cloudinary: ${e}`)
                    avatarUrl = `/uploads/avatars/${req.file.filename}`
                }
            } else {
                avatarUrl = `/uploads/avatars/${req.file.filename}`
            }
        } else if (req.body.avatar) {
            avatarUrl = req.body.avatar
        }

        const rawData = {
            ...req.body,
            ...(avatarUrl !== undefined ? { avatar: avatarUrl } : {})
        }

        const dto = UpdateUserDto.parse(rawData)
        const result = await this.updateUseCase.execute({ id: String(req.params.id), dto })
        this.ok(res, result, MESSAGES.USER_UPDATE_SUCCESS)
    }

    async delete(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received delete user request for ID: ${req.params.id}`)
        const result = await this.deleteUseCase.execute(String(req.params.id))
        this.ok(res, result, MESSAGES.USER_DELETE_SUCCESS)
    }

    async bulkDelete(req: Request, res: Response): Promise<void> {
        const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : []
        this.logger.debug(`Received bulk delete request for ${ids.length} user(s)`)
        const result = await this.bulkDeleteUseCase.execute({ ids })
        this.ok(res, result, result.message)
    }

    async toggleLock(req: Request, res: Response): Promise<void> {
        this.logger.debug(`Received toggle lock request for ID: ${req.params.id}`)
        const { locked } = req.body
        const result = await this.toggleLockUseCase.execute({ id: String(req.params.id), locked })
        this.ok(res, result, MESSAGES.USER_TOGGLE_LOCK_SUCCESS)
    }

    async import(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received import users request')
        const dto = ImportUsersBatchDto.parse(req.body)
        const result = await this.importUseCase.execute(dto)
        this.created(res, result, 'Users imported successfully')
    }

    async previewImportStudentsExcel(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received preview import students excel request')
        const file = req.file
        if (!file) {
            res.status(400).json({ status: 'error', message: 'File Excel là bắt buộc', data: null })
            return
        }

        try {
            const fileBuffer = fs.readFileSync(file.path)

            const result = await this.previewImportStudentsExcelUseCase.execute({
                fileBuffer,
                fileName: file.originalname
            })
            this.ok(res, result, 'Xem trước danh sách sinh viên thành công')
        } finally {
            // Cleanup the file after reading it into buffer
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path)
            }
        }
    }

    async importStudentsExcel(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received import students excel request')
        const file = req.file
        if (!file) {
            res.status(400).json({ status: 'error', message: 'File Excel là bắt buộc', data: null })
            return
        }

        // authenticate gắn req.user = { id, ... } — không phải userId
        const importedByUserId = req.user?.id || ''

        try {
            const fileBuffer = fs.readFileSync(file.path)

            const result = await this.importStudentsExcelUseCase.execute({
                fileBuffer,
                fileName: file.originalname,
                fileUrl: `/uploads/imports/${file.filename}`,
                importedByUserId
            })
            this.created(res, result, 'Đã nhập danh sách sinh viên từ Excel thành công')
        } finally {
            // Cleanup the file after reading it into buffer
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path)
            }
        }
    }

    async previewImportLecturersExcel(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received preview import lecturers excel request')
        const file = req.file
        if (!file) {
            res.status(400).json({ status: 'error', message: 'File Excel là bắt buộc', data: null })
            return
        }

        try {
            const fileBuffer = fs.readFileSync(file.path)

            const result = await this.previewImportLecturersExcelUseCase.execute({
                fileBuffer,
                fileName: file.originalname
            })
            this.ok(res, result, 'Xem trước danh sách giảng viên thành công')
        } finally {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path)
            }
        }
    }

    async importLecturersExcel(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received import lecturers excel request')
        const file = req.file
        if (!file) {
            res.status(400).json({ status: 'error', message: 'File Excel là bắt buộc', data: null })
            return
        }

        const importedByUserId = req.user?.id || ''

        try {
            const fileBuffer = fs.readFileSync(file.path)

            const result = await this.importLecturersExcelUseCase.execute({
                fileBuffer,
                fileName: file.originalname,
                fileUrl: `/uploads/imports/${file.filename}`,
                importedByUserId
            })
            this.created(res, result, 'Đã nhập danh sách giảng viên từ Excel thành công')
        } finally {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path)
            }
        }
    }

    async importTeachingAssignmentsExcel(req: Request, res: Response): Promise<void> {
        this.logger.debug('Received import teaching assignments excel request')
        const file = req.file
        if (!file) {
            res.status(400).json({ status: 'error', message: 'File Excel là bắt buộc', data: null })
            return
        }

        const importedByUserId = req.user?.id || ''

        try {
            const fileBuffer = fs.readFileSync(file.path)

            const result = await this.importTeachingAssignmentsExcelUseCase.execute({
                fileBuffer,
                fileName: file.originalname,
                fileUrl: `/uploads/imports/${file.filename}`,
                importedByUserId
            })
            this.created(res, result, 'Đã nhập danh sách phân công giảng dạy từ Excel thành công')
        } finally {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path)
            }
        }
    }
}
