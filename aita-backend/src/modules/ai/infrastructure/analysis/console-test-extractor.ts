import type { AnalyzedTestCase } from '../../domain/analysis/analysis.types.js'

/** Extract explicitly labelled reference cases, including flattened two-column DOCX tables. */
export function extractLabeledConsoleTests(text: string): AnalyzedTestCase[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const countedCommands = /dòng đầu[^\n]*\bQ\b/i.test(normalized) && /(?:mỗi|mọi|từng)[^\n]*(?:một|1) dòng|số dòng[^\n]*\bQ\b/i.test(normalized)
  const blocks = [...normalized.matchAll(/^[ \t]*(TC\s*\d+|Test\s+Case\s*#?\s*\d+)[^\n]*\n([\s\S]*?)(?=^[ \t]*(?:TC\s*\d+|Test\s+Case\s*#?\s*\d+|\d+[.)][ \t]+\p{L})|$(?![\s\S]))/gimu)].map(block => ({ id: block[1], body: block[2], evidence: block[0] }))
  // A source example need not carry a TC number. Accept explicit sample
  // sections with standalone Input/Output labels; keep them separate from
  // the specification's Input/Output sections and stop at the next heading.
  if (!blocks.length) {
    for (const sample of normalized.matchAll(/^[ \t]*(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(?:ví dụ(?: minh họa)?|examples?|sample(?:\s+(?:input|test|case))?)[^\n]*\n([\s\S]*?)(?=^[ \t]*(?:#{1,6}\s+|\d+[.)]\s+\p{L})|$(?![\s\S]))/gimu)) {
      blocks.push({ id: `SAMPLE${blocks.length + 1}`, body: sample[1], evidence: sample[0] })
    }
  }
  const result: AnalyzedTestCase[] = []
  for (const block of blocks) {
    const inputHeading = /^[ \t]*(?:(?:Sample\s+)?Input(?:\s*(?:\/\s*stdin|\(stdin\)))?|stdin|Đầu\s+vào)[ \t]*:?[ \t]*$/im.exec(block.body)
    const outputHeading = /^[ \t]*(?:(?:(?:Expected|Sample)\s+)?Output(?:\s*(?:\/\s*stdout|\(stdout\)))?|stdout|(?:Kết\s+quả\s+mong\s+đợi|Đầu\s+ra))[ \t]*:?[ \t]*$/im.exec(block.body)
    if (!inputHeading || !outputHeading || outputHeading.index <= inputHeading.index) continue
    let input = block.body.slice(inputHeading.index + inputHeading[0].length, outputHeading.index).trim()
    let output = block.body.slice(outputHeading.index + outputHeading[0].length).trim()
    if (!input) {
      // Table headers were extracted together, followed by the two cell values.
      // Only accept an unambiguous blank-line boundary; never invent a split/output.
      const cells = output.split(/\n[ \t]*\n/).map(cell => cell.trim()).filter(Boolean)
      if (cells.length === 2) {
        ;[input, output] = cells
      } else {
        // Word may insert paragraph gaps between every command. A documented
        // Q-command / Q-output contract gives an exact boundary without guessing.
        const lines = output.split('\n').map(line => line.trim()).filter(Boolean)
        const q = /^\d+$/.test(lines[0] || '') ? Number(lines[0]) : 0
        if (!countedCommands || q < 1 || lines.length !== 2 * q + 1) continue
        input = lines.slice(0, q + 1).join('\n')
        output = lines.slice(q + 1).join('\n')
      }
    }
    if (!input || !output) continue
    // A sample is just one reference example, not a verified full-coverage suite.
    // For documented Q-command problems, reject accidentally truncated examples.
    if (block.id.startsWith('SAMPLE') && /dòng đầu[^\n]*\bQ\b/i.test(normalized)) {
      const inputLines = input.split('\n').filter(line => line.trim())
      const outputLines = output.split('\n').filter(line => line.trim())
      const q = /^\d+$/.test(inputLines[0]) ? Number(inputLines[0]) : 0
      if (q < 1 || inputLines.length !== q + 1 || outputLines.length !== q) continue
    }
    result.push({
      id: block.id.replace(/\s|#/g, ''), input, expectedOutput: output,
      points: 0, isHidden: false, comparisonMode: 'exact', source: 'EXTRACTED',
      evidence: block.evidence.trim(), notes: 'Testcase tham chiếu từ đề gốc; điểm được tính theo tiêu chí rubric, không cộng thêm lần nữa.',
    })
  }
  return result
}
