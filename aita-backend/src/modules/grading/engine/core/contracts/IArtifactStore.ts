// @ts-nocheck
import { Artifact, ArtifactType } from '../domain/artifact/Artifact';

export interface IArtifactStore {
    /**
     * Stores an artifact buffer and returns the registered Artifact domain model.
     */
    storeArtifactAsync(submissionId: string, type: ArtifactType, buffer: Buffer, filename: string): Promise<Artifact>;
    
    /**
     * Retrieves an artifact's content.
     */
    getArtifactAsync(artifactId: string): Promise<Buffer>;
}

