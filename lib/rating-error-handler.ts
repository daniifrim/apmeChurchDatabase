import { z } from 'zod';
import { logger } from './logger';
import type { NextApiResponse } from './types';

/**
 * Enhanced error handling specifically for rating system operations
 */

export class RatingError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public messageRo?: string
  ) {
    super(message);
    this.name = 'RatingError';
  }
}

export class DatabaseRatingError extends RatingError {
  constructor(message: string, public originalError?: Error, messageRo?: string) {
    super('DATABASE_ERROR', message, 500, messageRo);
    this.name = 'DatabaseRatingError';
  }
}

export class ValidationRatingError extends RatingError {
  constructor(message: string, public validationErrors?: z.ZodError, messageRo?: string) {
    super('VALIDATION_ERROR', message, 400, messageRo);
    this.name = 'ValidationRatingError';
  }
}

export class NotFoundRatingError extends RatingError {
  constructor(resource: string = 'Resource', messageRo?: string) {
    super('NOT_FOUND', `${resource} not found`, 404, messageRo);
    this.name = 'NotFoundRatingError';
  }
}

export class UnauthorizedRatingError extends RatingError {
  constructor(message: string = 'Access denied', messageRo?: string) {
    super('UNAUTHORIZED', message, 403, messageRo);
    this.name = 'UnauthorizedRatingError';
  }
}

export class RatingCalculationError extends RatingError {
  constructor(message: string, public calculationContext?: any, messageRo?: string) {
    super('CALCULATION_ERROR', message, 500, messageRo);
    this.name = 'RatingCalculationError';
  }
}

/**
 * Enhanced error handler for rating system operations
 */
export function handleRatingError(error: unknown, res: NextApiResponse, context?: any) {
  // Log the error with context
  logger.error('Rating system error', {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    context
  });

  // Handle specific rating errors
  if (error instanceof RatingError) {
    return res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      messageRo: error.messageRo,
      ...(error instanceof ValidationRatingError && error.validationErrors && {
        validationErrors: error.validationErrors.errors
      }),
      ...(error instanceof RatingCalculationError && error.calculationContext && {
        calculationContext: error.calculationContext
      })
    });
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      messageRo: 'Validarea datelor a eșuat',
      validationErrors: error.errors
    });
  }

  // Handle database constraint errors
  if (error instanceof Error) {
    // PostgreSQL/Supabase specific errors
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_ERROR',
        message: 'Duplicate record found',
        messageRo: 'Înregistrare duplicată'
      });
    }

    if (error.message.includes('foreign key') || error.message.includes('violates foreign key constraint')) {
      return res.status(400).json({
        success: false,
        code: 'FOREIGN_KEY_ERROR',
        message: 'Referenced record not found',
        messageRo: 'Înregistrarea referenciată nu există'
      });
    }

    if (error.message.includes('not found') || error.message.includes('PGRST116')) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Resource not found',
        messageRo: 'Resursa nu a fost găsită'
      });
    }

    if (error.message.includes('permission') || error.message.includes('RLS')) {
      return res.status(403).json({
        success: false,
        code: 'ACCESS_DENIED',
        message: 'Access denied',
        messageRo: 'Acces interzis'
      });
    }

    // Connection/timeout errors
    if (error.message.includes('timeout') || error.message.includes('connection')) {
      return res.status(503).json({
        success: false,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database temporarily unavailable',
        messageRo: 'Baza de date este temporar indisponibilă'
      });
    }

    // Generic error with context
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      messageRo: 'Eroare internă de server'
    });
  }

  // Unknown error type
  return res.status(500).json({
    success: false,
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    messageRo: 'A apărut o eroare neașteptată'
  });
}

/**
 * Wrapper for database operations with enhanced error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: any
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Database operation failed: ${operationName}`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context
    });

    if (error instanceof Error) {
      throw new DatabaseRatingError(
        `Failed to execute ${operationName}: ${error.message}`,
        error,
        `Operațiunea ${operationName} a eșuat`
      );
    }

    throw new DatabaseRatingError(
      `Failed to execute ${operationName}`,
      undefined,
      `Operațiunea ${operationName} a eșuat`
    );
  }
}

/**
 * Wrapper for calculation operations with enhanced error handling
 */
export async function withCalculationErrorHandling<T>(
  calculation: () => T | Promise<T>,
  calculationName: string,
  context?: any
): Promise<T> {
  try {
    return await calculation();
  } catch (error) {
    logger.error(`Rating calculation failed: ${calculationName}`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context
    });

    throw new RatingCalculationError(
      `Rating calculation failed: ${calculationName}`,
      context,
      `Calculul evaluării a eșuat: ${calculationName}`
    );
  }
}