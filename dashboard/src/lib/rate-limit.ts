/**
 * Rate Limiter — Production-Ready Abstraction
 *
 * Supports both in-memory (single-instance) and Redis (multi-instance) backends.
 * The backend is selected via the RATE_LIMIT_STORE environment variable.
 *
 * - "memory" (default): In-memory Map — suitable for single-instance deployments
 * - "redis": Redis-backed — required for serverless / multi-instance deployments
 *
 * To use Redis, set:
 *   RATE_LIMIT_STORE=redis
 *   REDIS_URL=redis://localhost:6379
 *
 * The Redis backend is lazy-loaded so the `ioredis` dependency is only
 * required when RATE_LIMIT_STORE=redis.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, entry: RateLimitEntry): Promise<void>
  delete(key: string): Promise<void>
}

// ---------------------------------------------------------------------------
// In-Memory Store (default)
// ---------------------------------------------------------------------------

class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) ?? null
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  /** Clean up expired entries — called periodically */
  cleanup(): void {
    const now = Date.now()
    for (const [k, v] of this.store) {
      if (v.resetTime < now) {
        this.store.delete(k)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Redis Store (for multi-instance / serverless)
// ---------------------------------------------------------------------------

class RedisRateLimitStore implements RateLimitStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any = null

  private async getClient() {
    if (!this.redis) {
      try {
        // ioredis is an optional peer dependency — only required when RATE_LIMIT_STORE=redis
        // @ts-expect-error — optional dependency, may not be installed
        const Redis = (await import('ioredis')).default
        this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 2000,
        })
        await this.redis.connect()
      } catch (error) {
        console.error('Failed to connect to Redis for rate limiting. Falling back to in-memory store.', error)
        throw error
      }
    }
    return this.redis
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const client = await this.getClient()
    const data = await client.get(`ratelimit:${key}`)
    if (!data) return null
    try {
      return JSON.parse(data) as RateLimitEntry
    } catch {
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const client = await this.getClient()
    const ttl = Math.max(1, Math.ceil((entry.resetTime - Date.now()) / 1000))
    await client.set(`ratelimit:${key}`, JSON.stringify(entry), 'EX', ttl)
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient()
    await client.del(`ratelimit:${key}`)
  }
}

// ---------------------------------------------------------------------------
// Store singleton
// ---------------------------------------------------------------------------

let storeInstance: RateLimitStore | null = null
let cleanupInterval: ReturnType<typeof setInterval> | null = null

function getStore(): RateLimitStore {
  if (!storeInstance) {
    const storeType = process.env.RATE_LIMIT_STORE || 'memory'

    if (storeType === 'redis') {
      try {
        storeInstance = new RedisRateLimitStore()
      } catch (error) {
        console.warn('Redis rate limit store requested but unavailable. Falling back to in-memory.', error)
        storeInstance = new MemoryRateLimitStore()
      }
    } else {
      storeInstance = new MemoryRateLimitStore()
    }

    // Periodic cleanup for in-memory store
    if (storeInstance instanceof MemoryRateLimitStore && !cleanupInterval) {
      cleanupInterval = setInterval(() => {
        ;(storeInstance as MemoryRateLimitStore).cleanup()
      }, 60_000) // Clean up every minute
      // Don't prevent Node.js process from exiting
      if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
        cleanupInterval.unref()
      }
    }
  }
  return storeInstance
}

// ---------------------------------------------------------------------------
// Rate limit check function
// ---------------------------------------------------------------------------

/**
 * Check if a request should be rate limited.
 *
 * @param key - Unique identifier (e.g., IP address or user ID)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed, remaining, resetTime }
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60 * 1000 // 1 minute default
): Promise<RateLimitResult> {
  const store = getStore()
  const now = Date.now()
  const entry = await store.get(key)

  if (!entry || entry.resetTime < now) {
    // First request or window expired
    const resetTime = now + windowMs
    await store.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }

  // Window is active
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  await store.set(key, entry)
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime }
}

// ---------------------------------------------------------------------------
// Sync wrapper for backward compatibility
// ---------------------------------------------------------------------------

// In-memory fallback for routes that don't use await yet
const syncStore = new Map<string, RateLimitEntry>()

/**
 * Synchronous rate limit check — uses in-memory store only.
 * Provided for backward compatibility. Prefer the async `checkRateLimit` for production.
 */
export function checkRateLimitSync(
  key: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now()
  const entry = syncStore.get(key)

  // Clean up expired entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    for (const [k, v] of syncStore) {
      if (v.resetTime < now) {
        syncStore.delete(k)
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    const resetTime = now + windowMs
    syncStore.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Get client IP from request headers.
 * Works with various proxy configurations.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return 'unknown'
}

/**
 * Rate limit configuration presets.
 */
export const RATE_LIMITS = {
  // Password change: 5 attempts per minute per user
  PASSWORD_CHANGE: { limit: 5, windowMs: 60 * 1000 },

  // Login: 10 attempts per minute per IP
  LOGIN: { limit: 10, windowMs: 60 * 1000 },

  // General API: 60 requests per minute per user
  API_GENERAL: { limit: 60, windowMs: 60 * 1000 },

  // Public booking: 10 requests per minute per IP
  PUBLIC_BOOKING: { limit: 10, windowMs: 60 * 1000 },
} as const
