// @ts-nocheck
/**
 * Declares the capabilities of a plugin so the PluginRegistry can resolve it dynamically.
 */
export interface PluginCapability {
    pluginId: string;
    
    // e.g., ['backend', 'frontend', 'fullstack']
    supportedProjectTypes: string[];
    
    // e.g., ['csharp', 'typescript']
    supportedLanguages: string[];
    
    // e.g., ['runtime.http.response', 'runtime.http.status']
    supportedEvidenceTypes: string[];
    
    // e.g., ['RuntimeTestDefinition']
    supportedTestDefinitions: string[];
}

