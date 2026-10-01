import { ISettingsRepository } from '../../domain/repositories/settings-repository.interface.js'

const DEFAULTS: Record<string, string> = {
    appName: 'AITA',
    organization: 'FPT University',
    sessionTimeout: '60',
    aiEndpoint: '',
    aiModel: 'stub',
    aiTimeout: '60',
    aiStubMode: 'true',
}

export class GetSystemConfigUseCase {
    constructor(private readonly settingsRepo: ISettingsRepository) { }

    async execute() {
        const rows = await this.settingsRepo.getSystemConfig()
        return { ...DEFAULTS, ...Object.fromEntries(rows.map((r: any) => [r.Key, r.Value])) }
    }
}

export class UpdateSystemConfigUseCase {
    constructor(private readonly settingsRepo: ISettingsRepository) { }

    async execute(config: Record<string, string>) {
        for (const [key, value] of Object.entries(config)) {
            await this.settingsRepo.updateSystemConfig(key, String(value))
        }
        return config
    }
}

export class GetOptionsUseCase {
    constructor(private readonly settingsRepo: ISettingsRepository) { }

    async getClassOptions(user: { id: string; role: string }) {
        let where: any = {}
        if (user.role === 'LECTURER') where.InstructorClass = { some: { UserId: user.id } }
        if (user.role === 'STUDENT') where.StudentClass = { some: { UserId: user.id } }

        const rows = await this.settingsRepo.getClassOptions(where)
        return rows.map((r: any) => ({
            value: r.Id,
            label: `${r.ClassCode} - ${r.Subject?.SubjectCode || ''}`
        }))
    }

    async getLecturerOptions() {
        const rows = await this.settingsRepo.getLecturerOptions()
        console.log('--- DEBUG getLecturerOptions ---')
        console.log(rows)
        return rows.map((r: any) => ({
            value: r.Id,
            label: `${r.FullName} (${r.Email})`
        }))
    }

    async getAssignmentOptions() {
        const rows = await this.settingsRepo.getAssignmentOptions()
        return rows.map((r: any) => ({
            value: r.Id,
            label: r.Title
        }))
    }
}
