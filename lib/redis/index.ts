import { createClient, RedisClientType } from 'redis'
import { logger } from '@/lib/utils'

let client: RedisClientType | null = null

// Redis configuration
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
}

// Initialize Redis client
export function getRedisClient(): RedisClientType {
  if (!client) {
    client = createClient(redisConfig)
    
    client.on('error', (err) => {
      logger.error('Redis client error', err)
    })
    
    client.on('connect', () => {
      logger.debug('Redis client connected')
    })
    
    client.on('ready', () => {
      logger.debug('Redis client ready')
    })
  }
  
  return client
}

// Connect to Redis
export async function connectRedis(): Promise<void> {
  try {
    const redisClient = getRedisClient()
    
    if (!redisClient.isOpen) {
      await redisClient.connect()
      logger.info('Redis connection established')
    }
  } catch (error) {
    logger.error('Failed to connect to Redis', error as Error)
    throw error
  }
}

// Disconnect from Redis
export async function disconnectRedis(): Promise<void> {
  try {
    if (client && client.isOpen) {
      await client.disconnect()
      logger.info('Redis disconnected')
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis', error as Error)
  }
}

// Portal-specific cache utilities
export class PortalCache {
  private client: RedisClientType
  private defaultTTL: number = 3600 // 1 hour default

  constructor() {
    this.client = getRedisClient()
  }

  // Generate portal-specific cache key
  private getKey(portal: string, resource: string, identifier?: string): string {
    const parts = [portal, resource]
    if (identifier) parts.push(identifier)
    return parts.join(':')
  }

  // Set cache value with portal namespace
  async set(portal: string, resource: string, value: any, ttl?: number, identifier?: string): Promise<void> {
    try {
      await this.ensureConnected()
      const key = this.getKey(portal, resource, identifier)
      const serializedValue = JSON.stringify(value)
      
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue)
      } else {
        await this.client.setEx(key, this.defaultTTL, serializedValue)
      }
      
      logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL })
    } catch (error) {
      logger.error('Cache set error', error as Error, { portal, resource, identifier })
    }
  }

  // Get cache value with portal namespace
  async get<T = any>(portal: string, resource: string, identifier?: string): Promise<T | null> {
    try {
      await this.ensureConnected()
      const key = this.getKey(portal, resource, identifier)
      const value = await this.client.get(key)
      
      if (!value) {
        logger.debug('Cache miss', { key })
        return null
      }
      
      logger.debug('Cache hit', { key })
      return JSON.parse(value) as T
    } catch (error) {
      logger.error('Cache get error', error as Error, { portal, resource, identifier })
      return null
    }
  }

  // Delete cache value with portal namespace
  async del(portal: string, resource: string, identifier?: string): Promise<void> {
    try {
      await this.ensureConnected()
      const key = this.getKey(portal, resource, identifier)
      await this.client.del(key)
      
      logger.debug('Cache deleted', { key })
    } catch (error) {
      logger.error('Cache delete error', error as Error, { portal, resource, identifier })
    }
  }

  // Clear all cache for a specific portal
  async clearPortal(portal: string): Promise<void> {
    try {
      await this.ensureConnected()
      const pattern = `${portal}:*`
      const keys = await this.client.keys(pattern)
      
      if (keys.length > 0) {
        await this.client.del(keys)
        logger.info('Portal cache cleared', { portal, keysDeleted: keys.length })
      }
    } catch (error) {
      logger.error('Portal cache clear error', error as Error, { portal })
    }
  }

  // Set with hash (for complex objects)
  async hSet(portal: string, resource: string, field: string, value: any, identifier?: string): Promise<void> {
    try {
      await this.ensureConnected()
      const key = this.getKey(portal, resource, identifier)
      const serializedValue = JSON.stringify(value)
      
      await this.client.hSet(key, field, serializedValue)
      logger.debug('Hash cache set', { key, field })
    } catch (error) {
      logger.error('Hash cache set error', error as Error, { portal, resource, field, identifier })
    }
  }

  // Get from hash
  async hGet<T = any>(portal: string, resource: string, field: string, identifier?: string): Promise<T | null> {
    try {
      await this.ensureConnected()
      const key = this.getKey(portal, resource, identifier)
      const value = await this.client.hGet(key, field)
      
      if (!value) return null
      
      return JSON.parse(value) as T
    } catch (error) {
      logger.error('Hash cache get error', error as Error, { portal, resource, field, identifier })
      return null
    }
  }

  // Increment counter (useful for rate limiting)
  async incr(portal: string, resource: string, identifier?: string, ttl?: number): Promise<number> {
    try {
      await this.ensureConnected()
      const key = this.getKey(portal, resource, identifier)
      const value = await this.client.incr(key)
      
      // Set expiration on first increment
      if (value === 1 && ttl) {
        await this.client.expire(key, ttl)
      }
      
      return value
    } catch (error) {
      logger.error('Cache increment error', error as Error, { portal, resource, identifier })
      return 0
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) {
      await connectRedis()
    }
  }
}

// Rate limiting utilities
export class RateLimiter {
  private cache: PortalCache

  constructor() {
    this.cache = new PortalCache()
  }

  async isAllowed(
    portal: string,
    identifier: string,
    maxAttempts: number = 10,
    windowSeconds: number = 900 // 15 minutes
  ): Promise<{ allowed: boolean; remaining: number; resetAt?: number }> {
    try {
      const attempts = await this.cache.incr(portal, 'rate_limit', identifier, windowSeconds)
      const remaining = Math.max(0, maxAttempts - attempts)
      const allowed = attempts <= maxAttempts
      
      return {
        allowed,
        remaining,
        resetAt: allowed ? undefined : Date.now() + (windowSeconds * 1000)
      }
    } catch (error) {
      logger.error('Rate limiting error', error as Error, { portal, identifier })
      // Fail open - allow the request if Redis is down
      return { allowed: true, remaining: maxAttempts }
    }
  }
}

// Global instances
export const portalCache = new PortalCache()
export const rateLimiter = new RateLimiter()

// Export Redis client for direct use if needed
export { client as redisClient }