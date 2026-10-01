// ──────────────────────────────────────────────────────────────
// Value Object: NotificationRecipient
// ──────────────────────────────────────────────────────────────

/**
 * Represents a recipient of a notification with read tracking.
 */
export class NotificationRecipient {
  readonly id: string
  readonly notificationId: string | null
  readonly userId: string | null
  readonly isRead: boolean | null
  readonly readAt: Date | null

  private constructor(
    id: string,
    notificationId: string | null,
    userId: string | null,
    isRead: boolean | null,
    readAt: Date | null
  ) {
    this.id = id
    this.notificationId = notificationId
    this.userId = userId
    this.isRead = isRead
    this.readAt = readAt
  }

  static create(
    id: string,
    notificationId: string,
    userId: string
  ): NotificationRecipient {
    return new NotificationRecipient(id, notificationId, userId, false, null)
  }

  static restore(
    id: string,
    notificationId: string | null,
    userId: string | null,
    isRead: boolean | null,
    readAt: Date | null
  ): NotificationRecipient {
    return new NotificationRecipient(id, notificationId, userId, isRead, readAt)
  }

  markAsRead(): { isRead: boolean; readAt: Date } {
    // Returns values since this is a value object (immutable pattern)
    return { isRead: true, readAt: new Date() }
  }

  equals(other: NotificationRecipient): boolean {
    return this.id === other.id
  }

  toJSON() {
    return {
      id: this.id,
      notificationId: this.notificationId,
      userId: this.userId,
      isRead: this.isRead,
      readAt: this.readAt,
    }
  }
}
