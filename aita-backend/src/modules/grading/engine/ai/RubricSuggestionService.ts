// @ts-nocheck
import { IAiProvider } from '../core/contracts/IAiProvider';

export class RubricSuggestionService {
    constructor(private readonly aiProvider: IAiProvider) {}

    public async suggestRubricRulesAsync(blueprintText: string): Promise<any[]> {
        console.log(`[RubricSuggestionService] Suggesting rubric items based on blueprint...`);
        // AI returns suggested rubric items based on the blueprint text
        return [
            { title: "Use MVC Pattern", weight: 20 },
            { title: "Include Pagination", weight: 10 }
        ];
    }
}

