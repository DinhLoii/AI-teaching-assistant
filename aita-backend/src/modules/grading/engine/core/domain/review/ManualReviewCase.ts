// @ts-nocheck
export enum ReviewStatus {
    Pending = 'Pending',
    Assigned = 'Assigned',
    Approved = 'Approved',
    Rejected = 'Rejected',
    Overridden = 'Overridden'
}

export interface ReviewDecision {
    reviewerId: string;
    status: ReviewStatus;
    scoreOverride?: number;
    comments: string;
    timestamp: string;
}

/**
 * A manual review case generated when the automated evaluator 
 * encounters evidence with low confidence.
 */
export interface ManualReviewCase {
    id: string;
    submissionId: string;
    assignmentId: string;
    ruleId: string;
    
    // The reason this case was generated (e.g., 'Evidence confidence 0.68 < 0.70')
    reason: string;
    
    // The specific evidence IDs that triggered this review
    relatedEvidenceIds: string[];
    
    status: ReviewStatus;
    decision?: ReviewDecision;
    
    createdAt: string;
    updatedAt: string;
}

