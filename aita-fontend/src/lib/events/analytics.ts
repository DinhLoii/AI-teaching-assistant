export const ANALYTICS_EVENT = 'aita-analytics-invalidated'
export function emitAnalyticsEvent() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof Event !== 'undefined') window.dispatchEvent(new Event(ANALYTICS_EVENT))
}
