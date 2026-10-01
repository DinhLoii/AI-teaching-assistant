// @ts-nocheck
/**
 * UniversalStaticAnalyzer — Language-agnostic pattern-based static analysis.
 * Replaces Roslyn for deterministic evidence collection across ALL languages.
 *
 * How it works:
 *   1. Receives source files + a list of StaticPatterns (regex/string)
 *   2. Searches file contents, file names, or dependency files
 *   3. Returns deterministic Evidence (confidence = 1.0 always)
 *   4. Supports anti-patterns (MUST NOT exist)
 *
 * Supported: Dart, Java, C#, Python, C/C++, Go, Rust, Kotlin, JS/TS, PHP, Ruby, etc.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface StaticPattern {
  /** Unique pattern identifier, e.g. "skeleton_loading" */
  id: string;
  /** String or regex pattern to search for */
  pattern: string;
  /** Where to search */
  scope: 'file_content' | 'file_name' | 'dependency_file';
  /** Only search files with these extensions (e.g. ['.dart', '.java']) */
  fileExtensions?: string[];
  /** Only search these specific files for dependency checks (e.g. ['pubspec.yaml', 'pom.xml']) */
  dependencyFiles?: string[];
  /** If true, this pattern MUST NOT exist (banned pattern) */
  isAntiPattern?: boolean;
  /** Human-readable explanation of what this pattern checks */
  explanation?: string;
}

export interface PatternMatch {
  filePath: string;
  lineNumber: number;
  lineContent: string;
}

export interface StaticAnalysisResult {
  patternId: string;
  /** For normal patterns: found=true is good. For anti-patterns: found=true is bad */
  found: boolean;
  occurrences: number;
  isAntiPattern: boolean;
  /** Always 1.0 — grep is deterministic */
  confidence: 1.0;
  matches: PatternMatch[];
  explanation?: string;
}

export interface StaticAnalysisReport {
  results: StaticAnalysisResult[];
  /** Patterns that passed (found for normal, not-found for anti-pattern) */
  passedPatterns: string[];
  /** Patterns that failed */
  failedPatterns: string[];
  /** Summary for humans */
  summary: string;
}

// ─── Source file input ───────────────────────────────────────────────

export interface SourceFile {
  relativePath: string;
  content: string;
}

// ─── Engine ──────────────────────────────────────────────────────────

export class UniversalStaticAnalyzer {

  /**
   * Analyze source files against a set of patterns.
   * Returns deterministic results (no AI, no heuristics).
   */
  public analyze(
    sourceFiles: SourceFile[],
    patterns: StaticPattern[]
  ): StaticAnalysisReport {
    const results: StaticAnalysisResult[] = [];
    const passedPatterns: string[] = [];
    const failedPatterns: string[] = [];

    for (const pattern of patterns) {
      const result = this.evaluatePattern(sourceFiles, pattern);
      results.push(result);

      // Determine pass/fail:
      // Normal pattern: found = pass, not-found = fail
      // Anti-pattern:   found = fail, not-found = pass
      const passed = pattern.isAntiPattern ? !result.found : result.found;
      if (passed) {
        passedPatterns.push(pattern.id);
      } else {
        failedPatterns.push(pattern.id);
      }
    }

    const summary = `Static Analysis: ${passedPatterns.length}/${patterns.length} patterns passed. ` +
      (failedPatterns.length > 0
        ? `Failed: ${failedPatterns.join(', ')}`
        : 'All patterns matched.');

    return { results, passedPatterns, failedPatterns, summary };
  }

  // ─── Private ─────────────────────────────────────────────────────

  private evaluatePattern(
    sourceFiles: SourceFile[],
    pattern: StaticPattern
  ): StaticAnalysisResult {
    const matches: PatternMatch[] = [];
    let regex: RegExp;

    try {
      regex = new RegExp(pattern.pattern, 'gi');
    } catch {
      // If the pattern is not valid regex, escape it and use as literal
      regex = new RegExp(this.escapeRegExp(pattern.pattern), 'gi');
    }

    // Filter files based on scope
    const filesToSearch = this.filterFiles(sourceFiles, pattern);

    for (const file of filesToSearch) {
      if (pattern.scope === 'file_name') {
        // Search in file name/path
        if (regex.test(file.relativePath)) {
          matches.push({
            filePath: file.relativePath,
            lineNumber: 0,
            lineContent: file.relativePath,
          });
        }
        // Reset regex lastIndex for next file
        regex.lastIndex = 0;
      } else {
        // Search in file content, line by line
        const lines = file.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          regex.lastIndex = 0;
          if (regex.test(lines[i])) {
            matches.push({
              filePath: file.relativePath,
              lineNumber: i + 1,
              lineContent: lines[i].trim(),
            });
          }
        }
      }
    }

    return {
      patternId: pattern.id,
      found: matches.length > 0,
      occurrences: matches.length,
      isAntiPattern: pattern.isAntiPattern || false,
      confidence: 1.0,
      matches: matches.slice(0, 10), // Cap at 10 matches for readability
      explanation: pattern.explanation,
    };
  }

  private filterFiles(sourceFiles: SourceFile[], pattern: StaticPattern): SourceFile[] {
    if (pattern.scope === 'dependency_file' && pattern.dependencyFiles?.length) {
      // Only search specific dependency files
      return sourceFiles.filter(f => {
        const fileName = f.relativePath.split(/[/\\]/).pop()?.toLowerCase() || '';
        return pattern.dependencyFiles!.some(dep => fileName === dep.toLowerCase());
      });
    }

    if (pattern.fileExtensions?.length) {
      // Filter by extension
      return sourceFiles.filter(f => {
        const ext = '.' + f.relativePath.split('.').pop()?.toLowerCase();
        return pattern.fileExtensions!.includes(ext);
      });
    }

    // No filter — search all files (exclude binary-looking files)
    return sourceFiles.filter(f => {
      const ext = '.' + f.relativePath.split('.').pop()?.toLowerCase();
      const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.jar', '.dll', '.exe', '.apk'];
      return !binaryExts.includes(ext);
    });
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// ─── Pre-built Pattern Libraries ─────────────────────────────────────

/**
 * Common patterns for Flutter/Dart projects.
 */
export const FLUTTER_PATTERNS: StaticPattern[] = [
  { id: 'shimmer_dependency', pattern: 'shimmer:', scope: 'dependency_file', dependencyFiles: ['pubspec.yaml'], explanation: 'Shimmer package dependency' },
  { id: 'shimmer_usage', pattern: 'Shimmer\\.fromColors|Shimmer\\(', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Shimmer widget usage in code' },
  { id: 'refresh_indicator', pattern: 'RefreshIndicator', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Pull-to-refresh implementation' },
  { id: 'ban_circular_progress', pattern: 'CircularProgressIndicator', scope: 'file_content', fileExtensions: ['.dart'], isAntiPattern: true, explanation: 'CircularProgressIndicator is BANNED per exam rules' },
  { id: 'error_state', pattern: 'errorMessage|error_message|ErrorWidget|error.*state', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Error state handling' },
  { id: 'empty_state', pattern: 'empty|no.*found|isEmpty|Empty.*View', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Empty state handling' },
  { id: 'shared_preferences', pattern: 'SharedPreferences|shared_preferences', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'SharedPreferences for offline storage' },
  { id: 'hive_storage', pattern: 'Hive|hive_flutter', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Hive for offline storage' },
  { id: 'debounce_timer', pattern: 'Timer\\(.*Duration.*milliseconds', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Debounce with Timer' },
  { id: 'stock_filter', pattern: 'stock.*>.*0|stock > 0', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'In-stock filter' },
  { id: 'low_stock_warning', pattern: 'stock.*<.*10|stock < 10', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Low stock warning (< 10)' },
  { id: 'provider_usage', pattern: 'ChangeNotifierProvider|Provider\\.of|context\\.watch|context\\.read', scope: 'file_content', fileExtensions: ['.dart'], explanation: 'Provider state management' },
  { id: 'mvvm_viewmodel', pattern: 'ViewModel|view_model', scope: 'file_name', fileExtensions: ['.dart'], explanation: 'MVVM ViewModel layer' },
  { id: 'repository_layer', pattern: 'repository', scope: 'file_name', fileExtensions: ['.dart'], explanation: 'Repository pattern' },
  { id: 'api_service', pattern: 'service|api_service|ApiService', scope: 'file_name', fileExtensions: ['.dart'], explanation: 'API Service layer' },
];

/**
 * Common patterns for .NET/C# API projects (SWD392/SWP391).
 */
export const DOTNET_PATTERNS: StaticPattern[] = [
  { id: 'has_dbcontext', pattern: 'DbContext', scope: 'file_content', fileExtensions: ['.cs'], explanation: 'Entity Framework DbContext' },
  { id: 'has_controller', pattern: '\\[ApiController\\]|: ControllerBase|: Controller', scope: 'file_content', fileExtensions: ['.cs'], explanation: 'API Controller' },
  { id: 'has_di', pattern: 'builder\\.Services\\.Add|AddScoped|AddTransient|AddSingleton', scope: 'file_content', fileExtensions: ['.cs'], explanation: 'Dependency Injection setup' },
  { id: 'has_repository', pattern: 'IRepository|Repository', scope: 'file_content', fileExtensions: ['.cs'], explanation: 'Repository pattern' },
  { id: 'has_migration', pattern: 'Migration|CreateTable|migrationBuilder', scope: 'file_content', fileExtensions: ['.cs'], explanation: 'EF Core Migrations' },
  { id: 'has_csproj', pattern: '\\.csproj$', scope: 'file_name', explanation: 'C# project file exists' },
  { id: 'ef_core_dep', pattern: 'Microsoft\\.EntityFrameworkCore', scope: 'dependency_file', dependencyFiles: ['.csproj'], explanation: 'EF Core NuGet reference' },
];

/**
 * Common patterns for Java Web projects (PRJ301).
 */
export const JAVA_PATTERNS: StaticPattern[] = [
  { id: 'has_controller', pattern: '@Controller|@RestController|@RequestMapping', scope: 'file_content', fileExtensions: ['.java'], explanation: 'Spring Controller' },
  { id: 'has_service', pattern: '@Service', scope: 'file_content', fileExtensions: ['.java'], explanation: 'Spring Service layer' },
  { id: 'has_repository', pattern: '@Repository|JpaRepository|CrudRepository', scope: 'file_content', fileExtensions: ['.java'], explanation: 'Spring Repository' },
  { id: 'has_entity', pattern: '@Entity|@Table', scope: 'file_content', fileExtensions: ['.java'], explanation: 'JPA Entity' },
  { id: 'has_pom', pattern: 'pom\\.xml$', scope: 'file_name', explanation: 'Maven project file' },
  { id: 'spring_dep', pattern: 'spring-boot-starter', scope: 'dependency_file', dependencyFiles: ['pom.xml', 'build.gradle'], explanation: 'Spring Boot dependency' },
];

