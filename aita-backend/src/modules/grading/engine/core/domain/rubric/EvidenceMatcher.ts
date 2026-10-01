// @ts-nocheck
export type EvidenceType =
  | "browser.screenshot.captured"   // Playwright — needs sandbox
  | "runtime.http.probed"           // HTTPProbe — needs sandbox
  | "ai.code.reviewed"              // Gemini reads source — no sandbox needed
  | "runtime.stdio.probed"          // StdInOutProbe — Docker stdin/stdout
  | "runtime.sql.probed"            // SqlExecutionProbe — Docker SQL Server
  | "ai.text.analyzed"              // AiTextAnalysis — text comparison
  | "manual.teacher.reviewed";      // Manual — human grading

export interface HTTPProbeStep {
  stepId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  pathTemplate: string;
  body?: object;
  expectedStatus: number;
  captureFromResponse?: {
    variable: string;
    jsonPath: string;
  };
  assertions?: Array<{
    jsonPath: string;
    assertType: "exists" | "equals" | "contains" | "isArray" | "count_equals" | "count_gt" | "not_exists" | "not_empty" | "greater_than" | "less_than";
    value?: any;
  }>;
}

export interface HTTPProbeSpec {
  description: string;
  steps: HTTPProbeStep[];
}

export interface StdInOutTestCase {
  id: string;
  /** Exact string piped to stdin (use \n for newlines) */
  input: string;
  /** Expected stdout output (trimmed, whitespace-normalized for comparison) */
  expectedOutput: string;
  /** Timeout in ms for this test case. Default: 5000 */
  timeoutMs?: number;
}

export interface StdInOutProbeSpec {
  description: string;
  /** Override build command (auto-detected if not specified) */
  buildCommand?: string;
  /** Override run command (auto-detected if not specified) */
  runCommand?: string;
  testCases: StdInOutTestCase[];
}

export interface BrowserProbeSpec {
  description: string;
  /** Target relative path to navigate to, e.g., '/login' or '/dashboard' */
  path: string;
}

/**
 * A single SQL test case. Each case runs one query and compares the result set.
 */
export interface SqlTestCase {
  /** Unique ID, e.g. "q1", "q2" */
  id: string;
  /** Human-readable title, e.g. "Câu 1: CREATE TABLE" */
  title: string;
  /** The SQL statement(s) to execute. May contain multiple statements separated by GO. */
  query: string;
  /** 
   * Type of SQL operation. Determines how the result is validated:
   * - "select": Compare result set (columns + rows)
   * - "ddl": Verify table/object was created (CREATE TABLE, CREATE PROCEDURE, CREATE TRIGGER)
   * - "dml": Verify row count affected (INSERT, UPDATE, DELETE)
   * - "procedure": Execute stored procedure and compare output
   */
  queryType: 'select' | 'ddl' | 'dml' | 'procedure';
  /** Expected column names (for 'select' type). Case-insensitive comparison. */
  expectedColumns?: string[];
  /** Expected rows as string[][] (for 'select' type). Each inner array is one row. */
  expectedRows?: string[][];
  /** If true, row order matters. If false, rows are sorted before comparison. Default: true */
  orderSensitive?: boolean;
  /** Expected row count for DML operations (INSERT/UPDATE/DELETE) */
  expectedRowCount?: number;
  /** For DDL: the object name to verify existence (e.g., table name, procedure name) */
  expectedObjectName?: string;
  /** For DDL: the object type to verify ('table' | 'procedure' | 'trigger' | 'view') */
  expectedObjectType?: 'table' | 'procedure' | 'trigger' | 'view';
  /** For procedure: the verification query to run after executing the procedure */
  verificationQuery?: string;
  /** Timeout in ms. Default: 10000 */
  timeoutMs?: number;
  /** Points for this specific test case (used for weighted scoring within a rule) */
  points?: number;
}

/**
 * Full specification for the SqlExecutionProbe engine.
 */
export interface SqlExecutionProbeSpec {
  description: string;
  /** SQL script to set up the database (CREATE DATABASE, tables, INSERT test data). */
  setupScript: string;
  /** Database engine. Currently only 'mssql' supported. */
  dbEngine: 'mssql';
  /** Individual test cases to run against the student's SQL submission. */
  testCases: SqlTestCase[];
}

export interface EvidenceMatcher {
  evidenceType: EvidenceType;
  minimumConfidence: number;
  httpProbe?: HTTPProbeSpec;
  stdInOutProbe?: StdInOutProbeSpec;
  sqlProbe?: SqlExecutionProbeSpec;
  browserProbe?: BrowserProbeSpec;
  semanticDescription?: string;
  payloadMatcher?: Record<string, any>;
}


