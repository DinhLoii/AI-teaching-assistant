// @ts-nocheck
import { SubmissionState, SubmissionStatusHistory } from './SubmissionState';

/**
 * Validates and manages state transitions for a Submission.
 */
export class SubmissionStateMachine {
    private static readonly validTransitions: Record<SubmissionState, SubmissionState[]> = {
        [SubmissionState.Uploaded]: [SubmissionState.Queued, SubmissionState.Failed],
        [SubmissionState.Queued]: [SubmissionState.Provisioning, SubmissionState.Failed],
        [SubmissionState.Provisioning]: [SubmissionState.Building, SubmissionState.Failed],
        [SubmissionState.Building]: [SubmissionState.Running, SubmissionState.Analyzing, SubmissionState.Failed],
        [SubmissionState.Running]: [SubmissionState.Analyzing, SubmissionState.Failed],
        [SubmissionState.Analyzing]: [SubmissionState.Evaluating, SubmissionState.Failed],
        [SubmissionState.Evaluating]: [SubmissionState.Completed, SubmissionState.ManualReview, SubmissionState.Failed],
        [SubmissionState.ManualReview]: [SubmissionState.Completed, SubmissionState.Failed],
        [SubmissionState.Completed]: [],
        [SubmissionState.Failed]: []
    };

    /**
     * Checks if a transition from the current state to the next state is allowed.
     */
    public static canTransition(current: SubmissionState, next: SubmissionState): boolean {
        const allowed = this.validTransitions[current];
        return allowed ? allowed.includes(next) : false;
    }

    /**
     * Creates a new status history entry. Throws an error if the transition is invalid.
     */
    public static transition(current: SubmissionState, next: SubmissionState, reason?: string): SubmissionStatusHistory {
        if (!this.canTransition(current, next)) {
            throw new Error(`Invalid state transition from ${current} to ${next}.`);
        }
        
        return {
            state: next,
            timestamp: new Date().toISOString(),
            reason
        };
    }
}

