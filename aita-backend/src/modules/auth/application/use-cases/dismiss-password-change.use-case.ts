import { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import { IUseCase } from '../../../../shared/application/base-use-case.js'

export class DismissPasswordChangeUseCase implements IUseCase<string, void> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    await this.userRepo.setRequirePasswordChange(userId, false)
  }
}
