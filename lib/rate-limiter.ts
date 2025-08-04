/**
 * Rate limiting utility for API endpoints
 * Implements in-memory rate limiting with configurable windows and limits
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Whether to skip counting successful requests
  keyGenerator?: (req: any) => string; // Custom key generator function
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired records every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 15 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  check(key: string, config: RateLimitConfig): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetTime <= now) {
      // First request or window expired
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + config.windowMs
      };
      this.store.set(key, newRecord);

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: newRecord.resetTime
      };
    }

    // Within existing window
    const remaining = Math.max(0, config.maxRequests - record.count);
    const allowed = record.count < config.maxRequests;

    if (allowed) {
      record.count++;
      this.store.set(key, record);
    }

    return {
      allowed,
      limit: config.maxRequests,
      remaining: allowed ? remaining - 1 : remaining,
      resetTime: record.resetTime
    };
  }

  reset(key: string) {
    this.store.delete(key);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter();

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  
  // Rating system endpoints (more restrictive)
  rating: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50
  },
  
  // Admin operations (very restrictive)
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20
  },
  
  // Recalculation operations (extremely restrictive)
  recalculation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  },
  
  // Public read operations (more permissive)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200
  }
} as const;

/**
 * Default key generator - uses IP address and user ID if available
 */
function defaultKeyGenerator(req: any): string {
  const ip = req.ip || 
           req.connection?.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           'unknown';
  
  const userId = req.user?.sub || req.user?.id || 'anonymous';
  return `${ip}:${userId}`;
}

/**
 * Rate limiting middleware for serverless functions
 */
export function createRateLimit(config: RateLimitConfig) {
  return {
    check: (req: any): {
      allowed: boolean;
      limit: number;
      remaining: number;
      resetTime: number;
      headers: Record<string, string>;
    } => {
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const key = keyGenerator(req);
      
      const result = rateLimiter.check(key, config);
      
      // Generate standard rate limit headers
      const headers = {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
      };

      return {
        ...result,
        headers
      };
    },
    
    reset: (req: any) => {
      const keyGenerator = config.keyGenerator || defaultKeyGenerator;
      const key = keyGenerator(req);
      rateLimiter.reset(key);
    }
  };
}

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
  default: createRateLimit(RATE_LIMIT_CONFIGS.default),
  rating: createRateLimit(RATE_LIMIT_CONFIGS.rating),
  admin: createRateLimit(RATE_LIMIT_CONFIGS.admin),
  recalculation: createRateLimit(RATE_LIMIT_CONFIGS.recalculation),
  public: createRateLimit(RATE_LIMIT_CONFIGS.public)
};

/**
 * Rate limiting middleware that can be used in serverless functions
 */
export function withRateLimit(
  configName: keyof typeof RATE_LIMIT_CONFIGS = 'default'
) {
  const limiter = rateLimiters[configName];
  
  return (handler: (req: any, res: any) => Promise<any>) => {
    return async (req: any, res: any) => {
      const result = limiter.check(req);
      
      // Add rate limit headers to response
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          messageRo: 'Prea multe cereri, vă rugăm să încercați din nou mai târziu',
          retryAfter: result.headers['Retry-After']
        });
      }
      
      return handler(req, res);
    };
  };
}

/**
 * User-specific rate limiting (stricter for certain roles)
 */
export function createUserSpecificRateLimit(req: any): RateLimitConfig {
  const userRole = req.user?.role || 'anonymous';
  
  switch (userRole) {
    case 'administrator':
      return {
        ...RATE_LIMIT_CONFIGS.admin,
        maxRequests: RATE_LIMIT_CONFIGS.admin.maxRequests * 2 // Admins get more requests
      };
    
    case 'mobilizer':
      return {
        ...RATE_LIMIT_CONFIGS.default,
        maxRequests: RATE_LIMIT_CONFIGS.default.maxRequests * 1.5 // Mobilizers get 50% more
      };
    
    case 'missionary':
      return RATE_LIMIT_CONFIGS.default;
    
    default:
      return {
        ...RATE_LIMIT_CONFIGS.public,
        maxRequests: Math.floor(RATE_LIMIT_CONFIGS.public.maxRequests * 0.5) // Anonymous users get less
      };
  }
}

/**
 * Endpoint-specific rate limiting
 */
export function getEndpointRateLimit(endpoint: string, method: string): RateLimitConfig {
  // Admin endpoints
  if (endpoint.includes('/recalculate') || method === 'DELETE') {
    return RATE_LIMIT_CONFIGS.recalculation;
  }
  
  // Rating endpoints
  if (endpoint.includes('/rating') || endpoint.includes('/star-rating')) {
    if (method === 'GET') {
      return RATE_LIMIT_CONFIGS.rating;
    } else {
      return RATE_LIMIT_CONFIGS.admin;
    }
  }
  
  // Public read endpoints
  if (method === 'GET') {
    return RATE_LIMIT_CONFIGS.public;
  }
  
  return RATE_LIMIT_CONFIGS.default;
}

/**
 * Clean shutdown for rate limiter
 */
export function destroyRateLimiter() {
  rateLimiter.destroy();
}

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGTERM', destroyRateLimiter);
  process.on('SIGINT', destroyRateLimiter);
}