// @ts-nocheck
export type DatabaseType = 'postgres' | 'sqlserver' | 'mysql' | 'sqlite';

export interface DatabaseManifest {
    type: DatabaseType;
    migrationStrategy: string; // e.g., 'efcore', 'prisma'
    seedDataPath?: string;
}

/**
 * An optional contract provided by the student at the root of their ZIP.
 * If missing, the platform attempts to infer these values.
 */
export interface AssessmentManifest {
    projectType: 'algorithm' | 'web' | 'desktop' | 'mobile' | 'unity';
    language: string;
    framework: string;
    entryPoint?: string;
    database?: DatabaseManifest;
}

