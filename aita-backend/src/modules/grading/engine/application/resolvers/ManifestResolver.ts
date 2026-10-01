// @ts-nocheck
import { AssessmentManifest } from '../../core/domain/submission/AssessmentManifest';
import { IObjectStorage } from '../../core/contracts/IObjectStorage';

export class ProjectTypeResolver {
    /**
     * Attempts to automatically detect the project type and framework by inspecting the source zip structure.
     */
    public async detectAsync(storage: IObjectStorage, sourceCodeUri: string): Promise<Partial<AssessmentManifest>> {
        // In a real implementation, this would download the ZIP and inspect file extensions:
        // .csproj -> backend, csharp, dotnet
        // package.json -> frontend/backend, typescript/javascript, node/react
        // pom.xml -> backend, java, spring
        
        // Mocking a fallback detection for Sprint 1
        return {
            projectType: 'backend',
            language: 'unknown',
            framework: 'net8'
        };
    }
}

export class ManifestResolver {
    constructor(
        private storage: IObjectStorage,
        private typeResolver: ProjectTypeResolver
    ) {}

    /**
     * Resolves the AssessmentManifest. 
     * If missing from the student's submission, falls back to automatic detection.
     */
    public async resolveAsync(sourceCodeUri: string, providedManifest?: AssessmentManifest): Promise<AssessmentManifest> {
        if (providedManifest) {
            return providedManifest; // Trust explicit student manifest
        }

        // Fallback to auto-detection
        const detected = await this.typeResolver.detectAsync(this.storage, sourceCodeUri);
        
        return {
            projectType: detected.projectType || 'backend',
            language: detected.language || 'csharp',
            framework: detected.framework || 'unknown'
        };
    }
}
