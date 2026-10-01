export interface IAiRepository {
    logInteraction(userId: string, model: string, prompt: string, response: string): Promise<void>;
    listUserInteractions(userId: string, limit?: number): Promise<any[]>;
}
