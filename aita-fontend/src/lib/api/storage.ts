export const AUTH_STORAGE_KEYS = {
  token: 'aita_token',
  refreshToken: 'aita_refresh_token',
  user: 'aita_user',
} as const

export const SESSION_CHANGED_EVENT = 'aita:session-changed'
export function announceSessionChange() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
  }
}

export function getStoredItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

export function setStoredItem(key: string, value: string, remember: boolean) {
  if (typeof window === 'undefined') return;
  if (remember) {
    sessionStorage.removeItem(key);
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
    sessionStorage.setItem(key, value);
  }
}

export function removeStoredItem(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}
