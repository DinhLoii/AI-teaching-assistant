import type { IRefreshTokenRepository } from '../../domain/repositories/refresh-token-repository.interface.js'
import { RefreshToken } from '../../domain/entities/refresh-token.entity.js'

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: any) {}

  async findByToken(token: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { Token: token },
    })

    if (!record) return null

    return RefreshToken.restore(
      record.Id,
      record.UserId,
      record.Token,
      record.ExpiresAt,
      record.IsRevoked
    )
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    await this.prisma.refreshToken.upsert({
      where: { Id: refreshToken.id },
      update: {
        UserId: refreshToken.userId,
        Token: refreshToken.token,
        ExpiresAt: refreshToken.expiresAt,
        IsRevoked: refreshToken.isRevoked,
      },
      create: {
        Id: refreshToken.id,
        UserId: refreshToken.userId,
        Token: refreshToken.token,
        ExpiresAt: refreshToken.expiresAt,
        IsRevoked: refreshToken.isRevoked,
      },
    })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        UserId: userId,
        IsRevoked: false,
      },
      data: {
        IsRevoked: true,
      },
    })
  }
}
