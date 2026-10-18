import type { AnalyzedTestCase } from '../../domain/analysis/analysis.types.js'

/** Extract explicitly labelled reference cases, including flattened two-column DOCX tables. */
export function extractLabeledConsoleTests(text: string): AnalyzedTestCase[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const countedCommands = /dòng đầu[^\n]*\bQ\b/i.test(normalized) && /(?:mỗi|mọi|từng)[^\n]*(?:một|1) dòng|số dòng[^\n]*\bQ\b/i.test(normalized)
  const blocks = [...normalized.matchAll(/^[ \t]*(TC\s*\d+|Test\s+Case\s*#?\s*\d+)[^\n]*\n([\s\S]*?)(?=^[ \t]*(?:TC\s*\d+|Test\s+Case\s*#?\s*\d+|\d+[.)][ \t]+\p{L})|$(?![\s\S]))/gimu)]
  const result: AnalyzedTestCase[] = []
  for (const block of blocks) {
    const inputHeading = /^[ \t]*(?:(?:Sample\s+)?Input(?:\s*(?:\/\s*stdin|\(stdin\)))?|stdin|Đầu\s+vào)[ \t]*:?[ \t]*$/im.exec(block[2])
    const outputHeading = /^[ \t]*(?:(?:(?:Expected|Sample)\s+)?Output(?:\s*(?:\/\s*stdout|\(stdout\)))?|stdout|(?:Kết\s+quả\s+mong\s+đợi|Đầu\s+ra))[ \t]*:?[ \t]*$/im.exec(block[2])
    if (!inputHeading || !outputHeading || outputHeading.index <= inputHeading.index) continue
    let input = block[2].slice(inputHeading.index + inputHeading[0].length, outputHeading.index).trim()
    let output = block[2].slice(outputHeading.index + outputHeading[0].length).trim()
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
    result.push({
      id: block[1].replace(/\s|#/g, ''), input, expectedOutput: output,
      points: 0, isHidden: false, comparisonMode: 'exact', source: 'EXTRACTED',
      evidence: block[0].trim(), notes: 'Testcase tham chiếu từ đề gốc; điểm được tính theo tiêu chí rubric, không cộng thêm lần nữa.',
    })
  }
  return result
}
