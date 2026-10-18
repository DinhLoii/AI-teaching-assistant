import { createHash } from 'node:crypto'
import type { DocumentSection, RawExtractionResult } from '../../domain/analysis/analysis.types.js'

export interface ExtractInputFile {
  filename: string
  buffer: Buffer
  mimetype?: string
}

export class DocumentExtractorService {
  private readonly TEXT_AND_CODE_EXTS = new Set([
    'c', 'cpp', 'cc', 'cxx', 'h', 'hpp',
    'java', 'py', 'cs', 'sql', 'js', 'ts',
    'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'html'
  ])

  async extract(
    file?: ExtractInputFile,
    promptText?: string
  ): Promise<RawExtractionResult> {
    let rawText = ''
    let filename = file?.filename
    let fileExtension = ''
    let isScannedOrImageOnly = false
    let scanWarning: string | undefined
    let pageCount: number | undefined

    if (file && file.buffer) {
      fileExtension = (file.filename.split('.').pop() || '').toLowerCase()

      if (fileExtension === 'pdf') {
        const pdfResult = await this.extractPdf(file.buffer, file.filename)
        rawText = pdfResult.text
        pageCount = pdfResult.pageCount
        isScannedOrImageOnly = pdfResult.isScanned
        scanWarning = pdfResult.scanWarning
      } else if (fileExtension === 'docx') {
        rawText = await this.extractDocx(file.buffer)
      } else if (this.TEXT_AND_CODE_EXTS.has(fileExtension)) {
        rawText = file.buffer.toString('utf-8')
      } else {
        // Fallback for unknown extension: attempt UTF-8 string conversion
        try {
          rawText = file.buffer.toString('utf-8')
        } catch {
          rawText = ''
        }
      }
    }

    // Combine file content with user-provided prompt or description
    const userPrompt = (promptText || '').trim()
    if (userPrompt) {
      if (rawText) {
        rawText = `${rawText}\n\n=== NỘI DUNG MÔ TẢ BỔ SUNG TỪ GIẢNG VIÊN ===\n${userPrompt}`
      } else {
        rawText = userPrompt
      }
    }

    const cleanedText = this.normalizeText(rawText)
    const lines = cleanedText.split('\n')
    const sections = this.detectSections(cleanedText)

    // Compute deterministic SHA-256 hash of the cleaned text
    const documentHash = createHash('sha256').update(cleanedText).digest('hex')

    return {
      rawText,
      cleanedText,
      filename,
      fileExtension,
      charCount: cleanedText.length,
      lineCount: lines.length,
      pageCount,
      isScannedOrImageOnly,
      scanWarning,
      sections,
      documentHash,
    }
  }

  private async extractPdf(buffer: Buffer, filename: string): Promise<{
    text: string
    pageCount?: number
    isScanned: boolean
    scanWarning?: string
  }> {
    let extractedText = ''
    let pageCount: number | undefined

    try {
      const pdfParseModule: any = await import('pdf-parse')
      if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: buffer })
        await parser.load()
        const res = await parser.getText()
        pageCount = parser.pageCount || res?.pages?.length
        await parser.destroy()
        if (res && res.text) extractedText = res.text
      } else {
        const fn = pdfParseModule.default || pdfParseModule
        if (typeof fn === 'function') {
          const res = await fn(buffer)
          if (res && res.text) {
            extractedText = res.text
            pageCount = res.numpages
          }
        }
      }
    } catch (err: any) {
      console.warn(`[DocumentExtractor] PDF parsing error for "${filename}":`, err?.message || err)
    }

    const trimmed = (extractedText || '').trim()
    const nonWhitespaceCount = trimmed.replace(/\s+/g, '').length

    // Detect if this is an image-only / scanned PDF
    // E.g. file size is > 20KB but extracted text is fewer than 40 readable characters
    const isScanned = buffer.length > 20480 && nonWhitespaceCount < 40

    let scanWarning: string | undefined
    if (isScanned) {
      scanWarning = `Tệp PDF "${filename}" có dung lượng ${(buffer.length / 1024).toFixed(1)} KB nhưng không trích xuất được văn bản số (chỉ có ${nonWhitespaceCount} ký tự). Đây có thể là tài liệu dạng scan/ảnh chụp. Hệ thống đã đánh dấu cần xử lý OCR hoặc nhập bổ sung mô tả đề bài.`
      console.warn(`[DocumentExtractor] ${scanWarning}`)
    }

    return {
      text: extractedText,
      pageCount,
      isScanned,
      scanWarning,
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      const mammothModule: any = await import('mammoth')
      const mammoth = mammothModule.default || mammothModule
      const docxData = await mammoth.convertToHtml({ buffer })
      // extractRawText drops Word soft line breaks (<w:br>), joining stdin
      // commands and expected output. Preserve those breaks and cell boundaries.
      return (docxData?.value || '')
        .replace(/<br\s*\/?\s*>/gi, '\n')
        .replace(/<\/(?:p|h[1-6]|td|th|tr|table|li)>/gi, '\n\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&#x([0-9a-f]+);/gi, (_: string, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_: string, number: string) => String.fromCodePoint(Number(number)))
        .replaceAll('&nbsp;', ' ').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
    } catch (err: any) {
      console.warn('[DocumentExtractor] DOCX parsing error:', err?.message || err)
      return ''
    }
  }

  /**
   * Normalizes Unicode, whitespace, and preserves critical elements:
   * - NFC Unicode normalization (avoids broken Vietnamese composite accents)
   * - Preserves indentation inside code snippets
   * - Preserves mathematical operators (<, >, <=, >=, !=, ==, ->, &&, ||, %, ^, etc.)
   * - Removes non-printable control characters while retaining tab and newline
   * - Cleans redundant page numbering and trailing spaces
   */
  public normalizeText(text: string): string {
    if (!text) return ''

    return text
      // 1. NFC normalization ensures Vietnamese diacritics are properly composed
      .normalize('NFC')
      // 2. Normalize Windows and legacy line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // 3. Remove non-printable control chars except \t, \n
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      // 4. Clean repeating page headers / footers (e.g. "Trang 1/5", "Page 2 of 10")
      .replace(/(?:Trang|Page)\s+\d+\s*(?:\/|of)\s*\d+/gi, '')
      .replace(/Trang\s+\d+/gi, '')
      // 5. Connect hyphenated line wraps (e.g., "nghiệp-\n vụ" -> "nghiệp vụ")
      .replace(/(\p{L}+)-\n\s*(\p{L}+)/gu, '$1$2')
      // 6. Clean consecutive horizontal spaces while keeping line breaks intact
      .replace(/[ \t]+/g, ' ')
      // 7. Collapse more than 3 consecutive newlines to at most 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  /**
   * Segments the document into semantic sections without rigid fixed-keyword matching.
   * Recognizes both Vietnamese and English structural conventions.
   */
  public detectSections(text: string): DocumentSection[] {
    const lines = text.split('\n')
    const sections: DocumentSection[] = []

    const sectionPatterns: Array<{
      type: DocumentSection['type']
      regex: RegExp
    }> = [
      {
        type: 'RUBRIC_GRADING',
        regex: /^(?:#{1,4}\s*)?(?:(?:\d+|[IVXLCDM]+|phần\s*\d+|mục\s*\d+|part\s*\d+|section\s*\d+)[\.:\s\-\)]*)?(?:thang\s*điểm|barem\s*(?:điểm|chấm)?|tiêu\s*chí\s*(?:chấm|đánh\s*giá)|bảng\s*điểm|rubric|grading\s*criteria|marking\s*scheme|evaluation\s*criteria)\b/i,
      },
      {
        type: 'INPUT_OUTPUT_SPEC',
        regex: /^(?:#{1,4}\s*)?(?:(?:\d+|[IVXLCDM]+|phần\s*\d+|mục\s*\d+|part\s*\d+|section\s*\d+)[\.:\s\-\)]*)?(?:đầu\s*vào|đầu\s*ra|dữ\s*liệu\s*vào|kết\s*quả\s*xuất|quy\s*cách\s*vào\s*ra|định\s*dạng\s*(?:đầu\s*vào|đầu\s*ra)|input\s*(?:specification|format)?|output\s*(?:specification|format)?)\b/i,
      },
      {
        type: 'CONSTRAINTS',
        regex: /^(?:#{1,4}\s*)?(?:(?:\d+|[IVXLCDM]+|phần\s*\d+|mục\s*\d+|part\s*\d+|section\s*\d+)[\.:\s\-\)]*)?(?:ràng\s*buộc|giới\s*hạn|điều\s*kiện\s*dữ\s*liệu|constraints|limitations|time\s*limit|memory\s*limit|yêu\s*cầu\s*bảo\s*mật)\b/i,
      },
      {
        type: 'EXAMPLES',
        regex: /^(?:#{1,4}\s*)?(?:(?:\d+|[IVXLCDM]+|phần\s*\d+|mục\s*\d+|part\s*\d+|section\s*\d+)[\.:\s\-\)]*)?(?:ví\s*dụ|ví\s*dụ\s*minh\s*họa|test\s*cases?|kiểm\s*thử|examples?|sample\s*(?:test|case|data))\b/i,
      },
      {
        type: 'SAMPLE_CODE',
        regex: /^(?:#{1,4}\s*)?(?:(?:\d+|[IVXLCDM]+|phần\s*\d+|mục\s*\d+|part\s*\d+|section\s*\d+)[\.:\s\-\)]*)?(?:mã\s*nguồn\s*(?:mẫu|tham\s*khảo|khởi\s*tạo)|starter\s*code|skeleton\s*code|sample\s*solution|template\s*code)\b/i,
      },
      {
        type: 'PROBLEM_STATEMENT',
        regex: /^(?:#{1,4}\s*)?(?:(?:\d+|[IVXLCDM]+|phần\s*\d+|mục\s*\d+|part\s*\d+|section\s*\d+)[\.:\s\-\)]*)?(?:mô\s*tả\s*(?:đề\s*bài|bài\s*toán|yêu\s*cầu)|nội\s*dung\s*yêu\s*cầu|bài\s*toán|yêu\s*cầu\s*chức\s*năng|problem\s*description|task\s*description|statement|overview)\b/i,
      },
    ]

    let currentSection: DocumentSection = {
      type: 'HEADER_METADATA',
      title: 'Thông tin chung đề bài',
      content: '',
      rawLines: [],
      startLine: 1,
      endLine: 1,
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      let matchedType: DocumentSection['type'] | null = null

      if (line.length > 0 && line.length < 100) {
        for (const p of sectionPatterns) {
          if (p.regex.test(line)) {
            matchedType = p.type
            break
          }
        }
      }

      if (matchedType && matchedType !== currentSection.type) {
        // Finalize previous section
        if (currentSection.rawLines.length > 0) {
          currentSection.content = currentSection.rawLines.join('\n').trim()
          currentSection.endLine = i
          sections.push(currentSection)
        }

        // Start new section
        currentSection = {
          type: matchedType,
          title: line.replace(/^[#\*\-\s]+/, '').trim(),
          content: '',
          rawLines: [lines[i]],
          startLine: i + 1,
          endLine: i + 1,
        }
      } else {
        currentSection.rawLines.push(lines[i])
      }
    }

    // Push the final section
    if (currentSection.rawLines.length > 0) {
      currentSection.content = currentSection.rawLines.join('\n').trim()
      currentSection.endLine = lines.length
      sections.push(currentSection)
    }

    return sections
  }
}
