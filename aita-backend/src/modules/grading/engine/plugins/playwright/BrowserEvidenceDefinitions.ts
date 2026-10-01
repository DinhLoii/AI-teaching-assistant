// @ts-nocheck
import { EvidenceDefinition } from '../../core/domain/evidence/EvidenceDefinition';

export const BrowserEvidenceDefinitions: EvidenceDefinition[] = [
    {
        type: 'browser.navigation.completed',
        version: 'v1',
        source: 'PlaywrightPlugin',
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string' },
                status: { type: 'number' }
            }
        }
    },
    {
        type: 'browser.element.visible',
        version: 'v1',
        source: 'PlaywrightPlugin',
        schema: {
            type: 'object',
            properties: {
                selector: { type: 'string' },
                isVisible: { type: 'boolean' }
            }
        }
    },
    {
        type: 'browser.element.clicked',
        version: 'v1',
        source: 'PlaywrightPlugin',
        schema: {
            type: 'object',
            properties: {
                selector: { type: 'string' }
            }
        }
    },
    {
        type: 'browser.input.filled',
        version: 'v1',
        source: 'PlaywrightPlugin',
        schema: {
            type: 'object',
            properties: {
                selector: { type: 'string' },
                valueLength: { type: 'number' }
            }
        }
    },
    {
        type: 'browser.screenshot.captured',
        version: 'v1',
        source: 'PlaywrightPlugin',
        schema: {
            type: 'object',
            properties: {
                artifactId: { type: 'string' },
                name: { type: 'string' }
            }
        }
    },
    {
        type: 'browser.workflow.completed',
        version: 'v1',
        source: 'PlaywrightPlugin',
        schema: {
            type: 'object',
            properties: {
                testId: { type: 'string' },
                success: { type: 'boolean' },
                stepsExecuted: { type: 'number' }
            }
        }
    }
];

