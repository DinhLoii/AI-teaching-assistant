// @ts-nocheck
import { PluginCapability } from './PluginCapability';

/**
 * Base interface for all assessment plugins.
 */
export interface IAssessmentPlugin {
    readonly pluginId: string;
    readonly version: string;
    readonly capabilities: PluginCapability;

    /**
     * Called once when the worker starts up to initialize the plugin.
     */
    initializeAsync(config: any): Promise<void>;

    /**
     * Disposes of any resources held by the plugin.
     */
    disposeAsync(): Promise<void>;
}

