// @ts-nocheck
export interface AlgorithmTestCase {
    id: string;
    stdin: string;
    expectedStdout: string;
    isHidden: boolean; // Hidden from the student until after grading
}

/**
 * Defines an algorithmic challenge test suite.
 */
export interface AlgorithmTestDefinition {
    id: string;
    name: string;
    timeLimitMs: number;
    memoryLimitMb: number;
    testCases: AlgorithmTestCase[];
}

