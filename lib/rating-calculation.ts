import { CreateRatingRequest, CalculatedRating } from "@shared/schema";

/**
 * Service for calculating church visit ratings using weighted formula
 */
export class RatingCalculationService {
  private readonly weights = {
    missionarySupport: 0.35,  // Highest weight - missionary support is most important
    missionOpenness: 0.25,    // Second priority - mission engagement
    financial: 0.25,          // Third priority - financial generosity
    hospitality: 0.15,        // Fourth priority - hospitality
  };

  /**
   * Calculate star rating for a visit based on input data
   */
  calculateVisitRating(data: CreateRatingRequest & { attendeesCount: number }): CalculatedRating {
    // Calculate financial score based on offerings per member/attendee
    const financialScore = this.calculateFinancialScore(
      data.offeringsAmount,
      data.churchMembers,
      data.attendeesCount
    );

    // Calculate missionary support bonus (max 2 points)
    const missionaryBonus = Math.min(data.missionarySupportCount * 0.5, 2);

    // Calculate weighted score
    const weightedScore = 
      (data.missionOpennessRating * this.weights.missionOpenness) +
      (data.hospitalityRating * this.weights.hospitality) +
      (financialScore * this.weights.financial) +
      (missionaryBonus * this.weights.missionarySupport);

    // Ensure rating is between 1-5 stars
    const starRating = Math.round(Math.min(Math.max(weightedScore, 1), 5));

    return {
      starRating,
      financialScore,
      missionaryBonus,
      breakdown: {
        missionOpenness: data.missionOpennessRating,
        hospitality: data.hospitalityRating,
        financial: financialScore,
        missionaryBonus,
      }
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
    // Handle edge cases
    if (members === 0 || attendees === 0) return 1;
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
    
    if (avgRatio < thresholds.poor) return 1;
    if (avgRatio < thresholds.belowAvg) return 2;
    if (avgRatio < thresholds.avg) return 3;
    if (avgRatio < thresholds.good) return 4;
    return 5;
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