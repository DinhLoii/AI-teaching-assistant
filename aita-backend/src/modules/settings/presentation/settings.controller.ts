import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { GetSystemConfigUseCase, UpdateSystemConfigUseCase, GetOptionsUseCase } from '../application/use-cases/settings.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

import { memoryCache } from '../../../shared/infrastructure/memory-cache.js'

export class SettingsController extends BaseController {
    constructor(
        private readonly getSystemConfigUseCase: GetSystemConfigUseCase,
        private readonly updateSystemConfigUseCase: UpdateSystemConfigUseCase,
        private readonly getOptionsUseCase: GetOptionsUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async getSystemConfig(_req: Request, res: Response): Promise<void> {
        this.logger.debug('Fetching system config')
        const cached = memoryCache.get('system_config_global')
        if (cached) {
            this.ok(res, cached, MESSAGES.SETTINGS_GET_SUCCESS)
            return
        }
        const result = await this.getSystemConfigUseCase.execute()
        memoryCache.set('system_config_global', result, 120)
        this.ok(res, result, MESSAGES.SETTINGS_GET_SUCCESS)
    }

    async updateSystemConfig(req: Request, res: Response): Promise<void> {
        this.logger.info('Updating system config')
        memoryCache.del('system_config_global')
        const result = await this.updateSystemConfigUseCase.execute(req.body)
        this.ok(res, result, MESSAGES.SETTINGS_UPDATE_SUCCESS)
    }

    async classOptions(req: Request, res: Response): Promise<void> {
        const user = (req as any).user
        const cacheKey = `options_classes_${user?.id || 'all'}_${user?.role || 'anon'}`
        const cached = memoryCache.get(cacheKey)
        if (cached) {
            this.ok(res, cached, MESSAGES.OPTIONS_CLASSES_SUCCESS)
            return
        }
        const result = await this.getOptionsUseCase.getClassOptions(user)
        memoryCache.set(cacheKey, result, 90)
        this.ok(res, result, MESSAGES.OPTIONS_CLASSES_SUCCESS)
    }

    async lecturerOptions(_req: Request, res: Response): Promise<void> {
        const cached = memoryCache.get('options_lecturers_list')
        if (cached) {
            this.ok(res, cached, MESSAGES.OPTIONS_LECTURERS_SUCCESS)
            return
        }
        const result = await this.getOptionsUseCase.getLecturerOptions()
        memoryCache.set('options_lecturers_list', result, 120)
        this.ok(res, result, MESSAGES.OPTIONS_LECTURERS_SUCCESS)
    }

    async assignmentOptions(_req: Request, res: Response): Promise<void> {
        const cached = memoryCache.get('options_assignments_list')
        if (cached) {
            this.ok(res, cached, MESSAGES.OPTIONS_EXAMS_SUCCESS)
            return
        }
        const result = await this.getOptionsUseCase.getAssignmentOptions()
        memoryCache.set('options_assignments_list', result, 90)
        this.ok(res, result, MESSAGES.OPTIONS_EXAMS_SUCCESS)
    }
}
