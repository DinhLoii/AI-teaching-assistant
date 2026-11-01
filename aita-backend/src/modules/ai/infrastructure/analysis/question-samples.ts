import type { AnalyzedTestCase } from '../../domain/analysis/analysis.types.js'
/** Samples have implicit stdin before OUTPUT; numbering restarts for every question. */
export function extractQuestionSamples(text: string): AnalyzedTestCase[] {
 const normalized = text.replace(/\r\n?/g, '\n')
 const files = [...normalized.matchAll(/^[^\n]*file\s+to\s+be\s+edited\s*:\s*([\w.-]+)[^\n]*$/gim)]
 const questions = files.length ? files : [...normalized.matchAll(/^\s*Question\s+(\d+)[^\n]*$/gim)]
 const result: AnalyzedTestCase[] = []
 for (let i=0; i<questions.length; i++) {
  const marker=questions[i]; const entryFile=files.length ? marker[1] : undefined
  const questionId = 'Q' + (entryFile?.match(/\d+/)?.[0] || marker[1])
  const body=normalized.slice(marker.index! + marker[0].length, questions[i+1]?.index ?? normalized.length)
  for (const sample of body.matchAll(/^\s*Test\s+case\s*#?\s*(\d+)\s*\n([\s\S]*?)(?=^\s*(?:Test\s+case\s*#?\s*\d+|Question\s+\d+)\b|$(?![\s\S]))/gim)) {
   const parts=sample[2].match(/^([\s\S]*?)^\s*OUTPUT\s*:\s*\n([\s\S]*)$/im)
   if (!parts) continue
   const clean=(value:string)=>value.trim().replace(/^`{3}[^\n]*\n|\n`{3}$/g,'').trim()
   const input=clean(parts[1]).replace(/^INPUT\s*:\s*\n/i,''); const expectedOutput=clean(parts[2])
   if (!input || !expectedOutput) continue
   result.push({id: questionId+'-TC'+sample[1], questionId, entryFile, input, expectedOutput, points:0, isHidden:false, comparisonMode:'exact', source:'EXTRACTED', evidence:sample[0].trim(), notes:'Test mẫu công khai trích nguyên văn từ '+questionId+'.'})
  }
 }
 return result
}
