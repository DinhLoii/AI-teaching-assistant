// Helper for real-time notification sync across components and browser tabs.
// Ported from the old FE (FE/src/lib/notifications.ts) and extended.

const NOTIF_CHANNEL_NAME = 'aita_notification_events'
const CUSTOM_EVENT_NAME = 'aita_notification_update'

/**
 * Emit a notification event to:
 * 1. All other tabs via BroadcastChannel
 * 2. All listeners in the same tab via CustomEvent
 *
 * Call this after: marking as read, deleting, or receiving an SSE push.
 */
export function emitNotificationEvent() {
  try {
    const channel = new BroadcastChannel(NOTIF_CHANNEL_NAME)
    channel.postMessage({ type: 'UPDATE', timestamp: Date.now() })
    channel.close()
  } catch { /* BroadcastChannel not supported */ }

  try {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME, { detail: { timestamp: Date.now() } }))
  } catch { /* ignore */ }
}

/**
 * Subscribe to notification events from all sources.
 * Returns a cleanup function to unsubscribe.
 *
 * Mirrors the API from the old FE so notification pages can import this
 * and call `subscribeNotificationEvents(() => loadData(false))`.
 */
export function subscribeNotificationEvents(onUpdate: () => void): () => void {
  let channel: BroadcastChannel | null = null

  try {
    channel = new BroadcastChannel(NOTIF_CHANNEL_NAME)
    channel.onmessage = () => onUpdate()
  } catch { /* BroadcastChannel not supported */ }

  const handleCustomEvent = () => onUpdate()
  window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent)

  // Re-fetch when the tab becomes visible again (same as old FE: 15s threshold)
  let lastFetchTime = Date.now()
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && Date.now() - lastFetchTime > 15_000) {
      lastFetchTime = Date.now()
      onUpdate()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    channel?.close()
    window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}
