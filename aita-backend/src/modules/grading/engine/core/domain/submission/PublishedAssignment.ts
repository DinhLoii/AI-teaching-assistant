// @ts-nocheck
import { RubricDefinition } from '../rubric/RubricDefinition';
import { RuntimeTestDefinition } from '../tests/RuntimeTestDefinition';
import { BrowserTestDefinition } from '../tests/BrowserTestDefinition';
import { AlgorithmTestDefinition } from '../tests/AlgorithmTestDefinition';
import { DesktopTestDefinition } from '../tests/DesktopTestDefinition';

export interface AssignmentMetadata {
    title: string;
    description: string;
    projectType: string;
}

/**
 * The final, published contract representing an assignment.
 * Ties together the blueprint, the rubric, and the executable test suites.
 */
export interface PublishedAssignment {
    id: string;
    version: string;
    blueprintId: string;
    metadata: AssignmentMetadata;
    rubric: RubricDefinition;
    
    testSuites: {
        runtime?: RuntimeTestDefinition[];
        browser?: BrowserTestDefinition[];
        algorithm?: AlgorithmTestDefinition[];
        desktop?: DesktopTestDefinition[];
    };
}

