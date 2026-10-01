// @ts-nocheck
/**
 * Defines a registered, versioned evidence schema.
 * Ensures that all Evidence payloads can be validated before scoring.
 */
export interface EvidenceDefinition {
    /**
     * The unique type identifier (e.g., 'runtime.http.response').
     */
    type: string;

    /**
     * The version of this schema (e.g., 'v1').
     */
    version: string;

    /**
     * The expected source plugin (optional, but helps with tracking).
     */
    source: string;

    /**
     * A valid JSON Schema object used to validate the payload of any 
     * Evidence object claiming to be of this type and version.
     */
    schema: Record<string, any>;
}

