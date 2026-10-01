import type {
  IActivityRepository,
  CreateActivityData,
  ActivityRecord,
  ActivityFilter,
} from '../../domain/repositories/activity-repository.interface.js'

export class PrismaActivityRepository implements IActivityRepository {
  constructor(private readonly client: any) {}

  async create(data: CreateActivityData): Promise<void> {
    await this.client.auditLog.create({
      data: {
        UserId: data.userId,
        Action: data.action,
        EntityName: data.entity,
        EntityId: data.entityId,
        NewValue: data.metadata,
      },
    })
  }

  async findMany(take: number = 20): Promise<ActivityRecord[]> {
    const raw = await this.client.auditLog.findMany({
      take,
      orderBy: { CreatedAt: 'desc' },
      include: { User: true },
    })

    return raw.map((r: any) => ({
      id: r.Id,
      userId: r.UserId,
      action: r.Action,
      entity: r.EntityName,
      entityId: r.EntityId,
      metadata: r.NewValue,
      createdAt: r.CreatedAt,
      userName: r.User?.FullName,
    }))
  }

  async count(filter?: ActivityFilter): Promise<number> {
    const where: any = {}
    if (filter?.userId) where.UserId = filter.userId
    if (filter?.action) where.Action = filter.action
    return this.client.auditLog.count({ where })
  }
}
