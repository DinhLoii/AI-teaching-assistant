// @ts-nocheck
/**
 * A strictly factual observation emitted by a plugin about a submission.
 * Plugins MUST NOT emit scores. They emit Evidence.
 */
export interface Evidence {
    /**
     * Unique identifier for this specific piece of evidence.
     */
    id: string;

    /**
     * The ID of the plugin that emitted this evidence (e.g., 'PlaywrightPlugin', 'StaticAnalyzerPlugin').
     */
    source: string;

    /**
     * The registered evidence type this conforms to (e.g., 'runtime.http.response.v1').
     */
    type: string;

    /**
     * Confidence score from 0.0 to 1.0 indicating how certain the plugin is of this observation.
     * >= 0.95 is deterministic, < 0.70 triggers manual review.
     */
    confidence: number;

    /**
     * ISO 8601 timestamp of when the evidence was observed.
     */
    timestamp: string;

    /**
     * The factual payload conforming to the EvidenceDefinition's JSON Schema.
     */
    payload: any;
}

