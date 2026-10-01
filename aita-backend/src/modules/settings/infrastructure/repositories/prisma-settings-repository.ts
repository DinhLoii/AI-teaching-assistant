import { ISettingsRepository } from '../../domain/repositories/settings-repository.interface.js'

export class PrismaSettingsRepository implements ISettingsRepository {
    constructor(private readonly prisma: any) { }

    async getSystemConfig(): Promise<any[]> {
        return this.prisma.systemConfig.findMany()
    }

    async updateSystemConfig(key: string, value: string): Promise<void> {
        await this.prisma.systemConfig.upsert({
            where: { Key: key },
            create: { Key: key, Value: value },
            update: { Value: value },
        })
    }

    async getClassOptions(where: any): Promise<any[]> {
        return this.prisma.class.findMany({
            where,
            include: { Subject: true } as any,
            orderBy: { ClassCode: 'asc' },
        })
    }

    async getLecturerOptions(): Promise<any[]> {
        return this.prisma.user.findMany({
            where: {
                UserRole: { some: { Role: { RoleName: 'LECTURER' } } },
                Status: 'Active',
            } as any,
            orderBy: { FullName: 'asc' },
        })
    }

    async getAssignmentOptions(): Promise<any[]> {
        return this.prisma.exam.findMany({
            orderBy: { Title: 'asc' },
        })
    }
}
