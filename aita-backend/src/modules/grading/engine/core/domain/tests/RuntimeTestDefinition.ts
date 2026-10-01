// @ts-nocheck
export interface DatabaseSeedAction {
    type: 'sql' | 'script';
    content: string; // The SQL query or script content
}

export interface DatabaseCleanupAction {
    type: 'sql' | 'script';
    content: string;
}

export type HttpAssertionType = 'StatusCode' | 'BodyContains' | 'JsonSchema' | 'HeaderEquals' | 'JsonPath' | 'ResponseTime';

export interface HttpAssertion {
    type: HttpAssertionType;
    expected: any;
    jsonPath?: string; // Used specifically for JsonPath assertions
}

export interface VariableExtraction {
    source: 'body' | 'header';
    jsonPath?: string;      // e.g., '$.data.token'
    headerName?: string;    // e.g., 'Authorization'
    variableName: string;   // e.g., 'jwtToken'
}

export interface HttpTestStep {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string; // Supports variable substitution, e.g. /users/{{userId}}
    headers?: Record<string, string>;
    body?: any;
    assertions: HttpAssertion[];
    extractVariables?: VariableExtraction[];
}

/**
 * Defines a runtime integration test for Backend APIs.
 * Supports stateful, multi-step chained workflows.
 */
export interface RuntimeTestDefinition {
    id: string;
    name: string;
    setup?: DatabaseSeedAction[];
    steps: HttpTestStep[];
    teardown?: DatabaseCleanupAction[];
}

