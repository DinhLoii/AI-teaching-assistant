// @ts-nocheck
import { AssessmentManifest } from './AssessmentManifest';
import { SubmissionState, SubmissionStatusHistory } from './SubmissionState';

/**
 * Represents a student's submission.
 */
export interface Submission {
    id: string;
    assignmentId: string;
    studentId: string;
    
    // Remote storage URI where the ZIP is kept
    sourceCodeUri: string;
    
    // Manifest provided by student, or inferred by ManifestResolver
    manifest?: AssessmentManifest;
    
    // Current execution state
    currentState: SubmissionState;
    
    // Audit trail of state transitions
    statusHistory: SubmissionStatusHistory[];
}

