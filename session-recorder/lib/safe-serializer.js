/**
 * Safe Serialization Module
 * Prevents RangeError: Invalid string length crashes by implementing
 * data size limits, error handling, and circuit breaker patterns
 */

const { logger } = require('./logger');

class SafeSerializer {
  constructor(options = {}) {
    this.maxStringLength = options.maxStringLength || 100 * 1024 * 1024; // 100MB default
    this.maxContentLength = options.maxContentLength || 10 * 1024; // 10KB for file content
    this.maxArrayItems = options.maxArrayItems || 1000;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
    this.circuitBreakerTimeout = options.circuitBreakerTimeout || 60000; // 1 minute
    
    this.failures = 0;
    this.circuitOpen = false;
    this.circuitOpenTime = null;
  }

  /**
   * Safe JSON.stringify with size limits and error handling
   */
  safeStringify(data, replacer = null, space = null) {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      logger.warn('Circuit breaker is open, skipping serialization');
      return JSON.stringify({ 
        error: 'Serialization circuit breaker active',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Pre-process data to handle large objects
      const processedData = this.preprocessData(data);
      
      // Estimate size before stringifying
      const estimatedSize = this.estimateSize(processedData);
      if (estimatedSize > this.maxStringLength) {
        logger.warn(`Data too large for serialization: ${estimatedSize} bytes, truncating`);
        return this.handleOversizedData(processedData);
      }

      // Attempt serialization
      const result = JSON.stringify(processedData, replacer, space);
      
      // Verify result size (JavaScript strings can't be longer than about 2^53 chars)
      const maxJSStringLength = Math.pow(2, 28); // ~268 million chars (safe limit)
      if (result.length > maxJSStringLength) {
        throw new RangeError(`Serialized string too large: ${result.length} characters`);
      }

      // Reset failure count on success
      this.failures = 0;
      return result;

    } catch (error) {
      this.handleSerializationError(error, data);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Preprocess data to handle large objects and circular references
   */
  preprocessData(data) {
    const seen = new WeakSet();
    
    const process = (obj, depth = 0) => {
      // Prevent infinite recursion
      if (depth > 10) {
        return '[Max depth exceeded]';
      }

      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      // Handle circular references
      if (seen.has(obj)) {
        return '[Circular Reference]';
      }
      seen.add(obj);

      if (Array.isArray(obj)) {
        // Limit array size
        if (obj.length > this.maxArrayItems) {
          logger.warn(`Array too large: ${obj.length} items, truncating to ${this.maxArrayItems}`);
          const truncated = obj.slice(0, this.maxArrayItems).map(item => process(item, depth + 1));
          truncated.push(`[... ${obj.length - this.maxArrayItems} more items truncated]`);
          return truncated;
        }
        return obj.map(item => process(item, depth + 1));
      }

      // Handle objects
      const processed = {};
      let keyCount = 0;
      
      for (const [key, value] of Object.entries(obj)) {
        // Limit object keys
        if (keyCount >= this.maxArrayItems) {
          processed['...truncated'] = `${Object.keys(obj).length - keyCount} more keys`;
          break;
        }

        // Handle large string values
        if (typeof value === 'string' && value.length > this.maxContentLength) {
          processed[key] = this.truncateString(value, key);
        } else if (typeof value === 'object' && value !== null) {
          processed[key] = process(value, depth + 1);
        } else {
          processed[key] = value;
        }
        
        keyCount++;
      }

      return processed;
    };

    return process(data);
  }

  /**
   * Truncate large strings with metadata
   */
  truncateString(str, context = 'unknown') {
    const truncated = str.substring(0, this.maxContentLength);
    const metadata = {
      truncated: true,
      originalLength: str.length,
      truncatedLength: this.maxContentLength,
      context: context,
      preview: truncated,
      hash: this.simpleHash(str)
    };

    logger.debug(`Truncated large string in ${context}: ${str.length} -> ${this.maxContentLength} chars`);
    return metadata;
  }

  /**
   * Simple hash function for content verification
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 1000); i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Estimate object size before serialization
   */
  estimateSize(obj) {
    if (obj === null || obj === undefined) return 4;
    if (typeof obj === 'boolean') return 5;
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'string') return obj.length * 2; // UTF-16 encoding
    
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.estimateSize(item), 10);
    }
    
    if (typeof obj === 'object') {
      return Object.entries(obj).reduce((sum, [key, value]) => {
        return sum + key.length * 2 + this.estimateSize(value) + 10;
      }, 20);
    }
    
    return 100; // Default estimate
  }

  /**
   * Handle oversized data by creating summary
   */
  handleOversizedData(data) {
    const summary = {
      type: 'oversized_data_summary',
      timestamp: new Date().toISOString(),
      originalType: Array.isArray(data) ? 'array' : typeof data,
      estimatedSize: this.estimateSize(data),
      error: 'Data too large for serialization',
      summary: this.createDataSummary(data)
    };

    // Increment failure count since this is an oversized data issue
    this.failures++;
    
    return JSON.stringify(summary, null, 2);
  }

  /**
   * Create a summary of large data objects
   */
  createDataSummary(data) {
    if (Array.isArray(data)) {
      return {
        length: data.length,
        firstItems: data.slice(0, 3),
        lastItems: data.slice(-3),
        types: [...new Set(data.map(item => typeof item))]
      };
    }

    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      const summary = {
        keyCount: keys.length,
        keys: keys.slice(0, 10),
        types: {}
      };

      // Count types
      for (const key of keys.slice(0, 100)) { // Sample first 100 keys
        const type = typeof data[key];
        summary.types[type] = (summary.types[type] || 0) + 1;
      }

      return summary;
    }

    return { type: typeof data, length: data.toString().length };
  }

  /**
   * Handle serialization errors
   */
  handleSerializationError(error, data) {
    this.failures++;
    
    logger.error('Serialization error:', {
      error: error.message,
      type: error.constructor.name,
      failures: this.failures,
      dataType: typeof data,
      isArray: Array.isArray(data)
    });

    // Open circuit breaker if too many failures
    if (this.failures >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.circuitOpenTime = Date.now();
      logger.warn('Circuit breaker opened due to repeated serialization failures');
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen() {
    if (!this.circuitOpen) return false;

    // Reset circuit breaker after timeout
    if (Date.now() - this.circuitOpenTime > this.circuitBreakerTimeout) {
      this.circuitOpen = false;
      this.circuitOpenTime = null;
      this.failures = 0;
      logger.info('Circuit breaker reset');
      return false;
    }

    return true;
  }

  /**
   * Create error response for failed serialization
   */
  createErrorResponse(error) {
    return JSON.stringify({
      error: 'Serialization failed',
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString(),
      circuitOpen: this.circuitOpen,
      failures: this.failures
    }, null, 2);
  }

  /**
   * Static method for quick safe serialization
   */
  static stringify(data, options = {}) {
    const serializer = new SafeSerializer(options);
    return serializer.safeStringify(data);
  }

  /**
   * Batch serialize multiple objects safely
   */
  batchSerialize(items, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 10;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      try {
        const serialized = this.safeStringify(batch);
        results.push({
          success: true,
          data: serialized,
          range: `${i}-${i + batch.length - 1}`
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          range: `${i}-${i + batch.length - 1}`
        });
      }
    }

    return results;
  }
}

module.exports = SafeSerializer;