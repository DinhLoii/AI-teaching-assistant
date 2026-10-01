// @ts-nocheck
import { IAiProvider, DocumentImage } from '../core/contracts/IAiProvider';

export class RequirementParserService {
    constructor(private readonly aiProvider: IAiProvider) {}

    /**
     * Parses raw assignment text into a structured Draft Blueprint using AI.
     * When documentImages are provided (from uploaded .docx files), they are sent
     * alongside the text to enable the AI to analyze DB schemas, UI mockups, etc.
     */
    public async parseRequirementsAsync(rawText: string, documentImages?: DocumentImage[], subject?: string | null): Promise<any> {
        console.log(`[RequirementParserService] Parsing requirements via AI... (images: ${documentImages?.length || 0}, subject: ${subject || 'unknown'})`);

        try {
            const draftBlueprint = await this.aiProvider.parseRequirementsAsync(rawText, documentImages, subject);
            
            // Add ID and Status before returning
            return {
                ...draftBlueprint,
                id: `bp-${Date.now()}`,
                version: '1.0.0',
                status: 'draft',
                originalContent: rawText
            };
        } catch (error) {
            console.error('[RequirementParserService] AI Parsing failed, returning fallback.', error);
            // Fallback for when API keys are missing or invalid
            return {
                id: `bp-${Date.now()}`,
                version: '1.0.0',
                status: 'draft',
                projectType: 'backend',
                language: 'csharp',
                framework: 'net8',
                assignmentTitle: 'Extracted Title (Fallback)',
                description: 'Short description',
                requirements: [
                    {
                        id: 'req-fallback-1',
                        groupId: 'g1',
                        title: 'Fallback Requirement',
                        description: 'This is a fallback requirement because parsing failed.',
                        marks: 10,
                        complexity: 'low',
                        isUIVisible: false,
                        isCRUD: false,
                        isWrittenAnswer: false,
                        isArchitectureCode: false,
                        isDiagramTask: false,
                        isSoftDelete: false
                    }
                ]
            };
        }
    }
}

