// @ts-nocheck
export interface DraftBlueprint {
    id: string;
    assignmentTitle: string;
    description: string;
    projectType: string;
    language?: string;
    framework?: string;
    totalMarks?: number | null;
    requirements: any[];
    version: string;
    status: 'draft' | 'review' | 'published';
    originalContent?: string; // Full HTML content for test case extraction
}

export class BlueprintService {
    private blueprints: Map<string, DraftBlueprint> = new Map();

    public async saveDraftAsync(blueprint: DraftBlueprint): Promise<void> {
        blueprint.version = '1.0.0-draft';
        this.blueprints.set(blueprint.id, blueprint);
        console.log(`[BlueprintService] Saved draft ${blueprint.id}`);
    }

    public async publishAsync(blueprintId: string): Promise<DraftBlueprint> {
        const blueprint = this.blueprints.get(blueprintId);
        if (!blueprint) throw new Error('Blueprint not found');
        
        // Deep copy to ensure immutability of published version
        const published = JSON.parse(JSON.stringify(blueprint)) as DraftBlueprint;
        published.status = 'published';
        published.version = '1.0.0';
        
        // In a real implementation, we would increment semantic versioning if updating an existing blueprint
        this.blueprints.set(published.id, published);
        console.log(`[BlueprintService] Published blueprint ${blueprintId} v${published.version}`);
        
        return published;
    }
}

