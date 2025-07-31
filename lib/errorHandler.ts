import type { NextApiResponse } from './types';
import { z } from 'zod';

/**
 * Centralized error handling for serverless functions
 */
export function handleServerlessError(error: unknown, res: NextApiResponse) {
  console.error('Serverless function error:', error);
  
  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: error.errors,
    });
  }
  
  // Handle known Error instances
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        message: error.message,
      });
    }
    
    if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
      return res.status(401).json({
        message: error.message,
      });
    }
    
    if (error.message.includes('Forbidden') || error.message.includes('Insufficient permissions')) {
      return res.status(403).json({
        message: error.message,
      });
    }
    
    // Generic error
    return res.status(500).json({
      message: error.message,
    });
  }
  
  // Unknown error type
  return res.status(500).json({
    message: 'Internal server error',
  });
}

/**
 * Wrapper for async serverless functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw the error to be handled by the route handler
      throw error;
    }
  };
}

/**
 * HTTP method validation for serverless functions
 */
export function validateMethod(
  req: { method?: string },
  res: NextApiResponse,
  allowedMethods: string[]
): boolean {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.status(405).json({ 
      message: `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}` 
    });
    return false;
  }
  return true;
}

/**
 * Request body validation utility
 */
export function validateRequestBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): T {
  return schema.parse(body);
}