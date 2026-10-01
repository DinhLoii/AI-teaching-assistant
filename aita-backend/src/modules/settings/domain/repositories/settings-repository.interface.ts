export interface ISettingsRepository {
    getSystemConfig(): Promise<any[]>
    updateSystemConfig(key: string, value: string): Promise<void>
    getClassOptions(where: any): Promise<any[]>
    getLecturerOptions(): Promise<any[]>
    getAssignmentOptions(): Promise<any[]>
}
