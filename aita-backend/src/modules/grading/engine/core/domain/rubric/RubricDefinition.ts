// @ts-nocheck
import { RubricRule } from './RubricRule';

/**
 * Defines a published, immutable rubric used for scoring assignments.
 */
export interface RubricDefinition {
    /**
     * Unique identifier for this rubric.
     */
    id: string;

    /**
     * The ID of the published assignment this rubric belongs to.
     */
    assignmentId: string;

    /**
     * The version of this rubric (e.g., '1.0.0'). Rubrics are immutable.
     */
    version: string;

    /**
     * The title of the rubric.
     */
    title: string;

    /**
     * The total possible weight/points for this rubric.
     */
    totalWeight: number;

    /**
     * The threshold [0.0 - 1.0] required to pass the assignment overall.
     */
    passThreshold: number;

    /**
     * The collection of rules that make up this rubric.
     */
    rules: RubricRule[];
}

