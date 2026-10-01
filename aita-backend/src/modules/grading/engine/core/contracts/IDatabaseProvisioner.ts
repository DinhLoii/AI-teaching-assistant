// @ts-nocheck
import { DatabaseManifest } from '../domain/submission/AssessmentManifest';

export interface DatabaseProvisionResult {
    success: boolean;
    containerId?: string;
    connectionString?: string;
    error?: string;
    instanceId?: string;
}

/**
 * Abstraction for providing ephemeral databases to sandboxes.
 */
export interface IDatabaseProvisioner {
    /**
     * Provisions a temporary database matching the manifest requirements.
     * Applies migrations and seeds data if provided.
     */
    provisionDatabaseAsync(manifest: DatabaseManifest): Promise<DatabaseProvisionResult>;

    /**
     * Tears down the ephemeral database.
     */
    destroyDatabaseAsync(containerId: string): Promise<void>;
}

