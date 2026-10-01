import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository } from '../../domain/repositories/user-repository.interface.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { UserResponseDto } from '../dtos/user.dto.js'
import type { UserRoleType } from '../../../auth/domain/entities/user.entity.js'

export interface ListUsersInput {
    role?: string
    page?: number
    limit?: number
    search?: string
}

export class ListUsersUseCase implements IUseCase<ListUsersInput, UserResponseDto[]> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly logger: ILogger
    ) { }

    async execute({ role = 'all', page = 1, limit = 10, search }: ListUsersInput): Promise<UserResponseDto[]> {
        this.logger.debug(`Fetching users: role=${role}, page=${page}, search=${search}`)
        
        const filter = {
            ...(role !== 'all' ? { role: role.toUpperCase() as UserRoleType } : {}),
            ...(search ? { search } : {})
        }
        const skip = (page - 1) * limit
        
        const users = await this.userRepo.findMany(filter, { skip, take: limit })
        return users.map(user => UserResponseDto.from(user))
    }
}
