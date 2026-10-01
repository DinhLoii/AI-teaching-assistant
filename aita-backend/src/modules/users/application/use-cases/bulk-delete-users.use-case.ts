import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IUserRepository, BulkDeleteResult } from '../../domain/repositories/user-repository.interface.js'
import type { ILogger } from '../../../../shared/application/ports/logger.interface.js'
import { AppError } from '../../../../shared/application/app.error.js'

export interface BulkDeleteUsersInput {
    ids: string[]
}

export interface BulkDeleteUsersOutput extends BulkDeleteResult {
    success: boolean
    message: string
}

/**
 * Deletes several users in one request.
 *
 * The client used to call DELETE /users/:id once per selected row, all in
 * parallel. That deadlocked the per-user transactions against each other and
 * left the batch half-applied, so the next attempt hit ids that no longer
 * existed and failed with USER_NOT_FOUND. Here the repository walks the ids
 * sequentially and reports each id as deleted, skipped (already gone) or
 * failed, so a partial run is always safe to repeat.
 */
export class BulkDeleteUsersUseCase implements IUseCase<BulkDeleteUsersInput, BulkDeleteUsersOutput> {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly logger: ILogger
    ) { }

    async execute(input: BulkDeleteUsersInput): Promise<BulkDeleteUsersOutput> {
        const ids = Array.from(new Set((input?.ids ?? []).map(id => String(id).trim()).filter(Boolean)))

        if (ids.length === 0) {
            throw new AppError('INVALID_INPUT', 'Danh sách người dùng cần xoá đang trống', 400)
        }

        this.logger.info(`Bulk deleting ${ids.length} user(s)`)

        const result = await this.userRepo.deleteMany(ids)

        this.logger.info(
            `Bulk delete finished: ${result.deleted.length} deleted, ` +
            `${result.skipped.length} skipped, ${result.failed.length} failed`
        )

        const parts = [`Đã xoá ${result.deleted.length} người dùng`]
        if (result.skipped.length > 0) parts.push(`${result.skipped.length} tài khoản đã bị xoá trước đó`)
        if (result.failed.length > 0) parts.push(`${result.failed.length} tài khoản xoá không thành công`)

        return {
            ...result,
            success: result.failed.length === 0,
            message: parts.join(', ')
        }
    }
}
