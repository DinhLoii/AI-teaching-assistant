// @ts-nocheck
import { IScoreRule } from './IScoreRule';
import { BuildResult } from '../types';

/**
 * Contract for the core submission processing service.
 */
export interface ISubmissionService {
  processSubmission(zipFilePath: string): Promise<SubmissionResult>;
}

export interface SubmissionResult {
  success: boolean;
  submissionId: string;
  score: number;
  maxScore: number;
  rules: IScoreRule[];
  build: BuildResult;
  roslynRules: IScoreRule[];
}

