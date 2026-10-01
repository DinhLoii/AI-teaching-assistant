import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { GetSystemConfigUseCase, UpdateSystemConfigUseCase, GetOptionsUseCase } from '../application/use-cases/settings.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

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
        const result = await this.getSystemConfigUseCase.execute()
        this.ok(res, result, MESSAGES.SETTINGS_GET_SUCCESS)
    }

    async updateSystemConfig(req: Request, res: Response): Promise<void> {
        this.logger.info('Updating system config')
        const result = await this.updateSystemConfigUseCase.execute(req.body)
        this.ok(res, result, MESSAGES.SETTINGS_UPDATE_SUCCESS)
    }

    async classOptions(req: Request, res: Response): Promise<void> {
        const user = (req as any).user
        const result = await this.getOptionsUseCase.getClassOptions(user)
        this.ok(res, result, MESSAGES.OPTIONS_CLASSES_SUCCESS)
    }

    async lecturerOptions(_req: Request, res: Response): Promise<void> {
        const result = await this.getOptionsUseCase.getLecturerOptions()
        this.ok(res, result, MESSAGES.OPTIONS_LECTURERS_SUCCESS)
    }

    async assignmentOptions(_req: Request, res: Response): Promise<void> {
        const result = await this.getOptionsUseCase.getAssignmentOptions()
        this.ok(res, result, MESSAGES.OPTIONS_EXAMS_SUCCESS)
    }
}
