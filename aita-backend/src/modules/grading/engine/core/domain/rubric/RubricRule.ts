// @ts-nocheck
import { EvidenceMatcher } from './EvidenceMatcher';

export type RuleCategory = 'Architecture' | 'Functional' | 'UI' | 'Security' | 'Algorithm' | 'CodeQuality' | 'Theory' | 'Design';
export type ScoringStrategy = 'Boolean' | 'AIVision' | 'HTTPProbe' | 'AICodeReview' | 'StdInOutProbe' | 'UniversalStatic' | 'AiTextAnalysis' | 'SqlExecutionProbe' | 'Manual';

/**
 * Inline definition to avoid cross-layer import from core → application.
 * Mirrors StaticPattern from UniversalStaticAnalyzer.
 */
export interface RubricStaticPattern {
    patternId: string;
    regex: string;
    description: string;
    severity: 'required' | 'recommended' | 'antipattern';
    fileGlob?: string;
}

export interface RubricRule {
    /**
     * Unique identifier for the rule.
     */
    id: string;

    /**
     * Human-readable title of the rule.
     */
    title: string;

    /**
     * Detailed description of what this rule evaluates.
     */
    description: string;

    /**
     * The category this rule belongs to.
     */
    category: RuleCategory;

    /**
     * The weight (points) assigned to this rule.
     */
    weight: number;

    /**
     * The strategy used to calculate the score from the matched evidence.
     */
    scoringStrategy: ScoringStrategy;

    /**
     * The evidence required to fulfill this rule.
     */
    requiredEvidence: EvidenceMatcher[];

    /**
     * Required for 'AiTextAnalysis' strategy. The model/correct answer to compare against.
     */
    referenceAnswer?: string;

    /**
     * Required for 'UniversalStatic' strategy. The grep/regex patterns to search for.
     */
    staticPatterns?: RubricStaticPattern[];
    
    /**
     * Context hints for grading (e.g. which section of the exam document to grade for AiTextAnalysis).
     */
    contextHint?: string;
}


