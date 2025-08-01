import { z } from 'zod';
import { logger } from './logger';

/**
 * Centralized error handling for serverless functions
 */
export function handleServerlessError(error: unknown, res: any) {
  // Log the error with context
  if (error instanceof Error) {
    logger.error('Serverless function error', error);
  } else {
    logger.error('Unknown error occurred', { error });
  }
  
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
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
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
  res: any,
  allowedMethods: string[]
): boolean {
  if (!req.method || !allowedMethods.includes(req.method)) {
    const message = `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`;
    logger.warn(message, { method: req.method, allowedMethods });
    res.status(405).json({ message });
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
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Request validation failed', { errors: error.errors });
    }
    throw error;
  }
}

/**
 * Authentication error handling
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}
