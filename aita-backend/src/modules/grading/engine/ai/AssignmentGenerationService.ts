// @ts-nocheck
import { IAiProvider } from '../core/contracts/IAiProvider';

export class AssignmentGenerationService {
    constructor(private readonly aiProvider: IAiProvider) {}

    public async generateAssignmentIdeaAsync(topic: string, difficulty: string): Promise<string> {
        console.log(`[AssignmentGenerationService] Generating assignment idea for ${topic}...`);
        return `Build a ${difficulty} REST API for ${topic}.`;
    }
}

