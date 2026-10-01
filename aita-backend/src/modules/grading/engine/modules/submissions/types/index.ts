// @ts-nocheck
/**
 * Result returned by the BuildRunner.
 */
export interface BuildResult {
  success: boolean;
  output: string;
  exitCode: number | null;
  timedOut: boolean;
}

/**
 * Result of scanning project structure for architecture folders.
 */
export interface StructureAnalysisResult {
  folders: Record<string, boolean>;
}

/**
 * Result of .csproj detection.
 */
export interface CsprojDetectionResult {
  found: boolean;
  path: string | null;
  projectDirectory: string | null;
}

