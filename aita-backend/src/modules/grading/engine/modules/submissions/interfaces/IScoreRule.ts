// @ts-nocheck
/**
 * A single scoring rule result.
 */
export interface IScoreRule {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details?: string;
  severity?: string;
  category?: string;
  recommendation?: string;
}


