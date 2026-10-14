/**
 * Prompt Guard & Document Sanitizer
 * Protects against prompt injection, instruction smuggling, and security manipulation
 * in user-uploaded documents and prompts.
 */

export class PromptGuardService {
  private static readonly INJECTION_PATTERNS = [
    /\b(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions?|prompts?|rules?)\b/i,
    /\b(?:you\s+are\s+now|act\s+as)\s+(?:a\s+)?(?:dan|unrestricted|jailbroken|system\s+administrator|root)\b/i,
    /\b(?:reveal|output|print|show)\s+(?:the\s+)?(?:system\s+prompt|api[_\s-]?key|secret|environment\s+variables?|credentials?)\b/i,
    /\b(?:bỏ\s*qua|quên\s*đi|hủy\s*bỏ)\s+(?:toàn\s*bộ\s+)?(?:chỉ\s*thị|hướng\s*dẫn|quy\s*tắc|prompt)\s+(?:trước|cũ|hệ\s*thống)\b/i,
    /\b(?:hãy\s*cho\s*điểm\s*tối\s*đa|cho\s*10\s*điểm|không\s*cần\s*chấm|pass\s*tất\s*cả)\b/i,
    /\b(?:tiết\s*lộ|hiển\s*thị|in\s*ra)\s+(?:system\s*prompt|khóa\s*api|api\s*key|mật\s*khẩu|secret)\b/i,
  ]

  /**
   * Scans text for suspicious prompt injection patterns.
   * Returns sanitized text and detected threats (if any).
   */
  public static sanitizeAndDetect(text: string): {
    sanitizedText: string
    hasInjectionAttempt: boolean
    detectedPatterns: string[]
  } {
    if (!text) {
      return { sanitizedText: '', hasInjectionAttempt: false, detectedPatterns: [] }
    }

    const detected: string[] = []
    let sanitized = text

    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        detected.push(pattern.source)
        // Neutralize by prefixing with [UNTRUSTED TEXT STRIPPED]
        sanitized = sanitized.replace(pattern, '[NỘI DUNG VĂN BẢN ĐÃ BỊ VÔ HIỆU HÓA DO VI PHẠM QUY TẮC AN TOÀN]')
      }
    }

    return {
      sanitizedText: sanitized,
      hasInjectionAttempt: detected.length > 0,
      detectedPatterns: detected,
    }
  }

  /**
   * Encloses document content inside strict passive XML boundaries for LLM consumption.
   */
  public static wrapAsPassiveDocument(text: string): string {
    const safeText = text.replace(/<\/assignment_document>/gi, '')
    return `<assignment_document>
${safeText}
</assignment_document>`
  }
}
