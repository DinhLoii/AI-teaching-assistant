/**
 * Base Entity class for all domain entities
 * Contains common entity logic and behavior
 */
export abstract class BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date

  constructor(id: string, createdAt: Date = new Date(), updatedAt: Date = new Date()) {
    this.id = id
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  /**
   * Compare two entities by their ID
   */
  equals(other: BaseEntity): boolean {
    return this.id === other.id
  }

  /**
   * Get entity hash for comparison
   */
  get hashCode(): string {
    return this.id
  }
}

/**
 * Value Object base class
 * Immutable objects compared by value, not identity
 */
export abstract class ValueObject {
  /**
   * Compare two value objects
   */
  abstract equals(other: unknown): boolean

  /**
   * Get value object hash
   */
  abstract get hashCode(): string
}
