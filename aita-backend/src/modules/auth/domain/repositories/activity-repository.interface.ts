/**
 * Activity repository port — domain-owned interface.
 * NO Prisma types allowed here.
 */

export interface CreateActivityData {
  userId?: string
  action: string
  entity: string
  entityId?: string
  metadata?: string
}

export interface ActivityRecord {
  id: string
  userId: string | null
  action: string | null
  entity: string | null
  entityId: string | null
  metadata: string | null
  createdAt: Date | null
  userName?: string | null
}

export interface ActivityFilter {
  userId?: string
  action?: string
}

export interface IActivityRepository {
  create(data: CreateActivityData): Promise<void>
  findMany(take?: number): Promise<ActivityRecord[]>
  count(filter?: ActivityFilter): Promise<number>
}
