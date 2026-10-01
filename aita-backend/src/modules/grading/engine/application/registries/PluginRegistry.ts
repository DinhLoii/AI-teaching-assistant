// @ts-nocheck
import { IAssessmentPlugin } from '../../core/contracts/IAssessmentPlugin';
import { PluginCapability } from '../../core/contracts/PluginCapability';
import { AssessmentManifest } from '../../core/domain/submission/AssessmentManifest';

export class PluginRegistry {
    private readonly plugins: Map<string, IAssessmentPlugin> = new Map();

    /**
     * Registers a plugin instance.
     */
    public register(plugin: IAssessmentPlugin): void {
        this.plugins.set(plugin.pluginId, plugin);
    }

    /**
     * Retrieves all registered plugins.
     */
    public getAllPlugins(): IAssessmentPlugin[] {
        return Array.from(this.plugins.values());
    }
}

export class CapabilityResolver {
    constructor(private registry: PluginRegistry) {}

    /**
     * Resolves the correct plugins to run based on the submission's manifest.
     */
    public resolveForManifest(manifest: AssessmentManifest): IAssessmentPlugin[] {
        return this.registry.getAllPlugins().filter(plugin => {
            const caps = plugin.capabilities;
            return caps.supportedProjectTypes.includes(manifest.projectType) &&
                   caps.supportedLanguages.includes(manifest.language);
        });
    }

    /**
     * Resolves plugins capable of generating a specific required evidence type.
     */
    public resolveForEvidenceType(evidenceType: string): IAssessmentPlugin[] {
        return this.registry.getAllPlugins().filter(plugin => {
            return plugin.capabilities.supportedEvidenceTypes.includes(evidenceType);
        });
    }
}

