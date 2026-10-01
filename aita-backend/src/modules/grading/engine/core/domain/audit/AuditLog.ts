// @ts-nocheck
export type AuditEventType = 
    | 'AssignmentCreated'
    | 'RubricPublished'
    | 'SubmissionUploaded'
    | 'SandboxCreated'
    | 'PluginExecuted'
    | 'EvidenceEmitted'
    | 'ManualReviewDecision'
    | 'ScoreGenerated';

/**
 * An immutable audit log entry tracking all critical platform actions.
 */
export interface AuditLog {
    id: string;
    eventType: AuditEventType;
    
    // The principal that initiated the event (UserId, WorkerId, or System)
    actor: string;
    
    // The main entity affected by this event (e.g., SubmissionId)
    entityId: string;
    
    // Contextual metadata relevant to the event type
    metadata: Record<string, any>;
    
    timestamp: string;
}

