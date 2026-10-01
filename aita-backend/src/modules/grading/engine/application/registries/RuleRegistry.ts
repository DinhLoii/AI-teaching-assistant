// @ts-nocheck
import { RubricRule } from '../../core/domain/rubric/RubricRule';

export class RuleRegistry {
    private readonly rules: Map<string, RubricRule> = new Map();

    /**
     * Dynamically registers a rule definition.
     */
    public registerRule(rule: RubricRule): void {
        this.rules.set(rule.id, rule);
    }

    public getRule(id: string): RubricRule | undefined {
        return this.rules.get(id);
    }

    public getAllRules(): RubricRule[] {
        return Array.from(this.rules.values());
    }
}

