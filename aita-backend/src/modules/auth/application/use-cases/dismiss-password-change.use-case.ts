import { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { ForbiddenError } from '../../../../shared/application/app.error.js'

export class DismissPasswordChangeUseCase implements IUseCase<string, void> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId)
    if ((user as any)?.requirePasswordChange) throw new ForbiddenError('Vui lòng đổi mật khẩu trước khi tiếp tục')
  }
}
