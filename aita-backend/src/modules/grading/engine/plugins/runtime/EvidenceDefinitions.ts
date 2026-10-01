// @ts-nocheck
import { EvidenceDefinition } from '../../core/domain/evidence/EvidenceDefinition';

export const RuntimeEvidenceDefinitions: EvidenceDefinition[] = [
    {
        type: 'runtime.http.request_sent',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                method: { type: 'string' },
                url: { type: 'string' }
            }
        }
    },
    {
        type: 'runtime.http.response_received',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'number' },
                contentType: { type: 'string' }
            }
        }
    },
    {
        type: 'runtime.http.status_validated',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                expected: { type: 'number' },
                actual: { type: 'number' },
                passed: { type: 'boolean' }
            }
        }
    },
    {
        type: 'runtime.http.schema_validated',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                passed: { type: 'boolean' },
                errors: { type: 'array', items: { type: 'string' } }
            }
        }
    },
    {
        type: 'runtime.http.latency_measured',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                latencyMs: { type: 'number' }
            }
        }
    },
    {
        type: 'runtime.http.variable_extracted',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                variableName: { type: 'string' },
                source: { type: 'string' }
            }
        }
    },
    {
        type: 'runtime.auth.token_acquired',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                tokenType: { type: 'string' },
                variableName: { type: 'string' }
            }
        }
    },
    {
        type: 'runtime.workflow.completed',
        version: 'v1',
        source: 'RuntimeApiPlugin',
        schema: {
            type: 'object',
            properties: {
                testId: { type: 'string' },
                stepsExecuted: { type: 'number' },
                success: { type: 'boolean' }
            }
        }
    }
];

