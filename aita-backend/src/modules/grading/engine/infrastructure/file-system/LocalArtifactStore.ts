// @ts-nocheck
import { IArtifactStore } from '../../core/contracts/IArtifactStore';
import { Artifact, ArtifactType } from '../../core/domain/artifact/Artifact';
import * as fs from 'fs';
import * as path from 'path';

export class LocalArtifactStore implements IArtifactStore {
    private readonly baseDir: string;

    constructor() {
        this.baseDir = path.join(process.cwd(), 'artifacts', 'files');
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }

    public async storeArtifactAsync(submissionId: string, type: ArtifactType, buffer: Buffer, filename: string): Promise<Artifact> {
        const artifactId = `art-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const submissionDir = path.join(this.baseDir, submissionId);
        
        if (!fs.existsSync(submissionDir)) {
            fs.mkdirSync(submissionDir, { recursive: true });
        }

        const safeFilename = `${artifactId}_${filename}`;
        const filePath = path.join(submissionDir, safeFilename);
        
        fs.writeFileSync(filePath, buffer);

        return {
            id: artifactId,
            submissionId,
            type,
            uri: filePath,
            createdAt: new Date().toISOString()
        };
    }

    public async getArtifactAsync(artifactId: string): Promise<Buffer> {
        // Find the artifact by ID in the directory structure
        // This is a naive search for demonstration. A real system would use a DB to map ID to URI.
        const dirs = fs.readdirSync(this.baseDir);
        for (const dir of dirs) {
            const submissionDir = path.join(this.baseDir, dir);
            if (fs.statSync(submissionDir).isDirectory()) {
                const files = fs.readdirSync(submissionDir);
                for (const file of files) {
                    if (file.startsWith(artifactId)) {
                        return fs.readFileSync(path.join(submissionDir, file));
                    }
                }
            }
        }
        
        throw new Error(`Artifact ${artifactId} not found`);
    }
}

