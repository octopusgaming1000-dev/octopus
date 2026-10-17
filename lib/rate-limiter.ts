import { NextRequest } from 'next/server'
import { CacheService } from './redis'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
}

class RateLimiter {
  public config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async isAllowed(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      // Get current request data
      const current = await CacheService.get<{ count: number; resetTime: number }>(key)
      
      if (!current || current.resetTime < now) {
        // New window or expired window
        const newResetTime = now + this.config.windowMs
        await CacheService.set(key, { count: 1, resetTime: newResetTime }, Math.ceil(this.config.windowMs / 1000))
        
        return {
          allowed: true,
          remaining: this.config.maxRequests - 1,
          resetTime: newResetTime
        }
      }

      // Check if under limit
      if (current.count >= this.config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: current.resetTime
        }
      }

      // Increment counter
      const newCount = current.count + 1
      await CacheService.set(key, { count: newCount, resetTime: current.resetTime }, Math.ceil(this.config.windowMs / 1000))

      return {
        allowed: true,
        remaining: this.config.maxRequests - newCount,
        resetTime: current.resetTime
      }
    } catch (error) {
      console.error('Rate limiter error:', error)
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      }
    }
  }
}

// Predefined rate limiters
export const rateLimiters = {
  // API endpoints
  api: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 100, message: 'Too many API requests' }),
  
  // Authentication endpoints
  auth: new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 5, message: 'Too many authentication attempts' }),
  
  // Chat endpoints
  chat: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 30, message: 'Too many chat messages' }),
  
  // Prediction endpoints
  predictions: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 20, message: 'Too many predictions' }),
  
  // File uploads
  upload: new RateLimiter({ windowMs: 60 * 1000, maxRequests: 10, message: 'Too many file uploads' }),
}

// Middleware function
export async function applyRateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  identifier?: string
): Promise<{ allowed: boolean; response?: Response }> {
  // Use IP address as default identifier
  const clientId = identifier || request.ip || 'unknown'
  
  const result = await limiter.isAllowed(clientId)
  
  if (!result.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({ 
          error: limiter.config.message || 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limiter.config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }
  }

  return { allowed: true }
}

// Helper to get client identifier
export function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth token first
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    try {
      // This would need to be implemented based on your auth system
      // const token = authHeader.replace('Bearer ', '')
      // const decoded = jwt.verify(token, process.env.JWT_SECRET!)
      // return `user:${decoded.userId}`
    } catch (error) {
      // Fall back to IP
    }
  }
  
  // Use IP address as fallback
  return `ip:${request.ip || 'unknown'}`
}
