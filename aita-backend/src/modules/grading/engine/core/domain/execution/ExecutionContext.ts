// @ts-nocheck
import { Artifact } from '../artifact/Artifact';

/**
 * The strict context provided to plugins. 
 * Plugins must NEVER access Docker, Databases, or host systems directly.
 */
export interface ExecutionContext {
    submissionId: string;
    
    // Base URL mapping to the running container (e.g., http://localhost:8080)
    apiUrl?: string;
    
    // Debug port for browser automation if running UI
    browserEndpoint?: string;
    
    // Artifacts collected before plugin execution (e.g., build logs)
    artifacts: Artifact[];
    
    // Ephemeral directory mapped into the sandbox (if file analysis is required)
    sandboxWorkspacePath?: string;

    // Optional container ID for teardown
    containerId?: string;
}

