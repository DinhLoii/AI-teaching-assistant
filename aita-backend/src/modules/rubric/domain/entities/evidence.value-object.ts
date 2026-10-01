// ──────────────────────────────────────────────────────────────
// Value Object: Evidence
// ──────────────────────────────────────────────────────────────

/**
 * Represents evidence collected during grading for a rule score.
 * Can be text, image, or other forms of proof.
 */
export class Evidence {
  readonly id: string
  readonly ruleScoreId: string | null
  readonly evidenceType: string | null
  readonly content: string | null
  readonly imageUrl: string | null
  readonly caption: string | null

  private constructor(
    id: string,
    ruleScoreId: string | null,
    evidenceType: string | null,
    content: string | null,
    imageUrl: string | null,
    caption: string | null
  ) {
    this.id = id
    this.ruleScoreId = ruleScoreId
    this.evidenceType = evidenceType
    this.content = content
    this.imageUrl = imageUrl
    this.caption = caption
  }

  static create(
    id: string,
    ruleScoreId: string,
    evidenceType: string,
    content: string,
    params?: {
      imageUrl?: string
      caption?: string
    }
  ): Evidence {
    return new Evidence(id, ruleScoreId, evidenceType, content, params?.imageUrl ?? null, params?.caption ?? null)
  }

  static restore(
    id: string,
    ruleScoreId: string | null,
    evidenceType: string | null,
    content: string | null,
    imageUrl: string | null,
    caption: string | null
  ): Evidence {
    return new Evidence(id, ruleScoreId, evidenceType, content, imageUrl, caption)
  }

  equals(other: Evidence): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      ruleScoreId: this.ruleScoreId,
      evidenceType: this.evidenceType,
      content: this.content,
      imageUrl: this.imageUrl,
      caption: this.caption,
    }
  }
}
