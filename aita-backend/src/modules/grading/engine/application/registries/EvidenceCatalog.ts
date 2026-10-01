// @ts-nocheck
import { EvidenceDefinition } from '../../core/domain/evidence/EvidenceDefinition';
import { Evidence } from '../../core/domain/evidence/Evidence';
import Ajv from 'ajv';

export class EvidenceValidationException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EvidenceValidationException';
    }
}

/**
 * Validates emitted Evidence against registered EvidenceDefinitions.
 */
export class EvidenceCatalog {
    private readonly definitions: Map<string, EvidenceDefinition> = new Map();

    /**
     * Registers a new evidence definition.
     */
    public registerDefinition(definition: EvidenceDefinition): void {
        const key = `${definition.type}@${definition.version}`;
        this.definitions.set(key, definition);
    }

    /**
     * Validates a piece of evidence. Throws an exception if invalid.
     * @param evidence The evidence to validate.
     * @param expectedVersion The version of the schema to validate against (defaults to 'v1').
     */
    public validate(evidence: Evidence, expectedVersion: string = 'v1'): void {
        const key = `${evidence.type}@${expectedVersion}`;
        const definition = this.definitions.get(key);

        if (!definition) {
            throw new EvidenceValidationException(`Evidence type ${evidence.type} version ${expectedVersion} is not registered in the catalog.`);
        }

        const ajv = new Ajv();
        const validate = ajv.compile(definition.schema);
        if (!validate(evidence.payload)) {
            throw new EvidenceValidationException('Evidence payload violates schema');
        }
    }
}

