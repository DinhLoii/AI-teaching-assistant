// @ts-nocheck
import { IRuntimeStrategy } from '../../core/contracts/IRuntimeStrategy';
import { AssessmentManifest } from '../../core/domain/submission/AssessmentManifest';
import { RuntimeEnvironment } from './EnvironmentResolver';

export class RuntimeStrategyResolver {
    constructor(private availableStrategies: IRuntimeStrategy[]) {}

    /**
     * Dynamically selects the correct runtime strategy based on manifest and environment.
     */
    public resolveStrategy(manifest: AssessmentManifest, environment: RuntimeEnvironment): IRuntimeStrategy {
        // Example logic:
        // if environment is 'docker-compose', return DockerComposeStrategy
        // if manifest is 'csharp' and environment is 'local', return DotnetRuntimeStrategy
        
        // For Sprint 2, we just find a strategy matching the language name (e.g., 'csharp' -> 'DotnetRuntimeStrategy')
        // In a full implementation, strategies would declare their capabilities similar to Plugins.
        
        const strategy = this.availableStrategies.find(s => {
            const sid = s.strategyId.toLowerCase();
            const lang = manifest.language.toLowerCase();
            return sid.includes(lang) || (lang === 'csharp' && sid.includes('dotnet'));
        });
        
        if (!strategy) {
            throw new Error(`No RuntimeStrategy found for language: ${manifest.language}`);
        }
        
        return strategy;
    }
}

