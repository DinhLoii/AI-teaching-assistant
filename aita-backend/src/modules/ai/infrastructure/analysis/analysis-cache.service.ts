import { createHash } from 'node:crypto'
import type { AdaptiveAnalysisOutput } from '../../domain/analysis/analysis.types.js'

interface CacheEntry {
  output: AdaptiveAnalysisOutput
  timestamp: number
  expiresAt: number
}

export class AnalysisCacheService {
  private static readonly PARSER_VERSION = 'v10-pdf-page-separators'
  private static readonly DEFAULT_TTL_MS = 30 * 60 * 1000 // 30 minutes
  private static readonly MAX_ENTRIES = 100

  private static cache = new Map<string, CacheEntry>()

  public static generateKey(
    documentHash: string,
    maxScore: number,
    preferredLanguage?: string,
    modelName?: string
  ): string {
    const raw = `${this.PARSER_VERSION}:${documentHash}:${maxScore}:${preferredLanguage || 'auto'}:${modelName || 'default'}`
    return createHash('sha256').update(raw).digest('hex')
  }

  public static get(key: string): AdaptiveAnalysisOutput | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return structuredClone(entry.output)
  }

  public static set(key: string, output: AdaptiveAnalysisOutput, ttlMs: number = this.DEFAULT_TTL_MS): void {
    // Evict oldest entry if size limit reached
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      output: structuredClone(output),
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    })
  }

  public static clear(): void {
    this.cache.clear()
  }
}
