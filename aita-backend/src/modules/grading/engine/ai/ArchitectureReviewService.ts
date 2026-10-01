// @ts-nocheck
import { IAiProvider } from '../core/contracts/IAiProvider';

export class ArchitectureReviewService {
    constructor(private readonly aiProvider: IAiProvider) {}

    public async reviewArchitectureAsync(codeDump: string): Promise<string> {
        console.log(`[ArchitectureReviewService] Generating qualitative review...`);
        // AI performs qualitative review
        return await this.aiProvider.generateFeedbackAsync("Architecture Review", codeDump);
    }
}

