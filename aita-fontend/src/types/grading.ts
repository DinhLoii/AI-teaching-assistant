// --- Grading Types ---
export interface IoTestCaseEvidence {
  caseId: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  timedOut: boolean;
}

export interface HttpStep {
  method: string;
  url: string;
  status: number;
  requestBody?: any;
  responseBody?: any;
  assertions?: Array<{
    assertion: string;
    passed: boolean;
    actual: any;
  }>;
}

export interface CodeSnippetEvidence {
  codeSnippet: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  explanation?: string;
}

export interface RuleEvidence {
  snippets?: CodeSnippetEvidence[];
  codeSnippet?: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  httpSteps?: HttpStep[];
  screenshotBase64?: string;
  explanation?: string;
  ioTestCases?: IoTestCaseEvidence[];
  studentText?: string;
  extractedImages?: any[];
  hybridBreakdown?: {
    codePct: number;
    probePct?: number;
    visionPct?: number;
    textPct?: number;
  };
  sqlTestCases?: any[];
}

export interface ScoreRule {
  name: string;
  description?: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details?: string;
  severity?: string;
  category?: string;
  recommendation?: string;
  evidence?: RuleEvidence;
}

export interface BuildResult {
  success: boolean;
  output: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface SubmissionResponse {
  success: boolean;
  submissionId: string;
  assignmentId?: string;
  score: number;
  maxScore: number;
  rules: ScoreRule[];
  failedRules: ScoreRule[];
  manualReviewNotes?: string[];
  overallFeedback?: string;
  assessedAt?: string;
  isPublished?: boolean;
  studentFeedback?: string;
  error?: string;
}

export interface RubricRule {
  id: string;
  title: string;
  name?: string;
  description: string;
  category: string;
  weight: number;
  scoringStrategy: string;
  tags?: string[];
  requiredEvidence?: any[];
  criteria?: any[];
}

export interface RubricDefinition {
  id: string;
  assignmentId: string;
  title: string;
  totalWeight: number;
  passThreshold: number;
  rules: RubricRule[];
}

export interface PublishedAssignment {
  id: string;
  version: string;
  blueprintId: string;
  metadata: {
    title: string;
    description: string;
    projectType: string;
  };
  rubric: RubricDefinition;
  testSuites: any;
}
