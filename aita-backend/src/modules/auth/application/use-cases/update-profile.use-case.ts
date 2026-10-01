import { AppError } from '../../../../shared/application/app.error.js'
import { IUserRepository } from '../../../users/domain/repositories/user-repository.interface.js'
import { UpdateProfileRequestDto, AuthResponseDto } from '../dtos/auth.dto.js'
import { IUseCase } from '../../../../shared/application/base-use-case.js'

export class UpdateProfileUseCase implements IUseCase<{ userId: string; dto: UpdateProfileRequestDto; avatarUrl?: string }, AuthResponseDto> {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: { userId: string; dto: UpdateProfileRequestDto; avatarUrl?: string }): Promise<AuthResponseDto> {
    const { userId, dto, avatarUrl } = input
    const user = await this.userRepo.findById(userId)
    
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'Không tìm thấy người dùng', 404)
    }

    user.updateProfile({
      fullName: dto.fullName,
      phone: dto.phone,
      avatar: avatarUrl
    })

    await this.userRepo.save(user)

    return AuthResponseDto.from('', '', user)
  }
}
