// @ts-nocheck
import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Enhanced DocumentExtractor for grading submissions.
 *
 * Handles:
 *   - .docx files with structured section extraction (PART A, PART B, etc.)
 *   - Embedded images extracted with section association
 *   - Code blocks detected within text
 *   - PDF and plain text fallbacks
 *
 * Critical for PRM393-style exams where student answers are in a .docx file.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface ExtractedDocument {
    rawText: string;
    sections: ExtractedSection[];
}

export interface ExtractedSection {
    /** Section label, e.g. "PART A", "PART B", "Task F1" */
    partLabel: string;
    /** Section title */
    title: string;
    /** Plain text content (answers) */
    textContent: string;
    /** Code blocks found within this section */
    codeBlocks: CodeBlock[];
    /** Embedded images from this section */
    images: ExtractedImage[];
}

export interface CodeBlock {
    /** Detected or inferred language */
    language: string;
    /** The code content */
    code: string;
}

export interface ExtractedImage {
    /** Sequential index within the document */
    index: number;
    /** Image binary data */
    buffer: Buffer;
    /** Content type (image/png, image/jpeg, etc.) */
    contentType: string;
    /** Auto-labeled from surrounding text context */
    label: string;
    /** True if detected as a teacher template/mockup based on document structure */
    isMockup?: boolean;
}

// ─── Section detection patterns ──────────────────────────────────────

/**
 * Patterns that indicate a new exam section/part boundary.
 * Ordered from most specific to least specific.
 */
const SECTION_PATTERNS: RegExp[] = [
    /^PART\s+([A-Z])\s*[–—-]\s*(.+)/i,                    // PART A – SYSTEM DESIGN
    /^PART\s+([A-Z])\s*$/i,                                // PART A
    /^Task\s+([A-Z]\d+)\s*[–—-]\s*(.+)/i,                  // Task A1 – Architecture Design
    /^Task\s+([A-Z]\d+)\s*$/i,                              // Task A1
    /^(?:Question|Q)\s*(\d+)[.:]\s*(.+)/i,                  // Question 1: ...
    /^(?:Câu|Bài)\s*(\d+)[.:]\s*(.+)/i,                    // Câu 1: ... (Vietnamese)
    /^Change Request\s*(#?\d+)/i,                           // Change Request #1
    /^Additional Analysis Questions/i,                      // Additional Analysis Questions
    /^#{1,3}\s+(?:PART|Part)\s+([A-Z])/,                    // Markdown: ### PART A
    /^(SUBMISSION|GRADING|IMPORTANT|TOTAL)\b/i,             // Terminal sections
];

// ─── Engine ──────────────────────────────────────────────────────────

export class DocumentExtractor {

    /**
     * Extract structured content from a document buffer.
     * Supports: .docx (primary), .pdf, plain text.
     */
    public async extractAsync(fileBuffer: Buffer, mimeType: string): Promise<ExtractedDocument> {
        console.log(`[DocumentExtractor] Extracting content from ${mimeType}...`);

        if (mimeType.includes('word') || this.isDocx(fileBuffer)) {
            return this.extractDocxAsync(fileBuffer);
        }

        if (mimeType.includes('pdf') || this.isPdf(fileBuffer)) {
            return this.extractPdfAsync(fileBuffer);
        }

        // Fallback for other formats: plain text extraction
        let rawText = '';
        try {
            rawText = fileBuffer.toString('utf-8');
        } catch (error) {
            console.error(`[DocumentExtractor] Failed to extract from ${mimeType}`, error);
            rawText = 'Error extracting document content.';
        }

        return {
            rawText,
            sections: this.parseTextIntoSections(rawText, new Set<string>()),
        };
    }

    private isPdf(buffer: Buffer): boolean {
        // PDF magic number: %PDF (25 50 44 46)
        return buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }

    // ─── PDF Extraction ─────────────────────────────────────────────

    private async extractPdfAsync(fileBuffer: Buffer): Promise<ExtractedDocument> {
        try {
            const data = await pdfParse(fileBuffer);
            const rawText = data.text || '';
            
            return {
                rawText,
                sections: this.parseTextIntoSections(rawText, new Set<string>()),
            };
        } catch (error) {
            console.error('[DocumentExtractor] Failed to parse PDF', error);
            return {
                rawText: 'Error extracting PDF content.',
                sections: []
            };
        }
    }

    // ─── DOCX Extraction ─────────────────────────────────────────────

    /**
     * Full DOCX extraction with:
     *   1. Raw text via mammoth
     *   2. Embedded images via mammoth's image conversion
     *   3. Structured section parsing
     */
    private async extractDocxAsync(fileBuffer: Buffer): Promise<ExtractedDocument> {
        const allImages: ExtractedImage[] = [];
        let imageIndex = 0;

        // Extract text + images simultaneously using mammoth's convertToHtml
        // which gives us access to the image conversion pipeline
        const imageHandler = {
            buffer: (imageBuffer: Buffer, contentType: string) => {
                const img: ExtractedImage = {
                    index: imageIndex++,
                    buffer: imageBuffer,
                    contentType,
                    label: `image_${imageIndex}`, // Will be refined after section parsing
                };
                allImages.push(img);
                // Return a placeholder that we can find in the HTML to map images to sections
                return Promise.resolve({ src: `__IMAGE_${img.index}__` });
            },
        };

        let rawText = '';
        let htmlContent = '';
        try {
            // Get both raw text and HTML (for image position tracking)
            const [textResult, htmlResult] = await Promise.all([
                mammoth.extractRawText({ buffer: fileBuffer }),
                mammoth.convertToHtml({ buffer: fileBuffer }, {
                    convertImage: mammoth.images.imgElement(
                        (image: any) => image.read('base64').then((base64Data: string) => {
                            const buf = Buffer.from(base64Data, 'base64');
                            const ct = image.contentType || 'image/png';
                            const img: ExtractedImage = {
                                index: imageIndex++,
                                buffer: buf,
                                contentType: ct,
                                label: `image_${imageIndex}`,
                            };
                            allImages.push(img);
                            return { src: `__IMAGE_${img.index}__` };
                        })
                    ),
                }).catch(() => ({ value: '' })),
            ]);

            rawText = textResult.value || '';
            htmlContent = htmlResult.value || '';
        } catch (error) {
            console.error('[DocumentExtractor] DOCX extraction failed:', error);
            // Fallback to raw text or text extraction from buffer
            try {
                const fallback = await mammoth.extractRawText({ buffer: fileBuffer });
                rawText = fallback.value || '';
            } catch {
                rawText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\x0A\x0D\u00A0-\u024F\u1EA0-\u1EF9]/g, ' ');
            }
            if (!rawText || rawText.trim().length === 0) {
                rawText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\x0A\x0D\u00A0-\u024F\u1EA0-\u1EF9]/g, ' ');
            }
        }

        console.log(`[DocumentExtractor] Extracted ${rawText.length} chars, ${allImages.length} images`);

        // Extract semantic headings from HTML (h1-h6)
        const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/g;
        let match;
        const headingSet = new Set<string>();
        while ((match = headingRegex.exec(htmlContent)) !== null) {
            // Strip inner HTML tags (like <strong>, <span>)
            const text = match[1].replace(/<[^>]+>/g, '').trim();
            if (text.length > 0) {
                headingSet.add(text);
            }
        }
        console.log(`[DocumentExtractor] Discovered ${headingSet.size} semantic headings.`);

        // Parse into structured sections
        const sections = this.parseTextIntoSections(rawText, headingSet);

        // Distribute images across sections based on position in HTML
        this.assignImagesToSections(sections, allImages, htmlContent);

        return { rawText, sections };
    }

    // ─── Section Parsing ─────────────────────────────────────────────

    /**
     * Parse raw text into structured sections based on heading patterns.
     */
    private parseTextIntoSections(rawText: string, headingSet: Set<string>): ExtractedSection[] {
        const lines = rawText.split('\n');
        const sections: ExtractedSection[] = [];

        let currentSection: ExtractedSection = {
            partLabel: 'GENERAL',
            title: 'General',
            textContent: '',
            codeBlocks: [],
            images: [],
        };

        let inCodeBlock = false;
        let currentCodeBlock = '';
        let codeBlockLang = '';

        for (const line of lines) {
            const trimmed = line.trim();

            // Detect code block boundaries (``` markers)
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    // End of code block
                    currentSection.codeBlocks.push({
                        language: codeBlockLang || 'unknown',
                        code: currentCodeBlock.trim(),
                    });
                    currentCodeBlock = '';
                    inCodeBlock = false;
                } else {
                    // Start of code block
                    inCodeBlock = true;
                    codeBlockLang = trimmed.replace('```', '').trim();
                    currentCodeBlock = '';
                }
                continue;
            }

            if (inCodeBlock) {
                currentCodeBlock += line + '\n';
                continue;
            }

            // Check for section boundary
            const sectionMatch = this.matchSectionBoundary(trimmed, headingSet);
            if (sectionMatch) {
                // Save current section if it has content
                if (currentSection.textContent.trim().length > 0 || currentSection.codeBlocks.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    partLabel: sectionMatch.partLabel,
                    title: sectionMatch.title,
                    textContent: '',
                    codeBlocks: [],
                    images: [],
                };
                continue;
            }

            // Detect inline code (indented blocks that look like code)
            if (this.looksLikeCode(trimmed)) {
                // If previous line was also code, append to block
                if (currentCodeBlock.length > 0 || this.looksLikeCode(trimmed)) {
                    currentCodeBlock += line + '\n';
                }
            } else {
                // Flush any accumulated inline code
                if (currentCodeBlock.trim().length > 20) {
                    currentSection.codeBlocks.push({
                        language: this.detectCodeLanguage(currentCodeBlock),
                        code: currentCodeBlock.trim(),
                    });
                }
                currentCodeBlock = '';
                // Add to text content
                if (trimmed.length > 0) {
                    currentSection.textContent += trimmed + '\n';
                }
            }
        }

        // Don't forget the last section
        if (currentSection.textContent.trim().length > 0 || currentSection.codeBlocks.length > 0) {
            sections.push(currentSection);
        }

        return sections;
    }

    /**
     * Match a line against semantic headings, or fallback to known section boundary patterns.
     */
    private matchSectionBoundary(line: string, headingSet: Set<string>): { partLabel: string; title: string } | null {
        if (headingSet.size > 0) {
            // Standard approach: Strictly use Word Document heading styles
            if (headingSet.has(line)) {
                let partLabel = line.substring(0, 20);
                const partMatch = line.match(/^(PART|Task|Question|Q|Câu|Bài)\s*([A-Za-z0-9]+)/i);
                if (partMatch) {
                    partLabel = `PART_${partMatch[2]}`.toUpperCase();
                } else {
                    partLabel = `SECTION_${partLabel.replace(/[^a-zA-Z0-9]/g, '_')}`.toUpperCase();
                }
                return { partLabel, title: line };
            }
            // If semantic headings exist, we DO NOT fallback to regexes.
            // This prevents false positives like "1. Identify the bug" breaking the section.
            return null;
        }

        // Fallback approach: If document has no semantic headings, use legacy regex patterns
        for (const pattern of SECTION_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                // If it's a terminal section (SUBMISSION, GRADING, etc.), mark it
                if (/^(SUBMISSION|GRADING|IMPORTANT|TOTAL)\b/i.test(line)) {
                    return { partLabel: 'META', title: line };
                }
                const partLabel = match[1] || line.substring(0, 20);
                const title = match[2] || line;
                return {
                    partLabel: `PART_${partLabel}`.toUpperCase(),
                    title: title.trim(),
                };
            }
        }
        return null;
    }

    // ─── Image Distribution ──────────────────────────────────────────

    /**
     * Assign extracted images to the section they appear closest to
     * based on their position in the HTML output.
     */
    private assignImagesToSections(
        sections: ExtractedSection[],
        images: ExtractedImage[],
        htmlContent: string
    ): void {
        if (images.length === 0 || sections.length === 0) return;

        // Find image placeholder positions in HTML
        for (const img of images) {
            const placeholder = `__IMAGE_${img.index}__`;
            const imgPos = htmlContent.indexOf(placeholder);

            if (imgPos === -1) {
                // Image not found in HTML, assign to last section
                sections[sections.length - 1].images.push(img);
                continue;
            }

            // Find which section heading appears just before this image
            let bestSection = sections[0];
            let bestSectionPos = -1;
            
            for (const section of sections) {
                const sectionPos = htmlContent.indexOf(section.title);
                if (sectionPos !== -1 && sectionPos < imgPos && sectionPos > bestSectionPos) {
                    bestSection = section;
                    bestSectionPos = sectionPos;
                }
            }

            // Find the boundary of the current section (the start of the next section, or end of doc)
            let nextSectionPos = htmlContent.length;
            for (const section of sections) {
                const sectionPos = htmlContent.indexOf(section.title);
                if (sectionPos > bestSectionPos && sectionPos < nextSectionPos) {
                    nextSectionPos = sectionPos;
                }
            }

            // Generalized regex to catch various teacher instructions like:
            // "Screenshots your demo here", "Add your answer in this doc", "Paste your screenshot below", etc.
            // This is immune to HTML tags inserted by mammoth between words.
            const markerRegex = /((screenshot|paste|add|insert|place)[\s\S]{0,100}?(here|below|answer|demo|doc))/i;
            
            let markerPos = -1;
            // Search within a reasonable forward window (e.g. 4000 characters) to bridge arbitrary heading splits
            const searchHtml = htmlContent.substring(bestSectionPos, Math.min(htmlContent.length, bestSectionPos + 4000));
            const match = searchHtml.match(markerRegex);
            
            if (match && match.index !== undefined) {
                markerPos = bestSectionPos + match.index;
            }

            // If a marker is found and the image is BEFORE the marker, it is a teacher mockup!
            if (markerPos !== -1 && imgPos < markerPos) {
                console.log(`[DocumentExtractor] Flagged teacher mockup image ${img.index} in section ${bestSection.partLabel} (appears before marker)`);
                img.isMockup = true;
            } else {
                img.isMockup = false;
            }

            // Label the image with section context
            img.label = `${bestSection.partLabel}_screenshot_${img.index}`;
            bestSection.images.push(img);
        }
    }

    // ─── Code Detection Helpers ──────────────────────────────────────

    /**
     * Heuristic: does this line look like code?
     */
    private looksLikeCode(line: string): boolean {
        const codeIndicators = [
            /^\s{4,}/,                       // Indented 4+ spaces
            /[{};]$/,                        // Ends with { } ;
            /^(import|from|class|def|func|fn|var|let|const|void|public|private|protected|return|if|else|for|while|switch)\b/,
            /^\s*(setState|notifyListeners|await|async)\b/,
            /=>/,                            // Arrow functions
            /\.\w+\(/,                       // Method calls
        ];
        return codeIndicators.some(pattern => pattern.test(line));
    }

    /**
     * Detect programming language from code content.
     */
    private detectCodeLanguage(code: string): string {
        if (/setState|Widget|BuildContext|\.dart/.test(code)) return 'dart';
        if (/public\s+class|System\.out|@Override/.test(code)) return 'java';
        if (/namespace|using\s+System|DbContext|\.cs/.test(code)) return 'csharp';
        if (/def\s+\w+|import\s+\w+|print\(/.test(code)) return 'python';
        if (/func\s+\w+|fmt\.Print|package\s+main/.test(code)) return 'go';
        if (/fn\s+\w+|let\s+mut|println!/.test(code)) return 'rust';
        if (/function|const\s+\w+\s*=|=>\s*{/.test(code)) return 'javascript';
        if (/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE/i.test(code)) return 'sql';
        return 'unknown';
    }

    /**
     * Check if a buffer starts with the DOCX magic bytes (PK zip header).
     */
    private isDocx(buffer: Buffer): boolean {
        return buffer.length >= 4 && buffer.toString('hex', 0, 4) === '504b0304';
    }
}

