// @ts-nocheck
export interface AssignmentRubricItem {
  requirement: string;
  score: number;
  category: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  rubric: AssignmentRubricItem[];
  totalScore: number;
}

