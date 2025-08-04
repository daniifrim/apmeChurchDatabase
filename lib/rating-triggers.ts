/**
 * Rating system triggers for automatic recalculation
 * Handles cascading updates when visit ratings are modified
 */

import { logger } from './logger';
import { serverlessStorage } from './storage';
import { ChurchRatingAggregator } from './church-rating-aggregator';
import { withDatabaseErrorHandling, RatingCalculationError } from './rating-error-handler';

export interface RatingTriggerContext {
  churchId: number;
  visitId?: number;
  userId?: string;
  operation: 'create' | 'update' | 'delete';
  reason: string;
}

/**
 * Service for handling rating recalculation triggers
 */
export class RatingTriggerService {
  private aggregator = new ChurchRatingAggregator();
  private pendingRecalculations = new Set<number>();
  private readonly debounceMs = 5000; // 5 seconds debounce

  /**
   * Trigger church rating recalculation after visit rating changes
   */
  async triggerChurchRatingRecalculation(context: RatingTriggerContext): Promise<void> {
    const { churchId, operation, reason, userId } = context;

    logger.info('Rating recalculation triggered', {
      churchId,
      operation,
      reason,
      userId
    });

    try {
      // Prevent duplicate recalculations with debouncing
      if (this.pendingRecalculations.has(churchId)) {
        logger.debug('Recalculation already pending for church', { churchId });
        return;
      }

      this.pendingRecalculations.add(churchId);

      // Debounce recalculations to avoid excessive database operations
      setTimeout(async () => {
        try {
          await this.performChurchRecalculation(churchId, context);
        } finally {
          this.pendingRecalculations.delete(churchId);
        }
      }, this.debounceMs);

    } catch (error) {
      this.pendingRecalculations.delete(churchId);
      logger.error('Failed to trigger rating recalculation', {
        churchId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Perform the actual church rating recalculation
   */
  private async performChurchRecalculation(
    churchId: number, 
    context: RatingTriggerContext
  ): Promise<void> {
    try {
      logger.info('Starting automatic church rating recalculation', {
        churchId,
        trigger: context.reason
      });

      // Recalculate using the aggregator service
      await withDatabaseErrorHandling(
        () => this.aggregator.recalculateChurchRating(churchId),
        'automatic church rating recalculation',
        { churchId, context }
      );

      // Create activity log for the recalculation
      if (context.userId) {
        await this.logRecalculationActivity(churchId, context);
      }

      logger.info('Automatic church rating recalculation completed', {
        churchId,
        trigger: context.reason
      });

    } catch (error) {
      logger.error('Automatic church rating recalculation failed', {
        churchId,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Don't throw here to prevent cascade failures
      // The original operation should still succeed even if recalculation fails
    }
  }

  /**
   * Log the automatic recalculation as an activity
   */
  private async logRecalculationActivity(
    churchId: number, 
    context: RatingTriggerContext
  ): Promise<void> {
    try {
      await withDatabaseErrorHandling(
        () => serverlessStorage.createActivity({
          churchId,
          userId: context.userId!,
          type: 'note',
          title: 'Rating automatically recalculated',
          description: `Church rating was automatically updated after ${context.operation} operation on ${context.reason}`,
          activityDate: new Date()
        }),
        'create automatic recalculation activity',
        { churchId, context }
      );
    } catch (error) {
      // Log but don't throw - activity logging is not critical
      logger.warn('Failed to log automatic recalculation activity', {
        churchId,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Batch recalculation for multiple churches (admin operation)
   */
  async triggerBatchRecalculation(
    churchIds: number[],
    userId: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<{ success: number; failed: number; errors: Array<{ churchId: number; error: string }> }> {
    logger.info('Starting batch rating recalculation', {
      churchCount: churchIds.length,
      priority,
      userId
    });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ churchId: number; error: string }>
    };

    // Process churches based on priority
    const batchSize = priority === 'high' ? 5 : priority === 'normal' ? 3 : 1;
    const delay = priority === 'high' ? 100 : priority === 'normal' ? 500 : 1000;

    for (let i = 0; i < churchIds.length; i += batchSize) {
      const batch = churchIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (churchId) => {
        try {
          await this.triggerChurchRatingRecalculation({
            churchId,
            userId,
            operation: 'update',
            reason: 'batch recalculation'
          });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            churchId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches to prevent overwhelming the database
      if (i + batchSize < churchIds.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logger.info('Batch rating recalculation completed', {
      churchCount: churchIds.length,
      success: results.success,
      failed: results.failed,
      userId
    });

    return results;
  }

  /**
   * Check if a church has pending recalculations
   */
  isPendingRecalculation(churchId: number): boolean {
    return this.pendingRecalculations.has(churchId);
  }

  /**
   * Get all pending recalculations (for monitoring)
   */
  getPendingRecalculationsCount(): number {
    return this.pendingRecalculations.size;
  }

  /**
   * Clear all pending recalculations (emergency stop)
   */
  clearAllPendingRecalculations(): void {
    logger.warn('Clearing all pending rating recalculations', {
      count: this.pendingRecalculations.size
    });
    this.pendingRecalculations.clear();
  }
}

// Global instance for use across the application
export const ratingTriggerService = new RatingTriggerService();

/**
 * Helper function to trigger recalculation after visit rating operations
 */
export async function triggerRatingRecalculation(
  churchId: number,
  operation: 'create' | 'update' | 'delete',
  context: {
    visitId?: number;
    userId?: string;
    reason?: string;
  } = {}
): Promise<void> {
  await ratingTriggerService.triggerChurchRatingRecalculation({
    churchId,
    operation,
    visitId: context.visitId,
    userId: context.userId,
    reason: context.reason || `visit rating ${operation}`
  });
}

/**
 * Middleware function to automatically trigger recalculation after successful operations
 */
export function withAutoRecalculation<T>(
  operation: () => Promise<T>,
  context: {
    churchId: number;
    operationType: 'create' | 'update' | 'delete';
    visitId?: number;
    userId?: string;
    reason?: string;
  }
): Promise<T> {
  return operation().then(async (result) => {
    // Trigger recalculation after successful operation
    try {
      await triggerRatingRecalculation(
        context.churchId,
        context.operationType,
        {
          visitId: context.visitId,
          userId: context.userId,
          reason: context.reason
        }
      );
    } catch (recalcError) {
      // Log but don't fail the original operation
      logger.warn('Auto-recalculation failed but operation succeeded', {
        context,
        error: recalcError instanceof Error ? recalcError.message : 'Unknown error'
      });
    }
    return result;
  });
}