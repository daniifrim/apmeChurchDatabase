import { db } from "@/server/db";
import { visitRatings, visits, churchStarRatings } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import type { ChurchRatingSummary, ChurchStarRating } from "@shared/schema";
import { serverlessStorage } from "@/lib/storage";
import { withDatabaseErrorHandling, RatingCalculationError, DatabaseRatingError } from "@/lib/rating-error-handler";
import { logger } from "@/lib/logger";

/**
 * Service for aggregating and calculating church ratings
 */
export class ChurchRatingAggregator {
  /**
   * Calculate and update church average rating
   */
  async calculateChurchAverage(churchId: number): Promise<ChurchRatingSummary> {
    if (!churchId || churchId <= 0) {
      throw new RatingCalculationError('Invalid church ID provided', { churchId });
    }

    // Get all ratings for this church with error handling
    const ratings = await withDatabaseErrorHandling(
      () => db
        .select({
          missionOpenness: visitRatings.missionOpennessRating,
          hospitality: visitRatings.hospitalityRating,
          financialScore: visitRatings.financialScore,
          missionarySupportCount: visitRatings.missionarySupportCount,
          calculatedStarRating: visitRatings.calculatedStarRating,
          offeringsAmount: visitRatings.offeringsAmount,
          visitDate: visits.visitDate,
        })
        .from(visitRatings)
        .innerJoin(visits, eq(visitRatings.visitId, visits.id))
        .where(eq(visits.churchId, churchId)),
      'fetch church ratings',
      { churchId }
    );

    if (ratings.length === 0) {
      return this.getEmptyRatingSummary();
    }

    // Calculate averages for the 3-component system (Version 2.0)
    let averages, overallAverage, totalOfferings, lastVisitDate;
    
    try {
      averages = {
        missionOpenness: this.average(ratings.map(r => Number(r.missionOpenness))),
        hospitality: this.average(ratings.map(r => Number(r.hospitality))),
        financial: this.average(ratings.map(r => Number(r.financialScore))),
      };
      
      // Version 2.0: Simple average of all calculated star ratings
      // (The dynamic weighting was already applied during individual visit calculations)
      overallAverage = this.average(ratings.map(r => Number(r.calculatedStarRating)));
      
      totalOfferings = this.sum(ratings.map(r => Number(r.offeringsAmount)));
      lastVisitDate = this.getLatestVisitDate(ratings);

    // Get the latest missionary support count as a separate church-level attribute
    const latestMissionarySupportCount = ratings.length > 0 ? 
      Number(ratings[ratings.length - 1].missionarySupportCount) : 0;

    } catch (calculationError) {
      throw new RatingCalculationError(
        'Failed to calculate rating averages',
        { churchId, ratingsCount: ratings.length, error: calculationError },
        'Calculul mediei evaluărilor a eșuat'
      );
    }

    // Validate and sanitize final results
    const result: ChurchRatingSummary = {
      averageStars: Math.max(0, Math.min(5, Math.round(overallAverage * 10) / 10)),
      missionarySupportCount: Math.max(0, latestMissionarySupportCount), // Separate church-level attribute
      totalVisits: Math.max(0, ratings.length),
      lastVisitDate,
      ratingBreakdown: {
        missionOpenness: Math.max(0, Math.min(5, Math.round(averages.missionOpenness * 10) / 10)),
        hospitality: Math.max(0, Math.min(5, Math.round(averages.hospitality * 10) / 10)),
        financialGenerosity: Math.max(0, Math.min(5, Math.round(averages.financial * 10) / 10)),
        // missionarySupport removed from breakdown - now separate attribute
      },
      totalOfferings: Math.max(0, totalOfferings),
      averageOfferingsPerVisit: ratings.length > 0 ? 
        Math.round((totalOfferings / ratings.length) * 100) / 100 : 0
    };

    // Log successful calculation
    logger.info('Church rating calculation completed', {
      churchId,
      averageStars: result.averageStars,
      totalVisits: result.totalVisits,
      missionarySupportCount: result.missionarySupportCount
    });

    return result;
  }

  /**
   * Get church star rating from database (cached/materialized view)
   */
  async getChurchStarRating(churchId: number): Promise<ChurchStarRating | null> {
    if (!churchId || churchId <= 0) {
      throw new RatingCalculationError('Invalid church ID provided for star rating lookup', { churchId });
    }

    const result = await withDatabaseErrorHandling(
      () => db
        .select()
        .from(churchStarRatings)
        .where(eq(churchStarRatings.churchId, churchId))
        .limit(1),
      'get church star rating',
      { churchId }
    );

    return result[0] || null;
  }

  /**
   * Get top-rated churches with pagination
   */
  async getTopRatedChurches(limit: number = 10, offset: number = 0): Promise<ChurchStarRating[]> {
    // Validate and sanitize pagination parameters
    const sanitizedLimit = Math.max(1, Math.min(100, limit)); // Between 1-100
    const sanitizedOffset = Math.max(0, offset);

    return await withDatabaseErrorHandling(
      () => db
        .select()
        .from(churchStarRatings)
        .where(sql`${churchStarRatings.averageStars} IS NOT NULL AND ${churchStarRatings.averageStars} > 0`)
        .orderBy(sql`${churchStarRatings.averageStars} DESC, ${churchStarRatings.totalVisits} DESC`)
        .limit(sanitizedLimit)
        .offset(sanitizedOffset),
      'get top rated churches',
      { limit: sanitizedLimit, offset: sanitizedOffset }
    );
  }

  /**
   * Get churches with recent activity (last 30 days)
   */
  async getRecentlyActiveChurches(limit: number = 10): Promise<ChurchStarRating[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await db
      .select()
      .from(churchStarRatings)
      .where(
        and(
          sql`${churchStarRatings.lastVisitDate} IS NOT NULL`,
          gte(churchStarRatings.lastVisitDate, thirtyDaysAgo)
        )
      )
      .orderBy(sql`${churchStarRatings.lastVisitDate} DESC`)
      .limit(limit);
  }

  /**
   * Get rating statistics for analytics
   */
  async getRatingStatistics(): Promise<{
    totalRatedChurches: number;
    averageRating: number;
    totalVisits: number;
    totalOfferings: number;
    ratingDistribution: { stars: number; count: number }[];
  }> {
    // Get basic statistics
    const stats = await db
      .select({
        totalChurches: sql<number>`COUNT(*)`,
        averageRating: sql<number>`AVG(${churchStarRatings.averageStars})`,
        totalVisits: sql<number>`SUM(${churchStarRatings.totalVisits})`,
        totalOfferings: sql<number>`SUM(${churchStarRatings.totalOfferingsCollected})`
      })
      .from(churchStarRatings)
      .where(sql`${churchStarRatings.averageStars} IS NOT NULL`);

    // Get rating distribution
    const distribution = await db
      .select({
        stars: sql<number>`ROUND(${churchStarRatings.averageStars})`,
        count: sql<number>`COUNT(*)`
      })
      .from(churchStarRatings)
      .where(sql`${churchStarRatings.averageStars} IS NOT NULL`)
      .groupBy(sql`ROUND(${churchStarRatings.averageStars})`)
      .orderBy(sql`ROUND(${churchStarRatings.averageStars})`);

    const basicStats = stats[0];

    return {
      totalRatedChurches: Number(basicStats?.totalChurches || 0),
      averageRating: Math.round((Number(basicStats?.averageRating) || 0) * 10) / 10,
      totalVisits: Number(basicStats?.totalVisits || 0),
      totalOfferings: Number(basicStats?.totalOfferings || 0),
      ratingDistribution: distribution.map(d => ({
        stars: Number(d.stars),
        count: Number(d.count)
      }))
    };
  }

  /**
   * Manually trigger recalculation for a church (admin function)
   */
  async recalculateChurchRating(churchId: number): Promise<void> {
    if (!churchId || churchId <= 0) {
      throw new RatingCalculationError('Invalid church ID provided for recalculation', { churchId });
    }

    try {
      logger.info('Starting church rating recalculation', { churchId });
      
      // Use the storage service for consistent database function calls
      await withDatabaseErrorHandling(
        () => serverlessStorage.recalculateChurchRating(churchId),
        'recalculate church rating via storage service',
        { churchId }
      );
      
      logger.info('Church rating recalculation completed', { churchId });
    } catch (error) {
      logger.error('Church rating recalculation failed', { churchId, error });
      throw new RatingCalculationError(
        `Failed to recalculate rating for church ${churchId}`,
        { churchId, error },
        'Recalcularea evaluării bisericii a eșuat'
      );
    }
  }

  /**
   * Calculate average of an array of numbers with validation
   */
  private average(numbers: number[]): number {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    
    // Filter out invalid numbers
    const validNumbers = numbers.filter(num => 
      typeof num === 'number' && !isNaN(num) && isFinite(num)
    );
    
    if (validNumbers.length === 0) return 0;
    
    const sum = validNumbers.reduce((acc, num) => acc + num, 0);
    return sum / validNumbers.length;
  }

  /**
   * Calculate sum of an array of numbers with validation
   */
  private sum(numbers: number[]): number {
    if (!Array.isArray(numbers) || numbers.length === 0) return 0;
    
    // Filter out invalid numbers
    const validNumbers = numbers.filter(num => 
      typeof num === 'number' && !isNaN(num) && isFinite(num)
    );
    
    return validNumbers.reduce((sum, num) => sum + num, 0);
  }

  /**
   * Get the latest visit date from ratings with validation
   */
  private getLatestVisitDate(ratings: { visitDate: Date }[]): Date | undefined {
    if (!Array.isArray(ratings) || ratings.length === 0) return undefined;
    
    // Filter out invalid dates
    const validRatings = ratings.filter(rating => 
      rating.visitDate && rating.visitDate instanceof Date && !isNaN(rating.visitDate.getTime())
    );
    
    if (validRatings.length === 0) return undefined;
    
    return validRatings.reduce((latest, rating) => 
      rating.visitDate > latest ? rating.visitDate : latest, 
      validRatings[0].visitDate
    );
  }

  /**
   * Get empty rating summary for churches with no ratings
   */
  private getEmptyRatingSummary(): ChurchRatingSummary {
    return {
      averageStars: 0,
      missionarySupportCount: 0, // Separate church-level attribute
      totalVisits: 0,
      lastVisitDate: undefined,
      ratingBreakdown: {
        missionOpenness: 0,
        hospitality: 0,
        financialGenerosity: 0,
        // missionarySupport removed from breakdown
      },
      totalOfferings: 0,
      averageOfferingsPerVisit: 0
    };
  }
}