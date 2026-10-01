import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { ListProjectTypesUseCase, GetProjectTypeUseCase, UpdateProjectTypeUseCase } from '../application/use-cases/config.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class ConfigController extends BaseController {
    constructor(
        private readonly listProjectTypesUseCase: ListProjectTypesUseCase,
        private readonly getProjectTypeUseCase: GetProjectTypeUseCase,
        private readonly updateProjectTypeUseCase: UpdateProjectTypeUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async listProjectTypes(_req: Request, res: Response): Promise<void> {
        this.logger.debug('Fetching list of project types')
        const result = await this.listProjectTypesUseCase.execute()
        this.ok(res, result, MESSAGES.CONFIG_LIST_SUCCESS)
    }

    async getProjectType(req: Request, res: Response): Promise<void> {
        const code = String(req.params.code)
        this.logger.debug(`Fetching project type: ${code}`)
        const result = await this.getProjectTypeUseCase.execute(code)
        this.ok(res, result, MESSAGES.CONFIG_GET_SUCCESS)
    }

    async updateProjectType(req: Request, res: Response): Promise<void> {
        const code = String(req.params.code)
        this.logger.info(`Updating project type: ${code}`)
        const result = await this.updateProjectTypeUseCase.execute(code, req.body)
        this.ok(res, result, MESSAGES.CONFIG_UPDATE_SUCCESS)
    }
}
