// @ts-nocheck
export type ArtifactType = 'build_log' | 'runtime_log' | 'screenshot' | 'api_response' | 'coverage_report' | 'evidence_dump';

/**
 * An artifact is a physical file or data dump produced during the execution of a submission.
 */
export interface Artifact {
    id: string;
    submissionId: string;
    type: ArtifactType;
    uri: string; // Storage path or download URL
    createdAt: string;
}

