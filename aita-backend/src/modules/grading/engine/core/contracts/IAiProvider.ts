// @ts-nocheck

/** Represents an image extracted from an assignment document (DB schema, UI mockup, etc.) */
export interface DocumentImage {
    /** Image binary data */
    buffer: Buffer;
    /** Content type (image/png, image/jpeg, etc.) */
    contentType: string;
    /** Auto-labeled context from surrounding text */
    label: string;
    /** True if detected as a teacher template/mockup */
    isMockup?: boolean;
}

export interface ParsedRequirement {
  id: string;
  title: string;
  description: string;
  marks: number | null;
  complexity: "low" | "medium" | "high";
  complexityReason: string;
  isUIVisible: boolean;
  isCRUD: boolean;
  groupId?: string;
  crudOperations?: Array<"create" | "read" | "update" | "delete" | "search">;
  /** True when the student must write a text/essay answer (design questions, debugging explanations, analysis reports) */
  isWrittenAnswer?: boolean;
  /** True when the task demands implementing a specific codebase architecture/pattern (MVC, Clean Architecture, Repository, etc.) */
  isArchitectureCode?: boolean;
  /** True when the task requires the student to draw or create a diagram */
  isDiagramTask?: boolean;
  /** True when the task requires implementing a logical soft delete rather than a hard physical delete */
  isSoftDelete?: boolean;
  /** Reference/model answer for AiTextAnalysis comparison (optional, teacher can provide later) */
  referenceAnswer?: string;
  partLabel?: string;
  recommendedEngineReason?: string;
  recommendedEngine?: 'AICodeReview' | 'AiTextAnalysis' | 'AIVision' | 'HTTPProbe' | 'HybridVisionAndCode' | 'HybridTextAndCode' | 'SqlExecutionProbe' | 'Boolean' | 'Manual';
}

export interface ParsedBlueprint {
  projectType: string;
  language: string;
  framework: string;
  assignmentTitle: string;
  description: string;
  totalMarks: number | null;
  gradingGroups?: { id: string, name: string, points: number }[];
  requirements: ParsedRequirement[];
}

/**
 * Represents the AI Providers available to assist in requirement parsing and review.
 * AI Providers MUST NOT participate in final scoring.
 */
export interface IAiProvider {
    /**
     * Parses a natural language requirement into structured Rubric rules.
     */
    /** `subject` is the subject code from the upload form (e.g. "DBI202"); it decides projectType when known. */
    parseRequirementsAsync(prompt: string, documentImages?: DocumentImage[], subject?: string | null): Promise<ParsedBlueprint>;

    /**
     * Evaluates a screenshot or image against a specific requirement.
     * Returns the confidence score (0.0 to 1.0) and AI's explanation.
     */
    evaluateImageAsync(imageBuffers: { buffer: Buffer, isMockup?: boolean }[], requirement: string): Promise<{ score: number; explanation: string, relevantImageIndices?: number[] }>;

    /**
     * Provides qualitative feedback on code snippets or screenshots.
     */
    generateFeedbackAsync(context: string, payload: any): Promise<string>;

    /**
     * Generates a detailed JSON array of RubricRules from requirements.
     */
    generateRubricRulesAsync(requirements: ParsedRequirement[], projectType: string, assignmentDescription?: string): Promise<any[]>;
    
    /**
     * Generates assignment markdown content from a text prompt.
     */
    generateAssignmentContentAsync(prompt: string, pageImages?: string[]): Promise<string>;

    /**
     * Synthesizes a final, overall feedback report for a student based on their graded assignment.
     * Provides concise, actionable insights on current academic status and development strategy in Vietnamese.
     */
    generateOverallFeedbackAsync(assignmentTitle: string, passedRules: any[], failedRules: any[], totalScore: number, maxScore: number): Promise<string>;

    /**
     * Parses an SQL answer key file and maps its queries to existing rubric rules.
     * Generates a fully populated SqlExecutionProbeSpec for each rule, including setupScript and reference queries.
     */
    parseSqlAnswerKeyAsync(sqlContent: string, rubricRules: any[]): Promise<any[]>;
}

