import { AUTH_STORAGE_KEYS, getStoredItem, setStoredItem, removeStoredItem, announceSessionChange } from './storage'

export const BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message)
  }
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void, reject: (reason?: any) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getStoredItem(AUTH_STORAGE_KEYS.token)

  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh-token') {
    const refreshTokenStr = getStoredItem(AUTH_STORAGE_KEYS.refreshToken);
    if (refreshTokenStr) {
      if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken) => {
              // Retry with new token
              const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
              fetch(`${BASE}${path}`, { ...options, headers: retryHeaders })
                .then(r => r.json())
                .then(j => {
                  if (!j.success && j.statusCode >= 400) {
                    const retryErr = typeof j.error === 'string' ? j.error : j.error?.message;
                    reject(new ApiError(j.Message || j.message || retryErr || 'API error', j.statusCode, typeof j.error === 'object' ? j.error?.code : undefined))
                  }
                  else resolve(j.Data !== undefined ? j.Data : j.data)
                })
                .catch(reject)
            },
            reject
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenStr })
        });

        const refreshData = await refreshRes.json().catch(() => ({}));
        if (!refreshRes.ok || refreshData.success === false) {
          throw new Error('Session expired');
        }

        const data = refreshData.Data !== undefined ? refreshData.Data : refreshData.data;

        const remember = !!localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);

        setStoredItem(AUTH_STORAGE_KEYS.token, data.token, remember);
        setStoredItem(AUTH_STORAGE_KEYS.refreshToken, data.refreshToken, remember);
        if (data.user) {
          setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user), remember);
        }
        announceSessionChange();

        token = data.token;
        processQueue(null, data.token);

        // Retry original request
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        res = await fetch(`${BASE}${path}`, { ...options, headers });
      } catch (err) {
        processQueue(err as Error, null);
        removeStoredItem(AUTH_STORAGE_KEYS.token);
        removeStoredItem(AUTH_STORAGE_KEYS.refreshToken);
        removeStoredItem(AUTH_STORAGE_KEYS.user);
        announceSessionChange();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw err;
      } finally {
        isRefreshing = false;
      }
    }
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false || json.statusCode >= 400) {
    // Extract error message: handle both `{ error: "string" }` and `{ error: { message: "..." } }` formats
    const errorField = json.error;
    const errorMsg = typeof errorField === 'string' ? errorField : errorField?.message;
    const errorCode = typeof errorField === 'object' ? errorField?.code : undefined;
    let msg = json.Message || json.message || errorMsg || res.statusText || 'API error';
    if (res.status === 429 || json.statusCode === 429 || String(msg).includes('429') || String(msg).includes('no body')) {
      msg = 'Hệ thống AI đang vượt giới hạn lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.';
    }
    if (res.status === 403 || json.statusCode === 403) {
      msg = msg === 'Forbidden' ? 'Tài khoản không có quyền truy cập tài nguyên này (403 Forbidden).' : msg;
    }
    throw new ApiError(msg, json.statusCode || res.status, errorCode)
  }
  if (json.Data !== undefined) return json.Data as T;
  if (json.data !== undefined) return json.data as T;
  return json as T;
}
