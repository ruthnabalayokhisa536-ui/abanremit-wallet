/**
 * Retry utility with exponential backoff
 * Implements automatic retry logic for transient failures
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Error classification for retry logic
 */
export class ErrorClassifier {
  /**
   * Determine if an error is transient and should be retried
   */
  static isRetryable(error: any): boolean {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }

    // Timeout errors
    if (error.name === 'AbortError') {
      return true;
    }

    // HTTP status codes that are retryable
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      
      // Transient server errors
      if (status === 408) return true; // Request Timeout
      if (status === 429) return true; // Too Many Requests
      if (status === 500) return true; // Internal Server Error
      if (status === 502) return true; // Bad Gateway
      if (status === 503) return true; // Service Unavailable
      if (status === 504) return true; // Gateway Timeout
      
      // Temporary auth issues (might be token refresh needed)
      if (status === 403) return true; // Forbidden (might be temporary)
    }

    // DNS errors
    if (error.message && (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ECONNRESET')
    )) {
      return true;
    }

    return false;
  }

  /**
   * Determine if an error is permanent and should not be retried
   */
  static isPermanent(error: any): boolean {
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      
      // Client errors (permanent)
      if (status === 400) return true; // Bad Request
      if (status === 401) return true; // Unauthorized (need new credentials)
      if (status === 404) return true; // Not Found
      if (status === 405) return true; // Method Not Allowed
      if (status === 422) return true; // Unprocessable Entity
    }

    return false;
  }

  /**
   * Get recommended delay for specific error types
   */
  static getRecommendedDelay(error: any): number {
    if (error.status === 429) {
      // Rate limiting - wait longer
      return 5000;
    }

    if (error.status === 503) {
      // Service unavailable - wait a bit
      return 3000;
    }

    return 1000; // Default 1 second
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 8000,
    backoffMultiplier = 2,
    onRetry
  } = options;

  let lastError: Error;
  let totalDelay = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on permanent errors
      if (ErrorClassifier.isPermanent(error)) {
        throw error;
      }

      // Don't retry if not retryable
      if (!ErrorClassifier.isRetryable(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxAttempts) {
        // Calculate delay with exponential backoff
        const baseDelay = ErrorClassifier.getRecommendedDelay(error);
        const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
        const delay = Math.min(exponentialDelay, maxDelay);
        
        totalDelay += delay;

        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, error);
        }

        // Wait before next attempt
        await sleep(delay);
      }
    }
  }

  // All attempts failed
  throw new RetryError(
    `Operation failed after ${maxAttempts} attempts`,
    maxAttempts,
    lastError!
  );
}

/**
 * Retry with detailed result tracking
 */
export async function retryWithTracking<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const data = await retryWithBackoff(operation, {
      ...options,
      onRetry: (attempt, error) => {
        attempts = attempt;
        if (options.onRetry) {
          options.onRetry(attempt, error);
        }
      }
    });

    return {
      success: true,
      data,
      attempts: attempts + 1,
      totalDelay: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      success: false,
      error,
      attempts: attempts + 1,
      totalDelay: Date.now() - startTime
    };
  }
}

/**
 * Create a retryable version of a function
 */
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: any[]) => {
    return await retryWithBackoff(() => fn(...args), options);
  }) as T;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Example usage:
 * 
 * // Basic retry
 * const result = await retryWithBackoff(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 * 
 * // With custom options
 * const result = await retryWithBackoff(
 *   async () => await apiCall(),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 2000,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`);
 *     }
 *   }
 * );
 * 
 * // Make function retryable
 * const retryableFetch = makeRetryable(fetch, { maxAttempts: 3 });
 * const response = await retryableFetch('https://api.example.com/data');
 */
