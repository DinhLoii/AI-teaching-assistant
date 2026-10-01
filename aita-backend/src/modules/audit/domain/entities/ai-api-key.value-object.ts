// ──────────────────────────────────────────────────────────────
// Value Object: AiApiKey
// ──────────────────────────────────────────────────────────────

/**
 * Represents an AI API key with usage tracking.
 * Value object because it's managed as a configuration entry.
 */
export class AiApiKey {
  readonly id: string
  readonly provider: string | null
  readonly keyValue: string | null
  readonly label: string | null
  readonly isActive: boolean | null
  readonly isExhausted: boolean | null
  readonly lastUsedAt: Date | null
  readonly totalUsageCount: number | null

  private constructor(
    id: string,
    provider: string | null,
    keyValue: string | null,
    label: string | null,
    isActive: boolean | null,
    isExhausted: boolean | null,
    lastUsedAt: Date | null,
    totalUsageCount: number | null
  ) {
    this.id = id
    this.provider = provider
    this.keyValue = keyValue
    this.label = label
    this.isActive = isActive
    this.isExhausted = isExhausted
    this.lastUsedAt = lastUsedAt
    this.totalUsageCount = totalUsageCount
  }

  static create(
    id: string,
    provider: string,
    keyValue: string,
    label?: string
  ): AiApiKey {
    return new AiApiKey(id, provider, keyValue, label ?? null, true, false, null, 0)
  }

  static restore(
    id: string,
    provider: string | null,
    keyValue: string | null,
    label: string | null,
    isActive: boolean | null,
    isExhausted: boolean | null,
    lastUsedAt: Date | null,
    totalUsageCount: number | null
  ): AiApiKey {
    return new AiApiKey(id, provider, keyValue, label, isActive, isExhausted, lastUsedAt, totalUsageCount)
  }

  isAvailable(): boolean {
    return this.isActive === true && this.isExhausted !== true
  }

  equals(other: AiApiKey): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      provider: this.provider,
      label: this.label,
      isActive: this.isActive,
      isExhausted: this.isExhausted,
      lastUsedAt: this.lastUsedAt,
      totalUsageCount: this.totalUsageCount,
    }
  }
}
