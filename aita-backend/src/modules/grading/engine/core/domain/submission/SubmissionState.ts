// @ts-nocheck
/**
 * The strict lifecycle states a submission can occupy.
 */
export enum SubmissionState {
    Uploaded = 'Uploaded',
    Queued = 'Queued',
    Provisioning = 'Provisioning',
    Building = 'Building',
    Running = 'Running',
    Analyzing = 'Analyzing',
    Evaluating = 'Evaluating',
    ManualReview = 'ManualReview',
    Completed = 'Completed',
    Failed = 'Failed'
}

export interface SubmissionStatusHistory {
    state: SubmissionState;
    timestamp: string;
    reason?: string;
}

