import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { UserResponseDto } from '../dtos/user.dto.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export interface ToggleLockInput {
    id: string
    locked: boolean
}

export class ToggleLockUseCase implements IUseCase<ToggleLockInput, UserResponseDto> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly logger: ILogger
    ) { }

    async execute({ id, locked }: ToggleLockInput): Promise<UserResponseDto> {
        this.logger.info(`Toggling lock for user: ${id}, locked=${locked}`)
        
        const user = await this.userRepo.findById(id)
        if (!user) throw new NotFoundError(MESSAGES.USER_NOT_FOUND)

        if (locked) {
            user.deactivate()
        } else {
            user.activate()
        }

        await this.userRepo.save(user)
        return UserResponseDto.from(user)
    }
}
