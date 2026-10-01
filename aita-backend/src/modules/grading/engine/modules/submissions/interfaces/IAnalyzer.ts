// @ts-nocheck
/**
 * Contract for any analyzer that inspects a submission's extracted project.
 *
 * New analyzers (e.g. DependencyAnalyzer) simply implement
 * this interface.
 */
export interface IAnalyzer<TResult> {
  readonly name: string;
  analyze(extractedPath: string): Promise<TResult>;
}

