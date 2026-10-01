// ──────────────────────────────────────────────────────────────
// Value Object: SystemConfig
// ──────────────────────────────────────────────────────────────

/**
 * Represents a system configuration key-value pair.
 * Used for application-wide settings.
 */
export class SystemConfig {
  readonly key: string
  readonly value: string | null
  readonly description: string | null

  private constructor(
    key: string,
    value: string | null,
    description: string | null
  ) {
    this.key = key
    this.value = value
    this.description = description
  }

  static create(
    key: string,
    value: string,
    description?: string
  ): SystemConfig {
    return new SystemConfig(key, value, description ?? null)
  }

  static restore(
    key: string,
    value: string | null,
    description: string | null
  ): SystemConfig {
    return new SystemConfig(key, value, description)
  }

  // ── Helpers ──

  getStringValue(): string | null {
    return this.value
  }

  getNumberValue(): number | null {
    if (this.value === null) return null
    const num = Number(this.value)
    return isNaN(num) ? null : num
  }

  getBooleanValue(): boolean | null {
    if (this.value === null) return null
    return this.value.toLowerCase() === 'true'
  }

  equals(other: SystemConfig): boolean {
    return this.key === other.key
  }

  toJSON() {
    return {
      key: this.key,
      value: this.value,
      description: this.description,
    }
  }
}
