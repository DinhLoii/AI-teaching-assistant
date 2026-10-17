import { AUTH_STORAGE_KEYS, getStoredItem, setStoredItem, removeStoredItem, announceSessionChange } from './storage'
import { emitAnalyticsEvent } from '../events/analytics'

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

interface CacheEntry<T> {
  data: T;
  staleAt: number;
  expiresAt: number;
}

const inFlightGetRequests = new Map<string, Promise<any>>();
const clientGetCache = new Map<string, CacheEntry<any>>();
let cacheGeneration = 0;
let cacheSession: string | null = null;

function synchronizeCacheSession() {
  const session = getStoredItem(AUTH_STORAGE_KEYS.token);
  if (session !== cacheSession) {
    clearClientApiCache();
    cacheSession = session;
  }
}

export function clearClientApiCache(pattern?: string) {
  cacheGeneration++;
  if (!pattern) {
    clientGetCache.clear();
    inFlightGetRequests.clear();
    return;
  }
  for (const key of clientGetCache.keys()) {
    if (key.includes(pattern)) {
      clientGetCache.delete(key);
    }
  }
  for (const key of inFlightGetRequests.keys()) {
    if (key.includes(pattern)) inFlightGetRequests.delete(key);
  }
}

export function peekClientApiCache<T>(path: string): T | undefined {
  synchronizeCacheSession();
  const cached = clientGetCache.get(path);
  if (!cached) return undefined;
  if (Date.now() > cached.expiresAt) {
    clientGetCache.delete(path);
    return undefined;
  }
  return cached.data as T;
}

export function setClientApiCache<T>(path: string, data: T): void {
  synchronizeCacheSession();
  const { staleMs, expireMs } = getCacheTtl(path);
  clientGetCache.set(path, {
    data,
    staleAt: Date.now() + staleMs,
    expiresAt: Date.now() + expireMs,
  });
}

function getCacheTtl(path: string): { staleMs: number; expireMs: number } {
  // Static / master data rarely changes: cache for 3 mins, keep alive 15 mins
  if (path.includes('/subjects') || path.includes('/semesters') || path.includes('/configs')) {
    return { staleMs: 3 * 60 * 1000, expireMs: 15 * 60 * 1000 };
  }
  // User profile / roles: 2 mins
  if (path.includes('/users/me') || path.includes('/profile')) {
    return { staleMs: 2 * 60 * 1000, expireMs: 10 * 60 * 1000 };
  }
  // Dashboards, overviews, stats: 30s fresh, 5 mins max age
  if (path.includes('/dashboard') || path.includes('/overview') || path.includes('/stats')) {
    return { staleMs: 30 * 1000, expireMs: 5 * 60 * 1000 };
  }
  // Notifications: 15s fresh
  if (path.includes('/notifications')) {
    return { staleMs: 15 * 1000, expireMs: 2 * 60 * 1000 };
  }
  // Classes, assignments, submissions: 25s fresh, 4 mins max age
  return { staleMs: 25 * 1000, expireMs: 4 * 60 * 1000 };
}

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

export async function request<T>(path: string, options: RequestInit = {}, responseType?: 'blob'): Promise<T> {
  synchronizeCacheSession();
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const cacheControl = new Headers(options.headers).get('Cache-Control') || '';
  const noCache = options.cache === 'no-store' || options.cache === 'reload' || options.cache === 'no-cache' || /no-cache|no-store/i.test(cacheControl) || !!options.signal;

  const exec = async (): Promise<T> => {
    let token = getStoredItem(AUTH_STORAGE_KEYS.token);

    const headers: HeadersInit = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
      });
    } catch (networkErr: any) {
      if (options.signal?.aborted) throw networkErr;
      if (isGet) {
        // Fast retry once for transient socket reset or dev server recompiles
        try {
          await new Promise((r) => setTimeout(r, 350));
          res = await fetch(`${BASE}${path}`, {
            ...options,
            headers,
          });
        } catch {
          throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau vài giây.', 0, 'NETWORK_ERROR');
        }
      } else {
        throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.', 0, 'NETWORK_ERROR');
      }
    }

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
                  .then(r => r.ok && responseType === 'blob' ? r.blob().then(blob => ({ data: blob })) : r.json().catch(() => ({})))
                  .then(j => {
                    if (j.success === false || j.statusCode >= 400) {
                      const retryErr = typeof j.error === 'string' ? j.error : j.error?.message;
                      reject(new ApiError(j.Message || j.message || retryErr || 'API error', j.statusCode, typeof j.error === 'object' ? j.error?.code : undefined))
                    }
                    else resolve(j.Data !== undefined ? j.Data : j.data !== undefined ? j.data : j)
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
            throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401, 'SESSION_EXPIRED');
          }

          const data = refreshData.Data !== undefined ? refreshData.Data : refreshData.data;

          const remember = !!localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) || !!localStorage.getItem(AUTH_STORAGE_KEYS.token);

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
          clearClientApiCache();
          removeStoredItem(AUTH_STORAGE_KEYS.token);
          removeStoredItem(AUTH_STORAGE_KEYS.refreshToken);
          removeStoredItem(AUTH_STORAGE_KEYS.user);
          announceSessionChange();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          }
          throw err;
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token available, session is definitely expired
        clearClientApiCache();
        removeStoredItem(AUTH_STORAGE_KEYS.token);
        removeStoredItem(AUTH_STORAGE_KEYS.refreshToken);
        removeStoredItem(AUTH_STORAGE_KEYS.user);
        announceSessionChange();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
      }
    }

    if (res.ok && responseType === 'blob') return await res.blob() as T
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.success === false || json.statusCode >= 400) {
      // Extract error message: handle both `{ error: "string" }` and `{ error: { message: "..." } }` formats
      const errorField = json.error;
      const errorMsg = typeof errorField === 'string' ? errorField : errorField?.message;
      const errorCode = typeof errorField === 'object' ? errorField?.code : json.Data?.code || json.code || undefined;
      let msg = json.Message || json.message || errorMsg || res.statusText || 'API error';
      if (json.Data?.fieldErrors && typeof json.Data.fieldErrors === 'object') {
        const errorList: string[] = []
        for (const [field, fieldErrList] of Object.entries(json.Data.fieldErrors)) {
          const fieldLabel = field === 'password' ? 'Mật khẩu' : field === 'email' ? 'Email' : field === 'fullName' ? 'Họ và tên' : field
          const detail = Array.isArray(fieldErrList) ? (fieldErrList as any).join(', ') : String(fieldErrList)
          errorList.push(`${fieldLabel}: ${detail.replace(/String must contain at least (\d+) character\(s\)/i, 'Tối thiểu $1 ký tự')}`)
        }
        if (errorList.length > 0) {
          msg = `${msg}: ${errorList.join('; ')}`
        }
      }
      if (res.status === 500 && (msg === 'Internal Server Error' || !msg || msg === 'API error')) {
        msg = 'Lỗi kết nối máy chủ (500). Vui lòng thử lại sau vài giây.'
      }
      const isRateLimit =
        res.status === 429 ||
        json.statusCode === 429 ||
        ((/\b429\b/.test(String(msg)) || String(msg).includes('RESOURCE_EXHAUSTED')) &&
         /(ai|gemini|rate limit|quota)/i.test(String(msg)));
      if (isRateLimit) {
        msg = 'Hệ thống AI đang vượt giới hạn lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.';
      }
      const isAiKeyExpired =
        errorCode === 'AI_API_KEY_EXPIRED' ||
        (res.status === 401 && /invalid_api_key|expired_api_key|api_key_invalid|api key|hết hạn|không hợp lệ/i.test(String(msg))) ||
        /AI_API_KEY_EXPIRED/i.test(String(msg));
      if (isAiKeyExpired) {
        msg = 'Khóa API của hệ thống AI (Groq / Gemini) đã hết hạn hoặc không hợp lệ. Vui lòng kiểm tra lại cấu hình API Key trong file .env (GROQ_API_KEY).';
      }
      if ((res.status === 401 || json.statusCode === 401) && path !== '/auth/login' && path !== '/auth/refresh-token') {
        clearClientApiCache();
        removeStoredItem(AUTH_STORAGE_KEYS.token);
        removeStoredItem(AUTH_STORAGE_KEYS.refreshToken);
        removeStoredItem(AUTH_STORAGE_KEYS.user);
        announceSessionChange();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
      }
      throw new ApiError(msg, json.statusCode || res.status, errorCode)
    }
    if (json.Data !== undefined) return json.Data as T;
    if (json.data !== undefined) return json.data as T;
    return json as T;
  };

  // Notification read actions should not evict classes, subjects and assignment data.
  // Unknown mutations retain conservative invalidation across all domains.
  const invalidateMutation = () => {
    if (/^\/notifications(?:\/|$)/.test(path)) {
      clearClientApiCache('/notifications');
      clearClientApiCache('/student-portal/dashboard');
    } else {
      clearClientApiCache();
    }
  };
  if (!isGet) {
    invalidateMutation();
    try {
      const result = await exec();
      if (/^\/(users|classes|subjects|semesters|assignments|submissions|grading|exams|appeals)(\/|$)/.test(path)) emitAnalyticsEvent();
      return result;
    } finally {
      // Reads started while the write was pending must not survive its completion.
      invalidateMutation();
    }
  }

  if (noCache) return exec();

  const generation = cacheGeneration;
  const session = getStoredItem(AUTH_STORAGE_KEYS.token);
  const fetchAndCache = (): Promise<T> => {
    const promise = exec().then((result) => {
      if (generation === cacheGeneration && session === getStoredItem(AUTH_STORAGE_KEYS.token)) {
        setClientApiCache(path, result);
      }
      return result;
    }).finally(() => {
      if (inFlightGetRequests.get(path) === promise) inFlightGetRequests.delete(path);
    });
    inFlightGetRequests.set(path, promise);
    return promise;
  };

  if (!noCache) {
    const cached = clientGetCache.get(path);
    if (cached) {
      const now = Date.now();
      // If fresh, return immediately (0 ms!)
      if (now < cached.staleAt) {
        return cached.data as T;
      }
      // If stale but not expired, trigger background revalidation and return immediately (SWR!)
      if (now < cached.expiresAt) {
        if (!inFlightGetRequests.has(path)) {
          void fetchAndCache().catch(() => {});
        }
        return cached.data as T;
      }
      // Expired: remove
      clientGetCache.delete(path);
    }

    // Deduplicate identical in-flight GET requests
    const inflight = inFlightGetRequests.get(path);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  return fetchAndCache();
}
