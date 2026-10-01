import { IConfigRepository } from '../../domain/repositories/config-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class ListProjectTypesUseCase {
    constructor(private readonly configRepo: IConfigRepository) { }

    async execute() {
        return await this.configRepo.listProjectTypes()
    }
}

export class GetProjectTypeUseCase {
    constructor(private readonly configRepo: IConfigRepository) { }

    async execute(code: string) {
        const pt = await this.configRepo.getProjectType(code)
        if (!pt) throw new NotFoundError(MESSAGES.PROJECT_TYPE_NOT_FOUND)
        return pt
    }
}

export class UpdateProjectTypeUseCase {
    constructor(private readonly configRepo: IConfigRepository) { }

    async execute(code: string, data: any) {
        const pt = await this.configRepo.getProjectType(code)
        if (!pt) throw new NotFoundError(MESSAGES.PROJECT_TYPE_NOT_FOUND)

        pt.updateConfig(data)
        await this.configRepo.saveProjectType(pt)
        return pt
    }
}
