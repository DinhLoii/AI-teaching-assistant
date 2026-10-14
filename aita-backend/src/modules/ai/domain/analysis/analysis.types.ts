/**
 * Analysis Domain Types for AITA Document & Assignment Analysis Engine
 * Defines deterministic parsing, structural sectioning, provenance, and adaptive rubric models.
 */

export type FieldProvenance =
  | 'EXTRACTED'       // Directly parsed from source document with exact quote
  | 'RULE_INFERRED'   // Deduced deterministically via code heuristics & syntax inspection
  | 'AI_SUGGESTED'    // Synthesized by LLM when document lacks explicit detail
  | 'DEFAULT'         // System environment / syllabus configuration fallback
  | 'TEACHER_VERIFIED'// Explicitly validated or edited by instructor

export type ValidationStatus = 'valid' | 'warning' | 'error'

export interface ProvenancedField<T> {
  value: T
  source: FieldProvenance
  evidence?: string
  confidence: number // 0.0 to 1.0
  validationStatus: ValidationStatus
  reviewNeeded: boolean
  notes?: string
}

export type RubricSourceType = 'ORIGINAL_DOCUMENT' | 'AI_GENERATED' | 'HYBRID_ADAPTED'

export type RubricDetectionStatus =
  | 'DETECTED_COMPLETE'          // Rubric found with well-defined criteria and consistent point summation
  | 'DETECTED_INCOMPLETE_POINTS' // Rubric found but some criteria are missing explicit numeric points
  | 'DETECTED_MISMATCH_TOTAL'    // Rubric found but sum of criteria does not match stated total points
  | 'UNREADABLE_RUBRIC'          // Rubric header/table detected but structure is corrupted or ambiguous
  | 'NO_RUBRIC'                  // Conclusive evidence that no grading rubric exists in the document

export interface AnalyzedRubricCriterion {
  id: string
  name: string
  description: string
  maxPoints: number
  weight?: number
  method: 'test_runner' | 'ai_assessment' | 'deterministic_rule' | 'hybrid'
  passCondition: string
  failCondition: string
  aiGuidance: string
  source: FieldProvenance
  evidence?: string
  evidenceSource?: string
  levels?: any[]
  rationale?: string
  reviewNeeded: boolean
  notes?: string
}

export interface AnalyzedTestCase {
  id: string
  input: string
  expectedOutput: string
  points: number
  isHidden: boolean
  comparisonMode: 'trim_whitespace' | 'exact' | 'flexible'
  source: FieldProvenance
  evidence?: string
  notes?: string
}

export interface DocumentSection {
  type:
    | 'HEADER_METADATA'
    | 'PROBLEM_STATEMENT'
    | 'INPUT_OUTPUT_SPEC'
    | 'CONSTRAINTS'
    | 'EXAMPLES'
    | 'RUBRIC_GRADING'
    | 'SAMPLE_CODE'
    | 'GENERAL_NOTES'
  title: string
  content: string
  rawLines: string[]
  startLine: number
  endLine: number
}

export interface RawExtractionResult {
  rawText: string
  cleanedText: string
  filename?: string
  fileExtension?: string
  charCount: number
  lineCount: number
  pageCount?: number
  isScannedOrImageOnly: boolean
  scanWarning?: string
  sections: DocumentSection[]
  documentHash: string
}

export interface AnalysisProvenanceReport {
  documentHash: string
  extractionQuality: 'high' | 'medium' | 'low' | 'scanned_needs_ocr'
  isScannedOrImageOnly: boolean
  scanNotice?: string
  detectedSections: string[]
  rubricDetectionStatus: RubricDetectionStatus
  rubricSourceType: RubricSourceType
  rubricAnalysisNotes: string
  rawRubricEvidence?: string
  originalTotalPoints?: number
  statedTotalPoints?: number
  targetTotalPoints: number
  pointsSumDelta: number // 0 if exact match
  fields: {
    title: ProvenancedField<string>
    language: ProvenancedField<string>
    allowedLanguages: ProvenancedField<string[]>
    category: ProvenancedField<'standard' | 'sql' | 'multimodule'>
    submissionType: ProvenancedField<'single_file' | 'project_archive'>
    entryFile: ProvenancedField<string>
    allowedFormats: ProvenancedField<string[]>
    totalPoints: ProvenancedField<number>
    testCasesCount: ProvenancedField<number>
    rubricCriteriaCount: ProvenancedField<number>
  }
}

export interface AdaptiveAnalysisOutput {
  suggestedTitle: string
  description?: string
  detectedLanguage: string
  allowedLanguages?: string[]
  assignmentCategory: 'standard' | 'sql' | 'multimodule'
  submissionFormat: {
    submissionType: 'single_file' | 'project_archive'
    allowedFormats: string[]
    requiredLanguage: string
    entryFile: string
    directoryStructure: string
    resubmissionPolicy: 'highest' | 'latest'
  }
  runtimeConfig: {
    language: string
    version: string
    submissionStyle: 'single_file' | 'project_archive'
    buildCommand: string
    runCommand: string
    category: 'standard' | 'sql' | 'multimodule'
  }
  sqlConfig?: {
    dbms: 'postgresql' | 'mysql' | 'sqlserver' | 'sqlite'
    schemaDdl: string
    seedData: string
    expectedQuery: string
    comparisonMode: 'exact' | 'ignore_order' | 'structure_and_data'
    constraintsNotes: string
  }
  requirements: string[]
  inputSpecification?: string
  outputSpecification?: string
  constraints?: string[]
  testCases: AnalyzedTestCase[]
  rubricCriteria: AnalyzedRubricCriterion[]
  edgeCasesAndPitfalls: {
    edgeCases: string[]
    commonPitfalls: string
    referenceMaterials: string
  }
  sampleSolution?: string
  summaryExplanation: string
  modelUsed: string
  provenanceReport: AnalysisProvenanceReport
}
