/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors and pass them to error middleware
 */

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express middleware function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Async handler with timeout support
 * @param {Function} fn - Async route handler function
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Function} - Express middleware function
 */
export function asyncHandlerWithTimeout(fn, timeout = 30000) {
  return (req, res, next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });

    Promise.race([
      Promise.resolve(fn(req, res, next)),
      timeoutPromise
    ]).catch(next);
  };
}

/**
 * Async handler with retry logic
 * @param {Function} fn - Async route handler function
 * @param {Object} options - Retry options
 * @returns {Function} - Express middleware function
 */
export function asyncHandlerWithRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = (error) => error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT'
  } = options;

  return async (req, res, next) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await Promise.resolve(fn(req, res, next));
        return; // Success, exit
      } catch (error) {
        lastError = error;
        
        // Don't retry if it's the last attempt or error shouldn't be retried
        if (attempt === maxRetries || !shouldRetry(error)) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
    
    next(lastError);
  };
}

/**
 * Async handler with caching
 * @param {Function} fn - Async route handler function
 * @param {Object} cacheOptions - Cache configuration
 * @returns {Function} - Express middleware function
 */
export function asyncHandlerWithCache(fn, cacheOptions = {}) {
  const {
    ttl = 300000, // 5 minutes default
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    skipCache = (req) => req.method !== 'GET'
  } = cacheOptions;

  const cache = new Map();

  return async (req, res, next) => {
    try {
      // Skip cache if configured to do so
      if (skipCache(req)) {
        await Promise.resolve(fn(req, res, next));
        return;
      }

      const cacheKey = keyGenerator(req);
      const cached = cache.get(cacheKey);

      // Return cached response if valid
      if (cached && Date.now() - cached.timestamp < ttl) {
        res.json(cached.data);
        return;
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });

          // Clean up old cache entries
          if (cache.size > 1000) {
            const entries = Array.from(cache.entries());
            entries.slice(0, 100).forEach(([key]) => cache.delete(key));
          }
        }

        return originalJson.call(this, data);
      };

      await Promise.resolve(fn(req, res, next));
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Async handler with request validation
 * @param {Function} fn - Async route handler function
 * @param {Function} validator - Validation function
 * @returns {Function} - Express middleware function
 */
export function asyncHandlerWithValidation(fn, validator) {
  return async (req, res, next) => {
    try {
      // Run validation
      const validation = await Promise.resolve(validator(req));
      
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: validation.errors || []
        });
      }

      // Add validated data to request if provided
      if (validation.data) {
        req.validated = validation.data;
      }

      await Promise.resolve(fn(req, res, next));
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Async handler with rate limiting
 * @param {Function} fn - Async route handler function
 * @param {Object} rateLimitOptions - Rate limit configuration
 * @returns {Function} - Express middleware function
 */
export function asyncHandlerWithRateLimit(fn, rateLimitOptions = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = rateLimitOptions;

  const requests = new Map();

  return async (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(timestamp => timestamp > windowStart);
      requests.set(key, userRequests);
    }

    const currentRequests = requests.get(key) || [];

    // Check rate limit
    if (currentRequests.length >= max) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((currentRequests[0] - windowStart) / 1000)
      });
    }

    try {
      await Promise.resolve(fn(req, res, next));

      // Record successful request if not skipping
      if (!skipSuccessfulRequests && res.statusCode < 400) {
        currentRequests.push(now);
        requests.set(key, currentRequests);
      }
    } catch (error) {
      // Record failed request if not skipping
      if (!skipFailedRequests) {
        currentRequests.push(now);
        requests.set(key, currentRequests);
      }
      next(error);
    }
  };
}

/**
 * Create a custom async handler with multiple features
 * @param {Object} options - Configuration options
 * @returns {Function} - Configured async handler
 */
export function createAsyncHandler(options = {}) {
  const {
    timeout,
    retryOptions,
    cacheOptions,
    validator,
    rateLimitOptions
  } = options;

  return (fn) => {
    let handler = asyncHandler(fn);

    if (timeout) {
      handler = asyncHandlerWithTimeout(handler, timeout);
    }

    if (retryOptions) {
      handler = asyncHandlerWithRetry(handler, retryOptions);
    }

    if (cacheOptions) {
      handler = asyncHandlerWithCache(handler, cacheOptions);
    }

    if (validator) {
      handler = asyncHandlerWithValidation(handler, validator);
    }

    if (rateLimitOptions) {
      handler = asyncHandlerWithRateLimit(handler, rateLimitOptions);
    }

    return handler;
  };
}