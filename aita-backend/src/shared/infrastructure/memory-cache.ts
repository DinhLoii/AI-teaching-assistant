/**
 * High-performance In-Memory TTL Cache for AITA Backend
 * Dramatically reduces round-trip database queries to Neon Serverless Postgres.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>()
  private readonly maxEntries: number
  private hits = 0
  private misses = 0

  constructor(maxEntries = 2000) {
    this.maxEntries = maxEntries

    // Periodic sweep every 3 minutes to evict stale entries and prevent memory growth
    const SWEEP_INTERVAL_MS = 3 * 60 * 1000
    setInterval(() => {
      this.sweep()
    }, SWEEP_INTERVAL_MS).unref?.()
  }

  /**
   * Get cached value if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) {
      this.misses++
      return null
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      this.misses++
      return null
    }
    this.hits++
    return entry.value as T
  }

  /**
   * Set cached value with TTL in seconds (default 15s)
   */
  set<T>(key: string, value: T, ttlSeconds = 15): void {
    // If cache is at capacity, evict the oldest key (first item in Map iteration)
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey) {
        this.store.delete(oldestKey)
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  /**
   * Delete specific cache key
   */
  del(key: string): void {
    this.store.delete(key)
  }

  /**
   * Invalidate all keys matching prefix
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Remove expired keys to free memory
   */
  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Cache telemetry for observability
   */
  getStats() {
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRatio: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)).toFixed(2) : '0.00',
    }
  }

  /**
   * Wrap an async computation with cache
   */
  async wrap<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null && cached !== undefined) {
      return cached
    }
    const fresh = await fn()
    this.set(key, fresh, ttlSeconds)
    return fresh
  }
}

export const memoryCache = new MemoryCache()
