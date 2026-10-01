// @ts-nocheck
import OpenAI from 'openai';
import { config } from '../../config';
import { AiClientManager } from '../../infrastructure/ai/AiClientManager';
import * as crypto from 'crypto';

/**
 * AiTextAnalysisEngine — Grades text/essay answers using AI.
 *
 * Covers exam components that are NOT source code:
 *   - Design questions (PRM393 Part A)
 *   - Debugging explanations (PRM393 Part E)
 *   - Open-source project reviews (PRM393 Part F)
 *   - AI audit reports (PRM393 Part G)
 *   - Architecture explanations, offline strategies, data flow descriptions
 *   - Any written answer with a reference/model answer
 *
 * The engine compares the student's answer against a reference answer
 * and evaluates based on KEY CONCEPTS, not exact wording.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface TextAnalysisInput {
  /** The student's written answer */
  studentAnswer: string;
  /** The model/reference answer to compare against */
  referenceAnswer: string;
  /** Description of what this criterion evaluates */
  criterionDescription: string;
  /** Maximum points for this criterion */
  maxPoints: number;
  /** Optional: list of key concepts that MUST be present for full marks */
  requiredConcepts?: string[];
  /** Optional context for better grading */
  context?: {
    examType?: string;    // "Flutter PE", "Algorithm Theory", "Web API"
    partLabel?: string;   // "Part A - Q2", "Part E - Bug Fix"
    subject?: string;     // "PRM393", "SWD392"
    instruction?: string; // Optional custom instruction for the AI (e.g. persona)
  };
}

export interface TextAnalysisResult {
  /** Score awarded (0 to maxPoints) */
  score: number;
  /** Percentage (0.0 to 1.0) */
  percentage: number;
  /** Vietnamese explanation of the scoring decision */
  reasoning: string;
  /** Key concepts the student correctly addressed */
  keyConceptsCovered: string[];
  /** Key concepts the student missed */
  keyConceptsMissing: string[];
  /** Constructive feedback for the student */
  suggestions: string;
  /** AI confidence in the grading (0.0 to 1.0) */
  confidence: number;
  /** Exact extracted text from the student's full document that was used for grading */
  studentAnswerExtracted?: string;
}

// ─── Engine ──────────────────────────────────────────────────────────

export class AiTextAnalysisEngine {
  constructor() {
    // No longer hold a single client instance, use AiClientManager instead
  }

  /**
   * Evaluate a single text answer against a reference answer.
   */
  public async evaluateAsync(input: TextAnalysisInput): Promise<TextAnalysisResult> {
    const { studentAnswer, referenceAnswer, criterionDescription, maxPoints, requiredConcepts, context } = input;

    // Guard: empty student answer → 0 points
    if (!studentAnswer || studentAnswer.trim().length === 0) {
      return {
        score: 0,
        percentage: 0,
        reasoning: 'Sinh viên không trả lời câu hỏi này.',
        keyConceptsCovered: [],
        keyConceptsMissing: requiredConcepts || [],
        suggestions: 'Cần trả lời đầy đủ câu hỏi.',
        confidence: 1.0,
        studentAnswerExtracted: ''
      };
    }

    const contextStr = context
      ? `\nExam: ${context.examType || 'N/A'} | Part: ${context.partLabel || 'N/A'} | Subject: ${context.subject || 'N/A'}`
      : '';

    const requiredConceptsStr = requiredConcepts?.length
      ? `\nREQUIRED KEY CONCEPTS (student must address these for full marks):\n${requiredConcepts.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}`
      : '';

    const instructionStr = context?.instruction ? `\nINSTRUCTION: ${context.instruction}` : '';

    const prompt = `You are an academic grader for a university-level IT exam at FPT University.
Your task is to grade a student's written answer by comparing it against the reference answer.

═══════════════════════════════════════
GRADING CONTEXT${contextStr}${instructionStr}
═══════════════════════════════════════
CRITERION: ${criterionDescription}
MAX POINTS: ${maxPoints}
${requiredConceptsStr}

═══════════════════════════════════════
REFERENCE ANSWER (Model answer — this is what a correct answer looks like):
═══════════════════════════════════════
${referenceAnswer}

═══════════════════════════════════════
STUDENT'S ANSWER (This is what you must grade):
═══════════════════════════════════════
${studentAnswer}

═══════════════════════════════════════
GRADING RULES:
1. Award points based on SEMANTIC MEANING and KEY CONCEPTS covered, NOT exact wording. Be extremely lenient with phrasing as long as the core idea is correct.
2. Accept equivalent terminology. Example: "Service" ≈ "Repository" if the context makes it functionally equivalent. "Provider" ≈ "BLoC" ≈ "State Management".
3. Partial credit: If 3/4 key concepts present → 75% of max points. If the student touches on the right idea but is vague, award partial credit.
4. DO NOT penalize for grammar, spelling, or formatting.
5. DO NOT penalize for additional correct information beyond the reference answer.
6. DO penalize for factually WRONG statements, even if mixed with correct ones.
7. If the student's answer is better or more detailed than the reference, give full marks or above-expected credit.
8. Minimum score is 0. Maximum score is ${maxPoints}.

═══════════════════════════════════════
OUTPUT FORMAT — Return ONLY valid JSON:
{
  "studentAnswerExtracted": "<Trích dẫn chính xác đoạn văn bản của sinh viên mà bạn dùng để chấm điểm (nếu có)>",
  "percentage": <MUST BE EXACTLY ONE OF: 0.0, 0.25, 0.5, 0.75, 1.0>,
  "score": <percentage multiplied by ${maxPoints}>,
  "reasoning": "<Vietnamese explanation: What was good, what was missing, why this score>",
  "keyConceptsCovered": ["concept1", "concept2"],
  "keyConceptsMissing": ["concept3"],
  "suggestions": "<Vietnamese constructive feedback for the student>",
  "confidence": <number from 0.0 to 1.0>
}

CRITICAL: All text fields (reasoning, suggestions) MUST be in Vietnamese.`;

    let response: any;
    let lastError: any;

    const cacheKey = "txt_" + crypto.createHash('sha256').update(prompt).digest('hex');

    try {
      response = await AiClientManager.executeWithFallback(async (client, model) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        try {
          return await Promise.race([
            client.chat.completions.create({
              model: model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.0,
              response_format: { type: 'json_object' },
            }, { signal: controller.signal as any }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), 90000))
          ]);
        } finally {
          clearTimeout(timeoutId);
        }
      }, cacheKey);
    } catch (error: any) {
      lastError = error;
      console.warn(`[AiTextAnalysisEngine] AI evaluation failed: ${error.message || error}`);
      throw lastError;
    }

    try {

      let text = response.choices[0].message.content?.trim() || '{}';
      text = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
      const parsed = JSON.parse(text) as TextAnalysisResult;

      // Clamp score to valid range
      parsed.score = Math.max(0, Math.min(maxPoints, parsed.score));
      parsed.percentage = Math.max(0, Math.min(1, parsed.percentage));
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence || 0.8));

      return parsed;
    } catch (error: any) {
      console.error('[AiTextAnalysisEngine] Failed to evaluate:', error);
      throw new Error(`AI Text Analysis service failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Batch evaluate multiple text answers (for an entire exam section).
   * Processes sequentially to respect rate limits.
   */
  public async evaluateBatchAsync(inputs: TextAnalysisInput[]): Promise<TextAnalysisResult[]> {
    const results: TextAnalysisResult[] = [];
    for (const input of inputs) {
      try {
        const result = await this.evaluateAsync(input);
        results.push(result);
      } catch (error: any) {
        console.error(`[AiTextAnalysisEngine] Batch item failed for: ${input.context?.partLabel}`, error);
        throw error;
      }
    }
    return results;
  }
}


