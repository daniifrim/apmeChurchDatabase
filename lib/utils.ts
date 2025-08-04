import type { NextApiRequest, NextApiResponse } from './types';

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: NextApiRequest, res: NextApiResponse): boolean {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}

/**
 * Parse query parameters safely
 */
export function parseQueryParam(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) {
    return param[0];
  }
  return param;
}

/**
 * Parse numeric query parameters
 */
export function parseNumericParam(param: string | string[] | undefined): number | undefined {
  const parsed = parseQueryParam(param);
  if (!parsed) return undefined;
  
  const num = parseInt(parsed, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Create a standardized API response
 */
export function createApiResponse<T>(
  data: T,
  message?: string,
  status: number = 200
) {
  return {
    success: status < 400,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any
) {
  return {
    success: false,
    error: {
      message,
      status,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log function calls for debugging in serverless environment
 */
export function logServerlessFunction(
  functionName: string,
  method: string,
  userId?: string,
  additionalInfo?: any
) {
  console.log(`[${new Date().toISOString()}] ${functionName} - ${method}`, {
    userId,
    ...additionalInfo,
  });
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Sleep utility for testing and rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for database operations
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError!;
}