// @ts-nocheck
import { RubricDefinition } from './RubricDefinition';

/**
 * Defines a migration strategy from one rubric version to another.
 * This ensures historical submissions can always be re-evaluated correctly.
 */
export interface RubricMigration {
    /**
     * The source version to migrate from.
     */
    fromVersion: string;

    /**
     * The target version to migrate to.
     */
    toVersion: string;

    /**
     * Migrates a rubric definition to the new version.
     * @param oldRubric The rubric in the old format.
     * @returns The migrated rubric definition.
     */
    migrate(oldRubric: RubricDefinition): RubricDefinition;
}

