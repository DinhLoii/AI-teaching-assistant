// @ts-nocheck
/**
 * Architecture folder names the system checks for in submitted projects.
 * Centralised here so scoring rules and analyzers stay in sync.
 */
export const ARCHITECTURE_FOLDERS = [
  'Controllers',
  'Services',
  'Repositories',
  'Models',
] as const;

export type ArchitectureFolder = (typeof ARCHITECTURE_FOLDERS)[number];

/**
 * Scoring weights per rule category.
 */
export const SCORE_WEIGHTS = {
  FOLDER_EXISTS: 10,
  BUILD_SUCCESS: 20,
} as const;

/**
 * Supported project file extensions for detection.
 */
export const PROJECT_FILE_EXTENSIONS = ['.csproj'] as const;

