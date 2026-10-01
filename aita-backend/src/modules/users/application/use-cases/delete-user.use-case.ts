import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class DeleteUserUseCase implements IUseCase<string, { success: boolean; message: string }> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly logger: ILogger
    ) { }

    async execute(id: string): Promise<{ success: boolean; message: string }> {
        this.logger.info(`Deleting user: ${id}`)
        
        const user = await this.userRepo.findById(id)
        if (!user) throw new NotFoundError(MESSAGES.USER_NOT_FOUND)

        await this.userRepo.delete(id)

        this.logger.info(`User hard deleted: ${id}`)
        return { success: true, message: MESSAGES.USER_DELETE_SUCCESS }
    }
}
