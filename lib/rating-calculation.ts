import { CreateRatingRequest, CalculatedRating } from "@shared/schema";
import { withCalculationErrorHandling, RatingCalculationError } from "@/lib/rating-error-handler";
import { logger } from "@/lib/logger";

/**
 * Service for calculating church visit ratings using weighted formula (Version 2.0)
 * 
 * Key changes in v2.0:
 * - Missionary support is now a separate church-level attribute (not part of star rating)
 * - Dynamic weight redistribution when no financial offering is made
 * - Simplified 3-component star rating: Mission Openness, Hospitality, Financial Generosity
 */
export class RatingCalculationService {
  private readonly baseWeights = {
    missionOpenness: 0.40,    // Primary focus - mission engagement
    hospitality: 0.30,        // Secondary - hospitality experience
    financial: 0.30,          // Tertiary - financial generosity (when applicable)
  };

  /**
   * Calculate star rating for a visit based on input data (Version 2.0)
   * Uses dynamic weighting - redistributes financial weight when no offering is made
   */
  calculateVisitRating(data: CreateRatingRequest & { attendeesCount: number }): CalculatedRating {
    // Validate input data
    this.validateRatingInput(data);
    
    return withCalculationErrorHandling(
      () => this.performRatingCalculation(data),
      'visit rating calculation',
      { data: this.sanitizeDataForLogging(data) }
    ) as CalculatedRating;
  }

  /**
   * Internal method to perform the actual rating calculation
   */
  private performRatingCalculation(data: CreateRatingRequest & { attendeesCount: number }): CalculatedRating {
    let financialScore = 0;
    let finalWeights = { ...this.baseWeights };

    // Check if financial component is applicable (offering was made)
    const isFinancialApplicable = data.offeringsAmount && data.offeringsAmount > 0;

    if (isFinancialApplicable) {
      // Calculate financial score only if an offering was made
      financialScore = this.calculateFinancialScore(
        data.offeringsAmount,
        data.churchMembers,
        data.attendeesCount
      );
    } else {
      // Dynamically redistribute the financial weight if no offering was made
      const financialWeight = finalWeights.financial;
      finalWeights.financial = 0; // Remove financial weight
      // Distribute the unused weight proportionally
      finalWeights.missionOpenness += financialWeight / 2;
      finalWeights.hospitality += financialWeight / 2;
    }

    // Calculate weighted score using dynamic weights
    const weightedScore = 
      (data.missionOpennessRating * finalWeights.missionOpenness) +
      (data.hospitalityRating * finalWeights.hospitality) +
      (financialScore * finalWeights.financial);

    // Convert to a final 1-5 star rating
    const starRating = Math.round(Math.min(Math.max(weightedScore, 1), 5));

    return {
      starRating,
      financialScore,
      // Missionary support is now tracked separately, not as a bonus
      missionaryBonus: 0, // Deprecated in v2.0 - kept for backward compatibility only
      breakdown: {
        missionOpenness: data.missionOpennessRating,
        hospitality: data.hospitalityRating,
        financial: financialScore,
        missionaryBonus: 0, // Deprecated in v2.0 - kept for backward compatibility only
      }
    };
  }

  /**
   * Validate rating input data
   */
  private validateRatingInput(data: CreateRatingRequest & { attendeesCount: number }): void {
    if (!data) {
      throw new RatingCalculationError('Rating data is required');
    }

    if (typeof data.missionOpennessRating !== 'number' || data.missionOpennessRating < 1 || data.missionOpennessRating > 5) {
      throw new RatingCalculationError('Mission openness rating must be between 1 and 5');
    }

    if (typeof data.hospitalityRating !== 'number' || data.hospitalityRating < 1 || data.hospitalityRating > 5) {
      throw new RatingCalculationError('Hospitality rating must be between 1 and 5');
    }

    if (typeof data.churchMembers !== 'number' || data.churchMembers <= 0) {
      throw new RatingCalculationError('Church members count must be a positive number');
    }

    if (typeof data.attendeesCount !== 'number' || data.attendeesCount <= 0) {
      throw new RatingCalculationError('Attendees count must be a positive number');
    }

    if (typeof data.offeringsAmount !== 'number' || data.offeringsAmount < 0) {
      throw new RatingCalculationError('Offerings amount cannot be negative');
    }

    if (typeof data.missionarySupportCount !== 'number' || data.missionarySupportCount < 0) {
      throw new RatingCalculationError('Missionary support count cannot be negative');
    }

    // Sanity checks
    if (data.attendeesCount > data.churchMembers * 10) {
      logger.warn('Attendees count seems unusually high compared to church members', {
        attendeesCount: data.attendeesCount,
        churchMembers: data.churchMembers
      });
    }

    if (data.missionarySupportCount > data.attendeesCount) {
      throw new RatingCalculationError('Missionary support count cannot exceed attendees count');
    }

    if (data.offeringsAmount > 100000) { // 100,000 RON seems unreasonably high
      logger.warn('Offerings amount seems unusually high', {
        offeringsAmount: data.offeringsAmount
      });
    }
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeDataForLogging(data: CreateRatingRequest & { attendeesCount: number }): any {
    return {
      missionOpennessRating: data.missionOpennessRating,
      hospitalityRating: data.hospitalityRating,
      churchMembers: data.churchMembers,
      attendeesCount: data.attendeesCount,
      missionarySupportCount: data.missionarySupportCount,
      hasOffering: data.offeringsAmount > 0,
      offeringsRange: data.offeringsAmount > 0 ? 
        (data.offeringsAmount < 50 ? 'low' : data.offeringsAmount < 200 ? 'medium' : 'high') : 'none'
    };
  }

  /**
   * Calculate financial generosity score based on offerings and attendance
   */
  private calculateFinancialScore(
    offerings: number,
    members: number,
    attendees: number
  ): number {
    // Validate inputs
    if (typeof offerings !== 'number' || offerings < 0) {
      throw new RatingCalculationError('Invalid offerings amount');
    }
    if (typeof members !== 'number' || members <= 0) {
      throw new RatingCalculationError('Invalid church members count');
    }
    if (typeof attendees !== 'number' || attendees <= 0) {
      throw new RatingCalculationError('Invalid attendees count');
    }

    // Handle edge cases - return 0 instead of 1 for better data quality
    if (members === 0 || attendees === 0) return 0;
    if (offerings === 0) return 1;
    
    // Calculate ratios
    const perMemberRatio = offerings / members;
    const perAttendeeRatio = offerings / attendees;
    const avgRatio = (perMemberRatio + perAttendeeRatio) / 2;

    // Define thresholds for Romanian context (in RON)
    const thresholds = {
      poor: 10,        // Less than 10 RON per person
      belowAvg: 25,    // 10-25 RON per person
      avg: 50,         // 25-50 RON per person
      good: 100,       // 50-100 RON per person
      excellent: 100   // More than 100 RON per person
    };
    
    // Calculate score based on thresholds
    let score = 1;
    if (avgRatio >= thresholds.excellent) score = 5;
    else if (avgRatio >= thresholds.good) score = 4;
    else if (avgRatio >= thresholds.avg) score = 3;
    else if (avgRatio >= thresholds.belowAvg) score = 2;
    
    // Log financial calculation for monitoring
    logger.debug('Financial score calculated', {
      offerings,
      members,
      attendees,
      avgRatio: Math.round(avgRatio * 100) / 100,
      score
    });
    
    return score;
  }

  /**
   * Get rating description in Romanian for mission openness
   */
  getMissionOpennessDescription(rating: number): string {
    const descriptions = {
      1: "Resistent la lucrarea de misiune, nu este interesat de outreach",
      2: "Interes minim, doar cooperare de bază",
      3: "Interes moderat, conștientizare de misiune",
      4: "Interes activ în lucrarea de misiune, cooperare bună",
      5: "Foarte orientat spre misiune, proactiv în evanghelizare"
    };
    return descriptions[rating as keyof typeof descriptions] || "";
  }

  /**
   * Get rating description in Romanian for hospitality
   */
  getHospitalityDescription(rating: number): string {
    const descriptions = {
      1: "Neospitalier, necooperant, mediu ostil",
      2: "Ospitalitate minimală, doar curtoazie de bază",
      3: "Ospitalitate standard, îndeplinește așteptările de bază",
      4: "Atmosferă primitoare, cooperare bună",
      5: "Ospitalitate excepțională, depășește așteptările"
    };
    return descriptions[rating as keyof typeof descriptions] || "";
  }
}