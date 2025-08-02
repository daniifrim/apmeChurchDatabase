import { db } from "@/server/db";
import { visitRatings, visits, churchStarRatings } from "@shared/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import type { ChurchRatingSummary, ChurchStarRating } from "@shared/schema";

/**
 * Service for aggregating and calculating church ratings
 */
export class ChurchRatingAggregator {
  /**
   * Calculate and update church average rating
   */
  async calculateChurchAverage(churchId: number): Promise<ChurchRatingSummary> {
    // Get all ratings for this church
    const ratings = await db
      .select({
        missionOpenness: visitRatings.missionOpennessRating,
        hospitality: visitRatings.hospitalityRating,
        financialScore: visitRatings.financialScore,
        missionaryBonus: visitRatings.missionaryBonus,
        calculatedStarRating: visitRatings.calculatedStarRating,
        offeringsAmount: visitRatings.offeringsAmount,
        visitDate: visits.visitDate,
      })
      .from(visitRatings)
      .innerJoin(visits, eq(visitRatings.visitId, visits.id))
      .where(eq(visits.churchId, churchId));

    if (ratings.length === 0) {
      return this.getEmptyRatingSummary();
    }

    // Calculate averages
    const averages = {
      missionOpenness: this.average(ratings.map(r => Number(r.missionOpenness))),
      hospitality: this.average(ratings.map(r => Number(r.hospitality))),
      financial: this.average(ratings.map(r => Number(r.financialScore))),
      missionarySupport: this.average(ratings.map(r => Number(r.missionaryBonus)))
    };

    // Calculate overall weighted average using the same weights as calculation service
    const weights = {
      missionarySupport: 0.35,
      missionOpenness: 0.25,
      financial: 0.25,
      hospitality: 0.15,
    };

    const overallAverage = 
      (averages.missionOpenness * weights.missionOpenness) +
      (averages.hospitality * weights.hospitality) +
      (averages.financial * weights.financial) +
      (averages.missionarySupport * weights.missionarySupport);

    const totalOfferings = this.sum(ratings.map(r => Number(r.offeringsAmount)));
    const lastVisitDate = this.getLatestVisitDate(ratings);

    return {
      averageStars: Math.round(overallAverage * 10) / 10,
      totalVisits: ratings.length,
      lastVisitDate,
      ratingBreakdown: {
        missionOpenness: Math.round(averages.missionOpenness * 10) / 10,
        hospitality: Math.round(averages.hospitality * 10) / 10,
        financialGenerosity: Math.round(averages.financial * 10) / 10,
        missionarySupport: Math.round(averages.missionarySupport * 10) / 10
      },
      totalOfferings,
      averageOfferingsPerVisit: Math.round((totalOfferings / ratings.length) * 100) / 100
    };
  }

  /**
   * Get church star rating from database (cached/materialized view)
   */
  async getChurchStarRating(churchId: number): Promise<ChurchStarRating | null> {
    const result = await db
      .select()
      .from(churchStarRatings)
      .where(eq(churchStarRatings.churchId, churchId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get top-rated churches with pagination
   */
  async getTopRatedChurches(limit: number = 10, offset: number = 0): Promise<ChurchStarRating[]> {
    return await db
      .select()
      .from(churchStarRatings)
      .where(sql`${churchStarRatings.averageStars} IS NOT NULL`)
      .orderBy(sql`${churchStarRatings.averageStars} DESC, ${churchStarRatings.totalVisits} DESC`)
      .limit(limit)
      .offset(offset);
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
    // Use the database function to recalculate
    await db.execute(sql`SELECT calculate_church_star_rating(${churchId})`);
  }

  /**
   * Calculate average of an array of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate sum of an array of numbers
   */
  private sum(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0);
  }

  /**
   * Get the latest visit date from ratings
   */
  private getLatestVisitDate(ratings: { visitDate: Date }[]): Date | undefined {
    if (ratings.length === 0) return undefined;
    return ratings.reduce((latest, rating) => 
      rating.visitDate > latest ? rating.visitDate : latest, 
      ratings[0].visitDate
    );
  }

  /**
   * Get empty rating summary for churches with no ratings
   */
  private getEmptyRatingSummary(): ChurchRatingSummary {
    return {
      averageStars: 0,
      totalVisits: 0,
      lastVisitDate: undefined,
      ratingBreakdown: {
        missionOpenness: 0,
        hospitality: 0,
        financialGenerosity: 0,
        missionarySupport: 0
      },
      totalOfferings: 0,
      averageOfferingsPerVisit: 0
    };
  }
}