// @ts-nocheck
import { IAiProvider, ParsedBlueprint, ParsedRequirement } from '../core/contracts/IAiProvider';

export class OpenAiProvider implements IAiProvider {
    public async parseRequirementsAsync(prompt: string): Promise<ParsedBlueprint> {
        console.log(`[OpenAiProvider] Sending parsing request to OpenAI (gpt-4o-mini)...`);
        return { projectType: 'backend', language: 'csharp', framework: 'net8', assignmentTitle: 'Untitled', description: '', totalMarks: null, requirements: [] };
    }

    public async generateFeedbackAsync(context: string, payload: any): Promise<string> {
        return `[OpenAI] Feedback for context: ${context.substring(0, 20)}...`;
    }
    public async generateRubricRulesAsync(requirements: ParsedRequirement[], projectType: string, assignmentDescription?: string): Promise<any[]> { return []; }
    public async generateAssignmentContentAsync(prompt: string): Promise<string> { return ''; }
    public async evaluateImageAsync(imageBuffers: { buffer: Buffer, isMockup?: boolean }[], requirement: string): Promise<{ score: number; explanation: string, relevantImageIndices?: number[] }> { return { score: 0, explanation: '' }; }
}

export class ClaudeProvider implements IAiProvider {
    public async parseRequirementsAsync(prompt: string): Promise<ParsedBlueprint> {
        console.log(`[ClaudeProvider] Sending parsing request to Claude (opus)...`);
        return { projectType: 'backend', language: 'csharp', framework: 'net8', assignmentTitle: 'Untitled', description: '', totalMarks: null, requirements: [] };
    }

    public async generateFeedbackAsync(context: string, payload: any): Promise<string> {
        return `[Claude] Feedback for context: ${context.substring(0, 20)}...`;
    }
    public async generateRubricRulesAsync(requirements: ParsedRequirement[], projectType: string, assignmentDescription?: string): Promise<any[]> { return []; }
    public async generateAssignmentContentAsync(prompt: string): Promise<string> { return ''; }
    public async evaluateImageAsync(imageBuffers: { buffer: Buffer, isMockup?: boolean }[], requirement: string): Promise<{ score: number; explanation: string, relevantImageIndices?: number[] }> { return { score: 0, explanation: '' }; }
}

export class AiProviderFactory {
    public static createProvider(providerName: 'OpenAI' | 'Claude'): IAiProvider {
        switch (providerName) {
            case 'OpenAI': return new OpenAiProvider();
            case 'Claude': return new ClaudeProvider();
            default: throw new Error(`Unknown provider: ${providerName}`);
        }
    }
}

