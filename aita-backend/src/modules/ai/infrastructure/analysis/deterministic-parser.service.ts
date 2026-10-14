import type {
  AnalyzedRubricCriterion,
  AnalyzedTestCase,
  DocumentSection,
  ProvenancedField,
  RawExtractionResult,
  RubricDetectionStatus,
  RubricSourceType,
} from '../../domain/analysis/analysis.types.js'

export interface DeterministicParseResult {
  title: ProvenancedField<string>
  language: ProvenancedField<string>
  allowedLanguages: ProvenancedField<string[]>
  category: ProvenancedField<'standard' | 'sql' | 'multimodule'>
  submissionType: ProvenancedField<'single_file' | 'project_archive'>
  entryFile: ProvenancedField<string>
  allowedFormats: ProvenancedField<string[]>
  requirements: string[]
  inputSpecification?: string
  outputSpecification?: string
  constraints: string[]
  testCases: AnalyzedTestCase[]
  rubricCriteria: AnalyzedRubricCriterion[]
  rubricDetectionStatus: RubricDetectionStatus
  rubricSourceType: RubricSourceType
  rawRubricEvidence?: string
  statedTotalPoints?: number
  criteriaPointsSum: number
  rubricAnalysisNotes: string
}

export class DeterministicParserService {
  public parse(
    extraction: RawExtractionResult,
    targetMaxScore: number = 10,
    subjectContext?: { code?: string; name?: string },
    preferredLanguage?: string,
    preferredCategory?: 'standard' | 'sql' | 'multimodule'
  ): DeterministicParseResult {
    const text = extraction.cleanedText
    const textLower = text.toLowerCase()
    const filenameLower = (extraction.filename || '').toLowerCase()
    const ext = (extraction.fileExtension || '').toLowerCase()

    // ── 1. Language & Category Detection ──
    const langResult = this.detectLanguage(
      ext,
      filenameLower,
      text,
      textLower,
      subjectContext,
      preferredLanguage,
      preferredCategory
    )

    // ── 2. Title Extraction ──
    const titleResult = this.extractTitle(text, extraction.filename)

    // ── 3. Requirements, I/O Specs, Constraints ──
    const reqResult = this.extractRequirementsAndSpecs(text, extraction.sections)

    // ── 4. Example / Test Cases Extraction ──
    const testCasesResult = this.extractTestCases(text, extraction.sections)

    // ── 5. Rubric Detection & Extraction (Branch A vs Branch B) ──
    const rubricResult = this.extractRubric(text, extraction.sections, targetMaxScore)

    // ── 6. Submission Format & Entry File Defaults ──
    const formatResult = this.determineSubmissionFormat(langResult.language.value, langResult.category.value)

    return {
      title: titleResult,
      language: langResult.language,
      allowedLanguages: langResult.allowedLanguages,
      category: langResult.category,
      submissionType: formatResult.submissionType,
      entryFile: formatResult.entryFile,
      allowedFormats: formatResult.allowedFormats,
      requirements: reqResult.requirements,
      inputSpecification: reqResult.inputSpec,
      outputSpecification: reqResult.outputSpec,
      constraints: reqResult.constraints,
      testCases: testCasesResult,
      rubricCriteria: rubricResult.criteria,
      rubricDetectionStatus: rubricResult.status,
      rubricSourceType: rubricResult.sourceType,
      rawRubricEvidence: rubricResult.rawEvidence,
      statedTotalPoints: rubricResult.statedTotalPoints,
      criteriaPointsSum: rubricResult.criteriaPointsSum,
      rubricAnalysisNotes: rubricResult.analysisNotes,
    }
  }

  /**
   * Multi-signal language & category detection
   */
  /**
   * Multi-signal language & category detection with weighted signal scoring
   */
  private detectLanguage(
    ext: string,
    filenameLower: string,
    text: string,
    textLower: string,
    subjectContext?: { code?: string; name?: string },
    preferredLanguage?: string,
    preferredCategory?: 'standard' | 'sql' | 'multimodule'
  ): {
    language: ProvenancedField<string>
    allowedLanguages: ProvenancedField<string[]>
    category: ProvenancedField<'standard' | 'sql' | 'multimodule'>
  } {
    // 1. Direct file extension (strongest deterministic signal)
    if (ext === 'c' || ext === 'h') {
      return {
        language: { value: 'C', source: 'EXTRACTED', evidence: `Tệp nguồn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['C'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'hpp') {
      return {
        language: { value: 'C++', source: 'EXTRACTED', evidence: `Tệp nguồn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['C++'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (ext === 'java') {
      return {
        language: { value: 'Java', source: 'EXTRACTED', evidence: `Tệp nguồn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['Java'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (ext === 'py') {
      return {
        language: { value: 'Python', source: 'EXTRACTED', evidence: `Tệp nguồn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['Python'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (ext === 'sql') {
      return {
        language: { value: 'SQL', source: 'EXTRACTED', evidence: `Tệp truy vấn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['SQL'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'sql', source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (ext === 'cs') {
      return {
        language: { value: 'C#', source: 'EXTRACTED', evidence: `Tệp nguồn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['C#'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') {
      return {
        language: { value: 'JavaScript', source: 'EXTRACTED', evidence: `Tệp nguồn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['JavaScript'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (ext === 'ts') {
      return {
        language: { value: 'TypeScript', source: 'EXTRACTED', evidence: `Tệp nguồn đuôi .${ext}`, confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['TypeScript'], source: 'EXTRACTED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 1.0, validationStatus: 'valid', reviewNeeded: false },
      }
    }

    // 2. Explicit statement in document text
    const explicitPatterns = [
      /(?:ngôn\s*ngữ(?:\s*lập\s*trình)?|programming\s*language|language)[\s:]+([^\n\r\.\,;]+)/i,
      /(?:sử\s*dụng|dùng|viết\s*(?:chương\s*trình|code|bài\s*tập)?\s*bằng|cài\s*đặt\s*bằng|thực\s*hiện\s*bằng)[\s:]+([^\n\r\.\,;]+)/i,
      /(?:môn|học\s*phần|kỳ\s*thi|đề\s*thi)[\s:\-]+([^\n\r]+)/i,
    ]

    for (const pat of explicitPatterns) {
      const match = text.match(pat)
      if (match) {
        const stated = match[1].trim()
        const foundLangs: string[] = []
        if (/(?:c\+\+|cpp|cplusplus)/i.test(stated)) foundLangs.push('C++')
        if (/(?:c#|csharp|\.net|dotnet)/i.test(stated)) foundLangs.push('C#')
        if (/\b(?:java)\b/i.test(stated) && !/javascript/i.test(stated)) foundLangs.push('Java')
        if (/\b(?:python|python3|py)\b/i.test(stated)) foundLangs.push('Python')
        if (/\b(?:sql|database|csdl|cơ sở dữ liệu)\b/i.test(stated)) foundLangs.push('SQL')
        if (/\b(?:javascript|typescript|nodejs|node\.js)\b/i.test(stated)) foundLangs.push('JavaScript')

        // Safe detection of C: only accept explicit programming phrases or C/C++ combos (never bare single letter 'c')
        if (/(?:c\s*[\/\&]\s*c\+\+|c\s+hoặc\s+c\+\+|c\s+và\s+c\+\+|c\s*\/\s*cpp)/i.test(stated)) {
          if (!foundLangs.includes('C')) foundLangs.push('C')
          if (!foundLangs.includes('C++')) foundLangs.push('C++')
        } else if (/\b(lập\s*trình\s*c|ngôn\s*ngữ\s*c|c\s*programming|ansi\s*c|chuẩn\s*c(?:99|11|17)|môn\s*prf192)\b/i.test(stated)) {
          foundLangs.push('C')
        } else if (/^(?:c)$/i.test(stated.trim()) || /(?:ngôn\s*ngữ|language)[\s:]+\s*c\b/i.test(match[0])) {
          if (!/(?:c\+\+|c#|cơ\s*bản)/i.test(stated)) {
            foundLangs.push('C')
          }
        }

        if (foundLangs.length > 0) {
          const primary = foundLangs[0]
          const cat = primary === 'SQL' ? 'sql' : 'standard'
          return {
            language: { value: primary, source: 'EXTRACTED', evidence: match[0], confidence: 0.95, validationStatus: 'valid', reviewNeeded: false },
            allowedLanguages: { value: foundLangs, source: 'EXTRACTED', evidence: match[0], confidence: 0.95, validationStatus: 'valid', reviewNeeded: false },
            category: { value: cat, source: 'RULE_INFERRED', confidence: 0.95, validationStatus: 'valid', reviewNeeded: false },
          }
        }
      }
    }

    // 3. Filename patterns
    if (/\b(lap-trinh-c|c-programming|prf192)\b/i.test(filenameLower)) {
      return {
        language: { value: 'C', source: 'RULE_INFERRED', evidence: `Tên tệp: ${filenameLower}`, confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['C'], source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (/(?:cpp|cplusplus|c\+\+)/i.test(filenameLower)) {
      return {
        language: { value: 'C++', source: 'RULE_INFERRED', evidence: `Tên tệp: ${filenameLower}`, confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['C++'], source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (/\b(java|pro192|prj301)\b/i.test(filenameLower)) {
      return {
        language: { value: 'Java', source: 'RULE_INFERRED', evidence: `Tên tệp: ${filenameLower}`, confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['Java'], source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (/\b(python|py|ite302)\b/i.test(filenameLower)) {
      return {
        language: { value: 'Python', source: 'RULE_INFERRED', evidence: `Tên tệp: ${filenameLower}`, confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['Python'], source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'standard', source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
      }
    }
    if (/\b(sql|dbi202|database|csdl)\b/i.test(filenameLower)) {
      return {
        language: { value: 'SQL', source: 'RULE_INFERRED', evidence: `Tên tệp: ${filenameLower}`, confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: ['SQL'], source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
        category: { value: 'sql', source: 'RULE_INFERRED', confidence: 0.85, validationStatus: 'valid', reviewNeeded: false },
      }
    }

    // 4. Weighted Signal Scoring from Text Content
    const scores: Record<string, { score: number; evidence: string[] }> = {
      Python: { score: 0, evidence: [] },
      Java: { score: 0, evidence: [] },
      'C++': { score: 0, evidence: [] },
      C: { score: 0, evidence: [] },
      SQL: { score: 0, evidence: [] },
      'C#': { score: 0, evidence: [] },
      JavaScript: { score: 0, evidence: [] },
      TypeScript: { score: 0, evidence: [] },
    }

    const addScore = (lang: string, points: number, reason: string) => {
      if (scores[lang]) {
        scores[lang].score += points
        scores[lang].evidence.push(reason)
      }
    }

    // -- Header / Title Boost (first 1500 chars of document) --
    const headerSlice = text.slice(0, 1500)
    const headerLower = headerSlice.toLowerCase()

    if (/\b(?:python|python3|lập\s*trình\s*python)\b/i.test(headerLower)) {
      addScore('Python', 35, 'Từ khóa Python trong tiêu đề/phần đầu đề bài')
    }
    if (/\b(?:java|lập\s*trình\s*java|oop\s*java)\b/i.test(headerLower) && !/javascript/i.test(headerLower)) {
      addScore('Java', 35, 'Từ khóa Java trong tiêu đề/phần đầu đề bài')
    }
    if (/(?:c\+\+|cpp|cplusplus|lập\s*trình\s*c\+\+)/i.test(headerLower)) {
      addScore('C++', 35, 'Từ khóa C++ trong tiêu đề/phần đầu đề bài')
    }
    if (/\b(lập\s*trình\s*c|ngôn\s*ngữ\s*c|c\s*programming|chuẩn\s*c(?:99|11|17))\b/i.test(headerLower)) {
      addScore('C', 35, 'Từ khóa Lập trình C trong tiêu đề/phần đầu đề bài')
    }
    if (/\b(sql|cơ\s*sở\s*dữ\s*liệu|csdl|truy\s*vấn\s*dữ\s*liệu|database|dbi202)\b/i.test(headerLower)) {
      addScore('SQL', 35, 'Từ khóa Cơ sở dữ liệu / SQL trong tiêu đề/phần đầu đề bài')
    }
    if (/(?:c#|csharp|\.net|dotnet|lập\s*trình\s*c#)/i.test(headerLower)) {
      addScore('C#', 35, 'Từ khóa C# trong tiêu đề/phần đầu đề bài')
    }
    if (/(?:javascript|typescript|nodejs|node\.js)/i.test(headerLower)) {
      const isTs = /typescript/i.test(headerLower)
      addScore(isTs ? 'TypeScript' : 'JavaScript', 35, 'Từ khóa JS/TS trong tiêu đề/phần đầu đề bài')
    }

    // -- Python body signals --
    if (/\b(?:python|python3)\b/i.test(textLower)) addScore('Python', 15, 'Từ khóa Python trong văn bản')
    if (/\bdef\s+[a-zA-Z0-9_]+\s*\(/i.test(text)) addScore('Python', 15, 'Cú pháp định nghĩa hàm def')
    if (/\bimport\s+(?:math|sys|os|numpy|pandas|re|json|random|[a-zA-Z0-9_]+)\b/i.test(text)) addScore('Python', 12, 'Import thư viện Python')
    if (/\bfrom\s+[a-zA-Z0-9_]+\s+import\b/i.test(text)) addScore('Python', 12, 'Cú pháp from ... import')
    if (/\belif\s+/i.test(text)) addScore('Python', 10, 'Cú pháp elif')
    if (/\b__init__\b/i.test(text) || /\bself\./i.test(text)) addScore('Python', 12, 'Cú pháp hướng đối tượng Python (self, __init__)')
    if (/\bfor\s+[a-zA-Z0-9_]+\s+in\s+range\s*\(/i.test(text)) addScore('Python', 10, 'Vòng lặp for ... in range')
    if (/\bprint\s*\(/i.test(text) && !textLower.includes('system.out.print') && !textLower.includes('printf')) addScore('Python', 8, 'Hàm print()')
    if (/\binput\s*\(/i.test(text) && !textLower.includes('cin')) addScore('Python', 8, 'Hàm input()')
    if (/\.py\b/i.test(textLower)) addScore('Python', 15, 'Đuôi tệp mở rộng .py trong văn bản')

    // -- Java body signals --
    if (/\bjava\b/i.test(textLower) && !/javascript/i.test(textLower)) addScore('Java', 15, 'Từ khóa Java trong văn bản')
    if (/\bpublic\s+class\s+[A-Z]/i.test(text)) addScore('Java', 18, 'Khai báo public class')
    if (/\bpublic\s+static\s+void\s+main\b/i.test(text)) addScore('Java', 25, 'Phương thức main chuẩn Java')
    if (/System\.(?:out|err)\.(?:print|println|printf)/i.test(text)) addScore('Java', 18, 'System.out.println trong Java')
    if (/Scanner\s+[a-zA-Z0-9_]+\s*=\s*new\s+Scanner/i.test(text)) addScore('Java', 15, 'Khởi tạo đối tượng Scanner')
    if (/ArrayList\s*<[A-Za-z0-9_]+>/i.test(text)) addScore('Java', 10, 'Generic ArrayList Java')
    if (/\bString\[\]\s+args\b/i.test(text)) addScore('Java', 12, 'Tham số String[] args')
    if (/@Override\b/i.test(text)) addScore('Java', 10, 'Annotation @Override')
    if (/\b(?:extends|implements)\s+[A-Z]/i.test(text) && !scores['C#'].score) addScore('Java', 8, 'Kế thừa OOP Java (extends/implements)')
    if (/\.java\b/i.test(textLower)) addScore('Java', 15, 'Đuôi tệp mở rộng .java trong văn bản')

    // -- C++ body signals --
    if (/(?:c\+\+|cpp|cplusplus)/i.test(textLower)) addScore('C++', 15, 'Từ khóa C++ trong văn bản')
    if (/#include\s*<iostream>/i.test(text)) addScore('C++', 25, 'Thư viện <iostream>')
    if (/#include\s*<(?:vector|algorithm|string|map|set|cmath)>/i.test(text)) addScore('C++', 12, 'Thư viện chuẩn STL C++')
    if (/\bcout\s*<</i.test(text)) addScore('C++', 18, 'Đối tượng cout <<')
    if (/\bcin\s*>>/i.test(text)) addScore('C++', 18, 'Đối tượng cin >>')
    if (/\bstd::/i.test(text)) addScore('C++', 12, 'Namespace std::')
    if (/using\s+namespace\s+std\s*;/i.test(text)) addScore('C++', 20, 'using namespace std;')
    if (/\bvector\s*<[a-zA-Z0-9_]+>/i.test(text)) addScore('C++', 10, 'Kiểu dữ liệu vector STL')
    if (/\.cpp\b/i.test(textLower)) addScore('C++', 15, 'Đuôi tệp mở rộng .cpp trong văn bản')

    // -- C body signals --
    if (/\b(lập\s*trình\s*c|ngôn\s*ngữ\s*c|c\s*programming)\b/i.test(textLower)) addScore('C', 15, 'Từ khóa môn học Lập trình C')
    if (/#include\s*<stdio\.h>/i.test(text)) addScore('C', 25, 'Thư viện chuẩn <stdio.h>')
    if (/#include\s*<stdlib\.h>/i.test(text)) addScore('C', 12, 'Thư viện chuẩn <stdlib.h>')
    if (/\bprintf\s*\(/i.test(text) && !scores['Java'].score && !scores['C++'].score) addScore('C', 10, 'Hàm printf trong C')
    if (/\bscanf\s*\(/i.test(text)) addScore('C', 12, 'Hàm scanf trong C')
    if (/\b(?:malloc|free)\s*\(/i.test(text)) addScore('C', 10, 'Cấp phát bộ nhớ C (malloc/free)')
    if (/\.c\b/i.test(textLower) && !/\.cpp\b|\.cs\b/i.test(textLower)) addScore('C', 15, 'Đuôi tệp mở rộng .c trong văn bản')

    // -- SQL body signals --
    if (/\b(sql|cơ\s*sở\s*dữ\s*liệu|csdl|truy\s*vấn|database|dbi202)\b/i.test(textLower)) addScore('SQL', 15, 'Từ khóa Cơ sở dữ liệu / SQL')
    if (/\bSELECT\b[\s\S]+?\bFROM\b/i.test(text)) addScore('SQL', 25, 'Cú pháp câu lệnh SELECT ... FROM')
    if (/\bCREATE\s+TABLE\b/i.test(text)) addScore('SQL', 25, 'Cú pháp DDL CREATE TABLE')
    if (/\bINSERT\s+INTO\b/i.test(text)) addScore('SQL', 18, 'Cú pháp INSERT INTO')
    if (/\bGROUP\s+BY\b|\bORDER\s+BY\b/i.test(text)) addScore('SQL', 15, 'Cú pháp GROUP BY / ORDER BY')
    if (/\bINNER\s+JOIN|\bLEFT\s+JOIN/i.test(text)) addScore('SQL', 15, 'Cú pháp JOIN bảng dữ liệu')
    if (/\.sql\b/i.test(textLower)) addScore('SQL', 20, 'Đuôi tệp mở rộng .sql trong văn bản')

    // -- C# body signals --
    if (/(?:c#|csharp|\.net|dotnet|prn211|prn221)/i.test(textLower)) addScore('C#', 15, 'Từ khóa C# / .NET')
    if (/using\s+System\s*;/i.test(text)) addScore('C#', 25, 'using System;')
    if (/Console\.(?:WriteLine|ReadLine|Write)\b/i.test(text)) addScore('C#', 20, 'Console.WriteLine() trong C#')
    if (/\.cs\b/i.test(textLower)) addScore('C#', 15, 'Đuôi tệp mở rộng .cs trong văn bản')

    // -- JS / TS signals --
    if (/(?:javascript|nodejs|node\.js)/i.test(textLower)) addScore('JavaScript', 15, 'Từ khóa JavaScript trong văn bản')
    if (/\btypescript\b/i.test(textLower)) addScore('TypeScript', 15, 'Từ khóa TypeScript trong văn bản')
    if (/console\.log\b/i.test(text)) addScore('JavaScript', 15, 'Hàm console.log()')
    if (/const\s+[a-zA-Z0-9_]+\s*=\s*(?:require|import)/i.test(text)) addScore('JavaScript', 15, 'Cú pháp import/require JavaScript')

    // 5. Subject Context Signal (Only as a minor tiebreaker hint when document has no strong signals)
    const hasStrongDocSignal = Object.values(scores).some(s => s.score >= 10)
    let subjectHintApplied = false

    if (!hasStrongDocSignal) {
      const subjectInfo = [subjectContext?.code, subjectContext?.name].filter(Boolean).join(' ').toLowerCase()
      if (subjectInfo) {
        if (subjectInfo.includes('pro192') || subjectInfo.includes('prj301') || subjectInfo.includes('java') || subjectInfo.includes('prm391') || subjectInfo.includes('prm392')) {
          addScore('Java', 3, `Gợi ý từ môn học (${subjectInfo})`)
          subjectHintApplied = true
        } else if (subjectInfo.includes('prf192') || subjectInfo.includes('lập trình c') || subjectInfo.includes('c cơ bản')) {
          addScore('C', 3, `Gợi ý từ môn học (${subjectInfo})`)
          subjectHintApplied = true
        } else if (subjectInfo.includes('dbi202') || subjectInfo.includes('database') || subjectInfo.includes('sql') || subjectInfo.includes('cơ sở dữ liệu')) {
          addScore('SQL', 3, `Gợi ý từ môn học (${subjectInfo})`)
          subjectHintApplied = true
        } else if (subjectInfo.includes('python') || subjectInfo.includes('ite302') || subjectInfo.includes('mas291')) {
          addScore('Python', 3, `Gợi ý từ môn học (${subjectInfo})`)
          subjectHintApplied = true
        } else if (subjectInfo.includes('prn211') || subjectInfo.includes('prn221') || subjectInfo.includes('c#') || subjectInfo.includes('.net')) {
          addScore('C#', 3, `Gợi ý từ môn học (${subjectInfo})`)
          subjectHintApplied = true
        } else if (subjectInfo.includes('cpp') || subjectInfo.includes('c++')) {
          addScore('C++', 3, `Gợi ý từ môn học (${subjectInfo})`)
          subjectHintApplied = true
        }
      }
    }

    // Find the highest-scoring language
    let bestLang = ''
    let bestScore = 0
    let bestEvidence = ''

    for (const [langName, data] of Object.entries(scores)) {
      if (data.score > bestScore) {
        bestScore = data.score
        bestLang = langName
        bestEvidence = data.evidence.join('; ')
      }
    }

    if (bestScore >= 10) {
      const cat = bestLang === 'SQL' ? 'sql' : 'standard'
      return {
        language: { value: bestLang, source: 'RULE_INFERRED', evidence: bestEvidence, confidence: Math.min(0.95, 0.80 + (bestScore * 0.01)), validationStatus: 'valid', reviewNeeded: false },
        allowedLanguages: { value: [bestLang], source: 'RULE_INFERRED', confidence: 0.9, validationStatus: 'valid', reviewNeeded: false },
        category: { value: cat, source: 'RULE_INFERRED', confidence: 0.9, validationStatus: 'valid', reviewNeeded: false },
      }
    }

    if (bestScore > 0) {
      const cat = bestLang === 'SQL' ? 'sql' : 'standard'
      const isWeakHint = subjectHintApplied || bestScore < 10
      return {
        language: {
          value: bestLang,
          source: isWeakHint ? 'DEFAULT' : 'RULE_INFERRED',
          evidence: bestEvidence,
          confidence: isWeakHint ? 0.6 : 0.75,
          validationStatus: isWeakHint ? 'warning' : 'valid',
          reviewNeeded: isWeakHint,
          notes: isWeakHint ? 'Tín hiệu ngôn ngữ yếu từ tài liệu hoặc môn học, cần AI xác thực lại.' : undefined,
        },
        allowedLanguages: { value: [bestLang], source: isWeakHint ? 'DEFAULT' : 'RULE_INFERRED', confidence: isWeakHint ? 0.6 : 0.75, validationStatus: 'valid', reviewNeeded: isWeakHint },
        category: { value: cat, source: isWeakHint ? 'DEFAULT' : 'RULE_INFERRED', confidence: isWeakHint ? 0.6 : 0.75, validationStatus: 'valid', reviewNeeded: isWeakHint },
      }
    }

    // 6. User Preferred Fallback (when no language was detected at all in text)
    const fallbackLang = preferredLanguage || 'Java'
    const fallbackCat = preferredCategory || (fallbackLang === 'SQL' ? 'sql' : 'standard')
    return {
      language: { value: fallbackLang, source: 'DEFAULT', confidence: 0.5, validationStatus: 'warning', reviewNeeded: true, notes: 'Không tìm thấy tín hiệu ngôn ngữ rõ ràng trong đề bài, cần AI thẩm định hoặc giảng viên kiểm tra.' },
      allowedLanguages: { value: [fallbackLang], source: 'DEFAULT', confidence: 0.5, validationStatus: 'warning', reviewNeeded: true },
      category: { value: fallbackCat, source: 'DEFAULT', confidence: 0.5, validationStatus: 'warning', reviewNeeded: true },
    }
  }

  /**
   * Title Extraction
   */
  private extractTitle(text: string, filename?: string): ProvenancedField<string> {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    // Check for explicit title pattern
    for (const line of lines.slice(0, 15)) {
      const match = line.match(/^(?:đề\s*bài|bài\s*tập|tên\s*bài|assignment|lab\s*\d+|problem|task)[\s:\-]+([^\n\r]+)/i)
      if (match && match[1].trim().length > 3) {
        return {
          value: match[1].trim().replace(/^[#\*\s]+/, ''),
          source: 'EXTRACTED',
          evidence: line,
          confidence: 0.95,
          validationStatus: 'valid',
          reviewNeeded: false,
        }
      }
    }

    // Look for first prominent line that isn't university / exam header boilerplate
    const ignoreRegex = /^(bộ\s*giáo\s*dục|trường\s*đại\s*học|khoa\s*công\s*nghệ|kỳ\s*thi|học\s*kỳ|mã\s*đề|thời\s*gian\s*làm\s*bài|ngày\s*thi|họ\s*và\s*tên|mssv|lớp)/i
    for (const line of lines.slice(0, 10)) {
      if (!ignoreRegex.test(line) && line.length > 5 && line.length < 90 && !line.startsWith('//') && !line.startsWith('/*')) {
        const cleaned = line.replace(/^[0-9\.\-\s#]+/, '').trim()
        if (cleaned.length > 3) {
          return {
            value: cleaned,
            source: 'RULE_INFERRED',
            evidence: line,
            confidence: 0.8,
            validationStatus: 'valid',
            reviewNeeded: false,
          }
        }
      }
    }

    // Fallback: derive from filename
    if (filename) {
      const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim()
      if (baseName.length > 3) {
        return {
          value: baseName,
          source: 'RULE_INFERRED',
          evidence: `Tên tệp: ${filename}`,
          confidence: 0.7,
          validationStatus: 'valid',
          reviewNeeded: false,
        }
      }
    }

    return {
      value: 'Bài tập thực hành lập trình',
      source: 'DEFAULT',
      confidence: 0.4,
      validationStatus: 'warning',
      reviewNeeded: true,
      notes: 'Chưa phát hiện tiêu đề bài tập rõ ràng trong tài liệu.',
    }
  }

  /**
   * Extract Requirements, I/O Specs, and Constraints
   */
  private extractRequirementsAndSpecs(text: string, sections: DocumentSection[]): {
    requirements: string[]
    inputSpec?: string
    outputSpec?: string
    constraints: string[]
  } {
    let inputSpec: string | undefined
    let outputSpec: string | undefined
    const constraints: string[] = []
    const requirements: string[] = []

    // 1. Check categorized sections
    for (const sec of sections) {
      if (sec.type === 'INPUT_OUTPUT_SPEC') {
        const lines = sec.content.split('\n')
        const inputLines: string[] = []
        const outputLines: string[] = []
        let currentMode: 'input' | 'output' | null = null

        for (const l of lines) {
          if (/đầu\s*vào|input/i.test(l)) {
            currentMode = 'input'
            inputLines.push(l)
          } else if (/đầu\s*ra|output/i.test(l)) {
            currentMode = 'output'
            outputLines.push(l)
          } else if (currentMode === 'input') {
            inputLines.push(l)
          } else if (currentMode === 'output') {
            outputLines.push(l)
          }
        }

        if (inputLines.length > 0) inputSpec = inputLines.join('\n').trim()
        if (outputLines.length > 0) outputSpec = outputLines.join('\n').trim()
        if (!inputSpec && !outputSpec) inputSpec = sec.content
      } else if (sec.type === 'CONSTRAINTS') {
        const cLines = sec.content.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !l.startsWith('#'))
        constraints.push(...cLines)
      } else if (sec.type === 'PROBLEM_STATEMENT') {
        const rLines = sec.content.split('\n')
          .map(l => l.trim())
          .filter(l => /^[-*\d\.]+\s+/.test(l) && l.length > 10)
        if (rLines.length > 0) {
          requirements.push(...rLines.map(r => r.replace(/^[-*\d\.]+\s+/, '')))
        }
      }
    }

    // 2. Inline regex checks if sections were not cleanly demarcated
    if (!inputSpec) {
      const match = text.match(/(?:đầu\s*vào|input\s*format|dữ\s*liệu\s*vào)[\s:\-]+([^\n\r]+(?:\n[^\n\r]+){0,4})/i)
      if (match) inputSpec = match[1].trim()
    }
    if (!outputSpec) {
      const match = text.match(/(?:đầu\s*ra|output\s*format|kết\s*quả\s*xuất)[\s:\-]+([^\n\r]+(?:\n[^\n\r]+){0,4})/i)
      if (match) outputSpec = match[1].trim()
    }
    if (constraints.length === 0) {
      const match = text.match(/(?:ràng\s*buộc|constraints|giới\s*hạn)[\s:\-]+([^\n\r]+(?:\n[^\n\r]+){0,5})/i)
      if (match) {
        constraints.push(...match[1].split('\n').map(l => l.trim()).filter(Boolean))
      }
    }

    if (requirements.length === 0) {
      // Look for numbered or bullet lines in text
      const bulletMatches = text.match(/(?:^|\n)\s*(?:[-*•]|\d+[\.\)])\s+([^\n\r]{15,250})/g)
      if (bulletMatches && bulletMatches.length > 0) {
        const cleaned = bulletMatches
          .map(m => m.trim().replace(/^[-*•\d\.\)\s]+/, '').trim())
          .filter(l => l.length > 15 && !/^(?:thang|barem|tiêu\s*chí|điểm|input|output|ví\s*dụ|sample|trang|page)\b/i.test(l))
        if (cleaned.length > 0) {
          requirements.push(...cleaned.slice(0, 7))
        }
      }
    }

    if (requirements.length === 0) {
      // Look for action-oriented requirement sentences in the document
      const actionMatches = text.match(/(?:viết\s*(?:chương\s*trình|hàm|code)|xây\s*dựng\s*(?:lớp|chức\s*năng)|cài\s*đặt\s*hàm|tính\s*toán|kiểm\s*tra|đọc\s*dữ\s*liệu|in\s*ra\s*màn\s*hình|sắp\s*xếp)[^\.\n\r]{10,200}[\.\n\r]/gi)
      if (actionMatches && actionMatches.length > 0) {
        requirements.push(...actionMatches.slice(0, 5).map(m => m.trim().replace(/^[\-\*\d\.\s]+/, '')))
      }
    }

    return { requirements, inputSpec, outputSpec, constraints }
  }

  /**
   * Extract Test Cases / Examples from text
   */
  private extractTestCases(text: string, _sections: DocumentSection[]): AnalyzedTestCase[] {
    const testCases: AnalyzedTestCase[] = []

    // 1. Look inside document text for Input / Output example pairs
    const searchTexts = [text]

    for (const st of searchTexts) {
      // Regex pattern for Input / Output pairs (excluding Input Format / Output Format specifications)
      const ioPattern = /(?:Input(?!\s*Format)|Đầu\s*vào(?!\s*Format)|Sample\s*Input)[\s:\-]+([\s\S]*?)(?:Output(?!\s*Format)|Đầu\s*ra(?!\s*Format)|Sample\s*Output)[\s:\-]+([\s\S]*?)(?=(?:Input|Đầu\s*vào|Sample\s*Input|Ví\s*dụ|Example|\n\n\n|$))/gi
      let match: RegExpExecArray | null

      while ((match = ioPattern.exec(st)) !== null) {
        const rawInput = match[1].trim()
        const rawOutput = match[2].trim()

        // Ignore false positives from markdown table headers (e.g. "| Input | Output |") or format descriptions
        if (
          !rawInput ||
          !rawOutput ||
          /^[\s\|]+$/.test(rawInput) ||
          /^[\s\|]+$/.test(rawOutput) ||
          /^(?:format|quy\s*cách|mô\s*tả|dòng\s*đầu\s*tiên\s*chứa)/i.test(rawInput) ||
          /^(?:format|quy\s*cách|mô\s*tả|in\s*ra\s*một\s*số)/i.test(rawOutput)
        ) {
          continue
        }

        testCases.push({
          id: `tc-ext-${Date.now()}-${testCases.length + 1}`,
          input: rawInput,
          expectedOutput: rawOutput,
          points: 2,
          isHidden: false,
          comparisonMode: 'trim_whitespace',
          source: 'EXTRACTED',
          evidence: match[0].slice(0, 200),
          notes: 'Trích xuất trực tiếp từ ví dụ minh họa của đề bài.',
        })
      }
    }

    // 2. Table format: | Input | Output | ... | 5 | 25 |
    const lines = text.split('\n')
    let isInsideIoTable = false

    for (const line of lines) {
      if (/\|\s*(?:input|đầu\s*vào|dữ\s*liệu\s*vào)\s*\|\s*(?:output|đầu\s*ra|kết\s*quả)\s*\|/i.test(line)) {
        isInsideIoTable = true
        continue
      }
      if (isInsideIoTable) {
        if (/^[\s\|\-:]+$/.test(line)) continue // markdown table divider
        const rowMatch = line.match(/^\|\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*\|$/)
        if (rowMatch) {
          const tInput = rowMatch[1].trim()
          const tOutput = rowMatch[2].trim()
          if (tInput || tOutput) {
            testCases.push({
              id: `tc-table-${Date.now()}-${testCases.length + 1}`,
              input: tInput,
              expectedOutput: tOutput,
              points: 2,
              isHidden: false,
              comparisonMode: 'trim_whitespace',
              source: 'EXTRACTED',
              evidence: line.slice(0, 150),
              notes: 'Trích xuất từ bảng ví dụ Input/Output trong đề bài.',
            })
          }
        } else {
          isInsideIoTable = false
        }
      }
    }

    return testCases
  }

  /**
   * Rubric Detection & Extraction (Phase 4 - Branch A vs Branch B)
   *
   * Systematically checks:
   * 1. Does the document contain a grading criteria / rubric / thang điểm section?
   * 2. Can we extract structured criteria with points?
   * 3. Do points sum correctly?
   * 4. Return clear status: DETECTED_COMPLETE, DETECTED_INCOMPLETE_POINTS, DETECTED_MISMATCH_TOTAL, UNREADABLE_RUBRIC, or NO_RUBRIC.
   */
  public extractRubric(
    text: string,
    sections: DocumentSection[],
    targetMaxScore: number = 10
  ): {
    criteria: AnalyzedRubricCriterion[]
    status: RubricDetectionStatus
    sourceType: RubricSourceType
    rawEvidence?: string
    statedTotalPoints?: number
    criteriaPointsSum: number
    analysisNotes: string
  } {
    // 1. Check if a dedicated RUBRIC_GRADING section was found
    const rubricSections = sections.filter(s => s.type === 'RUBRIC_GRADING')
    let rubricContent = rubricSections.map(s => s.content).join('\n\n')

    // 2. If no section separated, search for rubric text blocks using strong anchors
    if (!rubricContent) {
      const rubricAnchorMatch = text.match(
        /(?:(?:thang|barem)\s*điểm|tiêu\s*chí\s*(?:chấm|đánh\s*giá)|bảng\s*điểm|rubric|grading\s*criteria|marking\s*scheme|evaluation\s*criteria)[\s:\-]+([\s\S]{30,2500})/i
      )
      if (rubricAnchorMatch) {
        rubricContent = rubricAnchorMatch[0]
      }
    }

    // If completely no rubric indicators found:
    if (!rubricContent) {
      return {
        criteria: [],
        status: 'NO_RUBRIC',
        sourceType: 'AI_GENERATED',
        criteriaPointsSum: 0,
        analysisNotes: 'Đề bài không chứa thang điểm hoặc rubric gốc. Hệ thống sẽ tự động đề xuất Barem Rubric phù hợp với đặc thù bài toán.',
      }
    }

    // 3. Extract Stated Total Points if mentioned (e.g. "Tổng điểm: 20", "Thang điểm 100", "Total: 10 marks")
    let statedTotalPoints: number | undefined
    const totalMatch = rubricContent.match(/(?:tổng\s*(?:cộng\s*)?điểm|thang\s*điểm|total\s*(?:points?|marks?|score)?)[\s:\-]+(\d+(?:[\.,]\d+)?)/i)
    if (totalMatch) {
      statedTotalPoints = parseFloat(totalMatch[1].replace(',', '.'))
    }

    // 4. Parse criteria items
    const rawLines = rubricContent.split('\n').map(l => l.trim()).filter(Boolean)
    const criteria: AnalyzedRubricCriterion[] = []
    let hasUnscoredCriteria = false

    // Patterns for extracting criteria and points:
    // Pattern 1: Table row e.g. "| Đúng thuật toán | 4 điểm |" or "| 1 | Cài đặt hàm | 2.5 |"
    // Pattern 2: Numbered / bullet list e.g. "- Cài đặt class và OOP: 3 điểm" or "1. Đúng test cases: 4.0đ"
    // Pattern 3: Key - value e.g. "Tính đúng đắn (4đ): Mô tả..."

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i]

      // Ignore title lines or table headers
      if (/^(?:thang|barem|tiêu\s*chí|rubric|stt|criteria|điểm|points|max\s*points)\b/i.test(line) && !line.includes(':') && !/\d+/.test(line)) {
        continue
      }
      if (/^[\-\|\+\s]+$/.test(line)) continue // separator line

      // Check for table row
      if (line.includes('|')) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean)
        if (cols.length >= 2) {
          // Look for numeric point column
          let pointVal: number | null = null
          let nameVal = ''
          let descVal = ''

          for (let cIdx = cols.length - 1; cIdx >= 0; cIdx--) {
            const col = cols[cIdx]
            const pMatch = col.match(/^(\d+(?:[\.,]\d+)?)\s*(?:đ|điểm|pts?|points?|marks?|%)?$/i)
            if (pMatch && pointVal === null) {
              pointVal = parseFloat(pMatch[1].replace(',', '.'))
            } else if (!nameVal) {
              nameVal = col
            } else {
              descVal = `${col} - ${descVal}`.trim()
            }
          }

          const isHeader = cols.some(c => /^(?:tiêu\s*chí|điểm|stt|nội\s*dung|tổng|thang\s*điểm|criteria|points?|marks?|score|description|yêu\s*cầu)\b/i.test(c))
          if (isHeader && pointVal === null) {
            continue
          }

          if (nameVal && !/^(?:tiêu\s*chí|điểm|stt|nội\s*dung|tổng)/i.test(nameVal)) {
            const maxPts = pointVal ?? 0
            if (pointVal === null) hasUnscoredCriteria = true
            criteria.push(this.buildCriterionItem(
              nameVal,
              descVal || nameVal,
              maxPts,
              line,
              pointVal === null
            ))
            continue
          }
        }
      }

      // Check for bullet or numbered list:
      // e.g. "1. Hoàn thành hàm tính tiền: 3.0 điểm"
      // e.g. "- Xử lý trường hợp mảng rỗng (1đ): Bắt ngoại lệ và in 0"
      const listItemMatch = line.match(/^(?:[-*•]|\d+[\.\)])\s*(.+)/)
      if (listItemMatch) {
        const itemBody = listItemMatch[1].trim()
        const pointMatch = itemBody.match(/[:\-\(]\s*(\d+(?:[\.,]\d+)?)\s*(?:đ|điểm|pts?|points?|marks?|\/10|\/20)?\s*[\)\:]?\s*(.*)$/i)

        if (pointMatch) {
          const pointVal = parseFloat(pointMatch[1].replace(',', '.'))
          const namePart = itemBody.slice(0, pointMatch.index).replace(/^[#\*\s]+/, '').trim()
          const descPart = pointMatch[2]?.trim() || namePart

          criteria.push(this.buildCriterionItem(
            namePart || `Tiêu chí ${criteria.length + 1}`,
            descPart || namePart,
            pointVal,
            line,
            false
          ))
          continue
        } else {
          // List item without clear numeric points
          if (itemBody.length > 5 && !/^(?:tổng\s*cộng|lưu\s*ý|chú\s*ý)/i.test(itemBody)) {
            hasUnscoredCriteria = true
            criteria.push(this.buildCriterionItem(
              itemBody.slice(0, 60),
              itemBody,
              0,
              line,
              true
            ))
            continue
          }
        }
      }

      // General line with points pattern
      const generalPointMatch = line.match(/^([^:\-\(]+?)[\s:\-\(]+(\d+(?:[\.,]\d+)?)\s*(?:đ|điểm|pts?|points?|marks?)\s*[\)\:]?\s*(.*)$/i)
      if (generalPointMatch && !/^(?:thời\s*gian|học\s*kỳ|lớp|ngày|tổng|thang\s*điểm|total|stt)/i.test(generalPointMatch[1])) {
        const pointVal = parseFloat(generalPointMatch[2].replace(',', '.'))
        const namePart = generalPointMatch[1].trim()
        const descPart = generalPointMatch[3]?.trim() || namePart

        criteria.push(this.buildCriterionItem(
          namePart,
          descPart,
          pointVal,
          line,
          false
        ))
      }
    }

    // 5. Evaluate Rubric Detection Status
    const criteriaPointsSum = Number(criteria.reduce((sum, c) => sum + (c.maxPoints || 0), 0).toFixed(2))

    if (criteria.length === 0) {
      // Rubric section was detected, but parsing individual rows failed
      return {
        criteria: [],
        status: 'UNREADABLE_RUBRIC',
        sourceType: 'ORIGINAL_DOCUMENT',
        rawEvidence: rubricContent.slice(0, 500),
        criteriaPointsSum: 0,
        analysisNotes: 'Phát hiện có khu vực thang điểm trong đề bài nhưng cấu trúc văn bản không trích xuất tự động được bảng điểm chi tiết. Cần giảng viên xem lại.',
      }
    }

    if (hasUnscoredCriteria) {
      return {
        criteria,
        status: 'DETECTED_INCOMPLETE_POINTS',
        sourceType: 'ORIGINAL_DOCUMENT',
        rawEvidence: rubricContent.slice(0, 500),
        statedTotalPoints,
        criteriaPointsSum,
        analysisNotes: `Đã trích xuất ${criteria.length} tiêu chí từ đề bài, tuy nhiên một số tiêu chí chưa ghi rõ điểm thành phần. Giảng viên cần kiểm tra và phân bổ điểm.`,
      }
    }

    const hasMismatchWithStated = statedTotalPoints !== undefined && Math.abs(criteriaPointsSum - statedTotalPoints) > 0.05
    const hasMismatchWithTarget = targetMaxScore !== undefined && targetMaxScore > 0 && Math.abs(criteriaPointsSum - targetMaxScore) > 0.05

    if (hasMismatchWithStated || hasMismatchWithTarget) {
      return {
        criteria,
        status: 'DETECTED_MISMATCH_TOTAL',
        sourceType: 'ORIGINAL_DOCUMENT',
        rawEvidence: rubricContent.slice(0, 500),
        statedTotalPoints: statedTotalPoints || criteriaPointsSum,
        criteriaPointsSum,
        analysisNotes: hasMismatchWithStated
          ? `Cảnh báo: Tổng điểm các tiêu chí trong đề (${criteriaPointsSum}đ) không khớp với tổng điểm công bố (${statedTotalPoints}đ). Hệ thống giữ nguyên nội dung gốc để giảng viên điều chỉnh.`
          : `Cảnh báo: Tổng điểm các tiêu chí trong đề (${criteriaPointsSum}đ) khác với thang điểm mặc định (${targetMaxScore}đ). Hệ thống bảo lưu trọn vẹn điểm gốc (${criteriaPointsSum}đ) theo đề bài.`,
      }
    }

    return {
      criteria,
      status: 'DETECTED_COMPLETE',
      sourceType: 'ORIGINAL_DOCUMENT',
      rawEvidence: rubricContent.slice(0, 500),
      statedTotalPoints: statedTotalPoints || criteriaPointsSum,
      criteriaPointsSum,
      analysisNotes: `Trích xuất thành công 100% Barem Rubric gốc từ đề bài (${criteria.length} tiêu chí, tổng cộng ${criteriaPointsSum} điểm). Giữ nguyên trọn vẹn barem của giảng viên.`,
    }
  }

  private buildCriterionItem(
    name: string,
    description: string,
    maxPoints: number,
    evidence: string,
    isUnscored: boolean
  ): AnalyzedRubricCriterion {
    // Determine method based on keywords
    let method: AnalyzedRubricCriterion['method'] = 'ai_assessment'
    const combined = `${name} ${description}`.toLowerCase()

    if (/test|kịch bản|chức năng|output|chạy|input|kết quả/i.test(combined)) {
      method = 'test_runner'
    } else if (/biên|ngoại lệ|exception|crash|rỗng|overflow/i.test(combined)) {
      method = 'hybrid'
    } else if (/format|định dạng|quy ước|nộp bài|clean code|tên file|giải phóng/i.test(combined)) {
      method = 'deterministic_rule'
    }

    return {
      id: `rc-orig-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.replace(/^[0-9\.\-\s#]+/, '').trim(),
      description: description.trim(),
      maxPoints,
      method,
      passCondition: `Đạt trọn vẹn yêu cầu "${name}" theo đề bài.`,
      failCondition: `Không hoàn thành hoặc vi phạm yêu cầu "${name}".`,
      aiGuidance: `Đối chiếu mã nguồn và kết quả thực thi theo tiêu chí: "${description}".`,
      source: 'EXTRACTED',
      evidence: evidence.slice(0, 150),
      reviewNeeded: isUnscored,
      notes: isUnscored ? 'Tiêu chí chưa có điểm thành phần trong đề' : undefined,
    }
  }

  public determineSubmissionFormat(
    language: string,
    category: 'standard' | 'sql' | 'multimodule'
  ) {
    return DeterministicParserService.determineSubmissionFormat(language, category)
  }

  /**
   * Determine submission format and entry file defaults
   */
  public static determineSubmissionFormat(
    language: string,
    category: 'standard' | 'sql' | 'multimodule'
  ): {
    submissionType: ProvenancedField<'single_file' | 'project_archive'>
    entryFile: ProvenancedField<string>
    allowedFormats: ProvenancedField<string[]>
  } {
    let subType: 'single_file' | 'project_archive' = 'single_file'
    let entry = 'main.c'
    let formats = ['.c', '.zip']

    if (language === 'C++') {
      subType = 'single_file'
      entry = 'main.cpp'
      formats = ['.cpp', '.zip']
    } else if (language === 'Java') {
      subType = 'project_archive'
      entry = 'Main.java'
      formats = ['.java', '.zip']
    } else if (language === 'Python') {
      subType = 'single_file'
      entry = 'main.py'
      formats = ['.py', '.zip']
    } else if (language === 'SQL' || category === 'sql') {
      subType = 'single_file'
      entry = 'solution.sql'
      formats = ['.sql']
    } else if (language === 'C#') {
      subType = 'single_file'
      entry = 'Program.cs'
      formats = ['.cs', '.zip']
    } else if (language === 'JavaScript') {
      subType = 'single_file'
      entry = 'index.js'
      formats = ['.js', '.zip']
    } else if (language === 'TypeScript') {
      subType = 'single_file'
      entry = 'index.ts'
      formats = ['.ts', '.zip']
    }

    return {
      submissionType: { value: subType, source: 'RULE_INFERRED', confidence: 0.9, validationStatus: 'valid', reviewNeeded: false },
      entryFile: { value: entry, source: 'RULE_INFERRED', confidence: 0.9, validationStatus: 'valid', reviewNeeded: false },
      allowedFormats: { value: formats, source: 'RULE_INFERRED', confidence: 0.9, validationStatus: 'valid', reviewNeeded: false },
    }
  }
}
