// @ts-nocheck
import { IScoreRule } from '../interfaces';
import { BuildResult } from '../types';

/**
 * Data Transfer Object for the submission assessment response.
 *
 * Decouples the internal domain model from the API contract,
 * so internal refactors don't break client integrations.
 */
export interface SubmissionResponseDto {
  success: boolean;
  submissionId: string;
  score: number;
  maxScore: number;
  percentage: string;
  rules: IScoreRule[];
  build: BuildResult;
  assessedAt: string;
}

export function toSubmissionResponseDto(
  submissionId: string,
  score: number,
  maxScore: number,
  rules: IScoreRule[],
  build: BuildResult,
): SubmissionResponseDto {
  const percentage = maxScore > 0
    ? `${((score / maxScore) * 100).toFixed(1)}%`
    : '0%';

  return {
    success: true,
    submissionId,
    score,
    maxScore,
    percentage,
    rules,
    build,
    assessedAt: new Date().toISOString(),
  };
}

