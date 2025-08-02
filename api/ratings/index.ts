import { Request, Response } from "express";
import { db } from "@/server/db";
import { visits, visitRatings, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { RatingCalculationService } from "@/lib/rating-calculation";
import { RatingValidationService } from "@/lib/rating-validation";
import { ChurchRatingAggregator } from "@/lib/church-rating-aggregator";
import { createRatingRequestSchema, type CreateRatingRequest } from "@shared/schema";

const ratingCalculator = new RatingCalculationService();
const ratingValidator = new RatingValidationService();
const churchAggregator = new ChurchRatingAggregator();

/**
 * POST /api/ratings/visits/:visitId
 * Create a new rating for a visit
 */
export async function createVisitRating(req: Request, res: Response) {
  try {
    const visitId = parseInt(req.params.visitId);
    const missionaryId = req.user?.id;

    if (!missionaryId) {
      return res.status(401).json({ 
        error: "Authentication required",
        message: "Autentificare necesară" 
      });
    }

    // Validate request body
    const parseResult = createRatingRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        message: "Date de cerere invalide",
        details: parseResult.error.errors
      });
    }

    const ratingData = parseResult.data;

    // Get visit details
    const visit = await db
      .select({
        id: visits.id,
        churchId: visits.churchId,
        visitedBy: visits.visitedBy,
        isRated: visits.isRated,
        attendeesCount: visits.attendeesCount
      })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);

    if (visit.length === 0) {
      return res.status(404).json({
        error: "Visit not found",
        message: "Vizita nu a fost găsită"
      });
    }

    const visitData = visit[0];

    // Use attendees count from visit if not provided in rating
    const attendeesCount = ratingData.attendeesCount || visitData.attendeesCount || 1;

    // Validate visit can be rated
    const visitValidation = ratingValidator.validateVisitForRating(
      visitId,
      visitData.isRated,
      missionaryId,
      visitData.visitedBy
    );

    if (!visitValidation.isValid) {
      return res.status(400).json({
        error: "Cannot rate this visit",
        message: "Nu se poate evalua această vizită",
        details: visitValidation.errors.map(e => ({
          field: e.field,
          message: e.messageRo || e.message
        }))
      });
    }

    // Validate rating data
    const dataValidation = ratingValidator.validateRatingData({
      ...ratingData,
      attendeesCount
    });

    if (!dataValidation.isValid) {
      return res.status(400).json({
        error: "Invalid rating data",
        message: "Date de evaluare invalide",
        details: dataValidation.errors.map(e => ({
          field: e.field,
          message: e.messageRo || e.message
        }))
      });
    }

    // Calculate rating
    const calculatedRating = ratingCalculator.calculateVisitRating({
      ...ratingData,
      attendeesCount
    });

    // Save rating to database
    const newRating = await db
      .insert(visitRatings)
      .values({
        visitId,
        missionaryId,
        missionOpennessRating: ratingData.missionOpennessRating,
        hospitalityRating: ratingData.hospitalityRating,
        missionarySupportCount: ratingData.missionarySupportCount,
        offeringsAmount: ratingData.offeringsAmount.toString(),
        churchMembers: ratingData.churchMembers,
        financialScore: calculatedRating.financialScore.toString(),
        missionaryBonus: calculatedRating.missionaryBonus.toString(),
        calculatedStarRating: calculatedRating.starRating,
        visitDurationMinutes: ratingData.visitDurationMinutes,
        notes: ratingData.notes,
      })
      .returning();

    // Get updated church average (this is automatically calculated by the database trigger)
    const churchRating = await churchAggregator.getChurchStarRating(visitData.churchId);

    return res.status(201).json({
      success: true,
      message: "Rating created successfully",
      messageRo: "Evaluarea a fost creată cu succes",
      data: {
        rating: newRating[0],
        calculatedStarRating: calculatedRating.starRating,
        churchAverageStars: churchRating?.averageStars || calculatedRating.starRating,
        breakdown: calculatedRating.breakdown
      }
    });

  } catch (error) {
    console.error("Error creating visit rating:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Eroare internă de server"
    });
  }
}

/**
 * GET /api/ratings/visits/:visitId
 * Get rating for a specific visit
 */
export async function getVisitRating(req: Request, res: Response) {
  try {
    const visitId = parseInt(req.params.visitId);

    const rating = await db
      .select({
        id: visitRatings.id,
        visitId: visitRatings.visitId,
        missionaryId: visitRatings.missionaryId,
        missionOpennessRating: visitRatings.missionOpennessRating,
        hospitalityRating: visitRatings.hospitalityRating,
        missionarySupportCount: visitRatings.missionarySupportCount,
        offeringsAmount: visitRatings.offeringsAmount,
        churchMembers: visitRatings.churchMembers,
        financialScore: visitRatings.financialScore,
        missionaryBonus: visitRatings.missionaryBonus,
        calculatedStarRating: visitRatings.calculatedStarRating,
        visitDurationMinutes: visitRatings.visitDurationMinutes,
        notes: visitRatings.notes,
        createdAt: visitRatings.createdAt,
        // Include missionary name
        missionaryName: users.firstName,
        missionaryLastName: users.lastName
      })
      .from(visitRatings)
      .leftJoin(users, eq(visitRatings.missionaryId, users.id))
      .where(eq(visitRatings.visitId, visitId))
      .limit(1);

    if (rating.length === 0) {
      return res.status(404).json({
        error: "Rating not found",
        message: "Evaluarea nu a fost găsită"
      });
    }

    const ratingData = rating[0];

    return res.json({
      success: true,
      data: {
        ...ratingData,
        missionaryName: ratingData.missionaryName && ratingData.missionaryLastName 
          ? `${ratingData.missionaryName} ${ratingData.missionaryLastName}`
          : null,
        breakdown: {
          missionOpenness: ratingData.missionOpennessRating,
          hospitality: ratingData.hospitalityRating,
          financial: Number(ratingData.financialScore),
          missionaryBonus: Number(ratingData.missionaryBonus)
        },
        descriptions: {
          missionOpenness: ratingCalculator.getMissionOpennessDescription(ratingData.missionOpennessRating),
          hospitality: ratingCalculator.getHospitalityDescription(ratingData.hospitalityRating)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching visit rating:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Eroare internă de server"
    });
  }
}

/**
 * GET /api/ratings/analytics/top-churches
 * Get top-rated churches
 */
export async function getTopRatedChurches(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const topChurches = await churchAggregator.getTopRatedChurches(limit, offset);

    return res.json({
      success: true,
      data: topChurches,
      pagination: {
        limit,
        offset,
        hasMore: topChurches.length === limit
      }
    });

  } catch (error) {
    console.error("Error fetching top rated churches:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Eroare internă de server"
    });
  }
}

/**
 * GET /api/ratings/analytics/statistics
 * Get rating system statistics
 */
export async function getRatingStatistics(req: Request, res: Response) {
  try {
    const statistics = await churchAggregator.getRatingStatistics();

    return res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error("Error fetching rating statistics:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Eroare internă de server"
    });
  }
}

/**
 * GET /api/ratings/analytics/recent
 * Get recently active churches
 */
export async function getRecentlyActiveChurches(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const recentChurches = await churchAggregator.getRecentlyActiveChurches(limit);

    return res.json({
      success: true,
      data: recentChurches
    });

  } catch (error) {
    console.error("Error fetching recently active churches:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Eroare internă de server"
    });
  }
}