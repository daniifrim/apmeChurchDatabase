import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError, validateRequestBody } from '../../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../../lib/utils';
import { createRatingRequestSchema } from '@shared/schema';
import { RatingCalculationService } from '../../../lib/rating-calculation';
import { RatingValidationService } from '../../../lib/rating-validation';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { VisitRating, CreateRatingRequest } from '@shared/schema';

const ratingCalculator = new RatingCalculationService();
const ratingValidator = new RatingValidationService();

interface RatingResponse {
  success?: boolean;
  data?: any;
  message?: string;
  messageRo?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<RatingResponse | VisitRating>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;
  const visitId = parseInt(req.query.id as string);

  if (isNaN(visitId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid visit ID'
    });
  }

  switch (req.method) {
    case 'GET':
      return handleGetVisitRating(req, res, userId, visitId);
    case 'POST':
      return handleCreateVisitRating(req, res, userId, visitId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET, POST` 
      });
  }
}

async function handleGetVisitRating(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<RatingResponse | VisitRating>,
  userId: string,
  visitId: number
) {
  logServerlessFunction('visit-rating-get', 'GET', userId, { visitId });

  try {
    const rating = await serverlessStorage.getVisitRating(visitId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
        messageRo: 'Evaluarea nu a fost găsită'
      });
    }

    logServerlessFunction('visit-rating-get', 'GET', userId, { 
      visitId,
      starRating: rating.calculatedStarRating
    });

    // Return rating with additional context
    return res.status(200).json({
      success: true,
      data: {
        ...rating,
        breakdown: {
          missionOpenness: rating.missionOpennessRating,
          hospitality: rating.hospitalityRating,
          financial: Number(rating.financialScore),
          missionaryBonus: Number(rating.missionaryBonus)
        },
        descriptions: {
          missionOpenness: ratingCalculator.getMissionOpennessDescription(rating.missionOpennessRating),
          hospitality: ratingCalculator.getHospitalityDescription(rating.hospitalityRating)
        }
      }
    });

  } catch (error) {
    logServerlessFunction('visit-rating-get', 'GET', userId, { 
      visitId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleCreateVisitRating(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<RatingResponse>,
  userId: string,
  visitId: number
) {
  logServerlessFunction('visit-rating-create', 'POST', userId, { visitId });

  try {
    // Get visit details
    const visit = await serverlessStorage.getVisitById(visitId);
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found',
        messageRo: 'Vizita nu a fost găsită'
      });
    }

    // Check if visit is already rated
    const existingRating = await serverlessStorage.getVisitRating(visitId);
    if (existingRating) {
      return res.status(409).json({
        success: false,
        message: 'This visit has already been rated',
        messageRo: 'Această vizită a fost deja evaluată'
      });
    }

    // Validate request body
    const ratingData = validateRequestBody(req.body, createRatingRequestSchema);

    // Use attendees count from visit if not provided in rating
    const attendeesCount = ratingData.attendeesCount || visit.attendeesCount || 1;

    // Validate visit can be rated
    const visitValidation = ratingValidator.validateVisitForRating(
      visitId,
      visit.isRated || false,
      userId,
      visit.visitedBy
    );

    if (!visitValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Cannot rate this visit',
        messageRo: 'Nu se poate evalua această vizită',
        errors: visitValidation.errors.map(e => ({
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
        success: false,
        message: 'Invalid rating data',
        messageRo: 'Date de evaluare invalide',
        errors: dataValidation.errors.map(e => ({
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

    // Create rating
    const newRating = await serverlessStorage.createVisitRating({
      visitId,
      missionaryId: userId,
      missionOpennessRating: ratingData.missionOpennessRating,
      hospitalityRating: ratingData.hospitalityRating,
      missionarySupportCount: ratingData.missionarySupportCount,
      offeringsAmount: ratingData.offeringsAmount,
      churchMembers: ratingData.churchMembers,
      visitDurationMinutes: ratingData.visitDurationMinutes,
      notes: ratingData.notes,
    }, calculatedRating);

    // Create activity for rating creation
    await serverlessStorage.createActivity({
      churchId: visit.churchId,
      userId,
      type: 'visit',
      title: 'Visit rated',
      description: `Visit rated with ${calculatedRating.starRating} stars`,
      activityDate: new Date(),
    });

    // Get updated church rating
    const churchRating = await serverlessStorage.getChurchStarRating(visit.churchId);

    logServerlessFunction('visit-rating-create', 'POST', userId, { 
      visitId,
      starRating: calculatedRating.starRating,
      churchId: visit.churchId
    });

    return res.status(201).json({
      success: true,
      message: 'Rating created successfully',
      messageRo: 'Evaluarea a fost creată cu succes',
      data: {
        rating: newRating,
        calculatedStarRating: calculatedRating.starRating,
        churchAverageStars: churchRating?.averageStars || calculatedRating.starRating,
        breakdown: calculatedRating.breakdown
      }
    });

  } catch (error) {
    logServerlessFunction('visit-rating-create', 'POST', userId, { 
      visitId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);