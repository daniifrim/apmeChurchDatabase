import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError, validateRequestBody } from '../../../lib/errorHandler';
import { handleRatingError, withDatabaseErrorHandling } from '../../../lib/rating-error-handler';
import { createVisitRatingSchema, validateRequest, sanitizeInput } from '../../../lib/rating-validation';
import { withRateLimit, rateLimiters } from '../../../lib/rate-limiter';
import { triggerRatingRecalculation, withAutoRecalculation } from '../../../lib/rating-triggers';
import { handleCors, logServerlessFunction } from '../../../lib/utils';
import { createRatingRequestSchema } from '@shared/schema';
import { RatingCalculationService } from '../../../lib/rating-calculation';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { VisitRating, CreateRatingRequest } from '@shared/schema';

const ratingCalculator = new RatingCalculationService();

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
  try {
    // Handle CORS
    if (handleCors(req, res)) return;

    const userId = req.user.sub;
    const visitId = parseInt(req.query.id as string);

    if (isNaN(visitId) || visitId <= 0) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_VISIT_ID',
        message: 'Invalid visit ID',
        messageRo: 'ID vizită invalid'
      });
    }

    // Apply rate limiting based on method
    let rateLimitResult;
    if (req.method === 'GET') {
      rateLimitResult = rateLimiters.rating.check(req);
    } else if (req.method === 'POST') {
      rateLimitResult = rateLimiters.admin.check(req); // More restrictive for creating ratings
    } else {
      rateLimitResult = rateLimiters.default.check(req);
    }

    // Set rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        messageRo: 'Prea multe cereri, vă rugăm să încercați din nou mai târziu',
        retryAfter: rateLimitResult.headers['Retry-After']
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
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${req.method} not allowed. Allowed methods: GET, POST`,
          messageRo: `Metoda ${req.method} nu este permisă. Metode permise: GET, POST`
        });
    }
  } catch (error) {
    return handleRatingError(error, res, {
      endpoint: 'visit-rating',
      method: req.method,
      visitId: req.query.id,
      userId: req.user?.sub
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
    // Get visit rating with database error handling
    const rating = await withDatabaseErrorHandling(
      () => serverlessStorage.getVisitRating(visitId),
      'get visit rating',
      { visitId, userId }
    );

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

    // Sanitize and return rating with additional context
    const sanitizedRating = {
      ...rating,
      notes: sanitizeInput(rating.notes || ''),
      breakdown: {
        missionOpenness: rating.missionOpennessRating,
        hospitality: rating.hospitalityRating,
        financial: Math.max(0, Number(rating.financialScore)),
        missionaryBonus: Math.max(0, Number(rating.missionaryBonus))
      },
      descriptions: {
        missionOpenness: ratingCalculator.getMissionOpennessDescription(rating.missionOpennessRating),
        hospitality: ratingCalculator.getHospitalityDescription(rating.hospitalityRating)
      }
    };

    return res.status(200).json({
      success: true,
      data: sanitizedRating
    });

  } catch (error) {
    logServerlessFunction('visit-rating-get', 'GET', userId, { 
      visitId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleRatingError(error, res, {
      operation: 'get-visit-rating',
      visitId,
      userId
    });
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
    // Get visit details with database error handling
    const visit = await withDatabaseErrorHandling(
      () => serverlessStorage.getVisitById(visitId),
      'get visit by ID',
      { visitId, userId }
    );
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found',
        messageRo: 'Vizita nu a fost găsită'
      });
    }

    // Check if visit is already rated with database error handling
    const existingRating = await withDatabaseErrorHandling(
      () => serverlessStorage.getVisitRating(visitId),
      'check existing visit rating',
      { visitId, userId }
    );
    if (existingRating) {
      return res.status(409).json({
        success: false,
        message: 'This visit has already been rated',
        messageRo: 'Această vizită a fost deja evaluată'
      });
    }

    // Validate request body with enhanced validation
    const ratingData = validateRequest(
      createVisitRatingSchema,
      {
        ...req.body,
        visitId,
        missionaryId: userId
      },
      'Invalid visit rating data'
    );

    // Use attendees count from visit if not provided in rating
    const attendeesCount = ratingData.attendeesCount || visit.attendeesCount || 1;

    // Additional business logic validation
    if (visit.isRated) {
      return res.status(409).json({
        success: false,
        code: 'VISIT_ALREADY_RATED',
        message: 'This visit has already been rated',
        messageRo: 'Această vizită a fost deja evaluată'
      });
    }

    // Check if user can rate this visit (same user or admin)
    if (visit.visitedBy !== userId && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        code: 'UNAUTHORIZED_RATING',
        message: 'You can only rate visits you conducted',
        messageRo: 'Puteți evalua doar vizitele pe care le-ați efectuat'
      });
    }

    // Wrap the entire rating creation process with auto-recalculation
    const result = await withAutoRecalculation(
      async () => {
        // Calculate rating
        const calculatedRating = ratingCalculator.calculateVisitRating({
          ...ratingData,
          attendeesCount
        });

        // Create rating with database error handling
        const newRating = await withDatabaseErrorHandling(
          () => serverlessStorage.createVisitRating({
            visitId,
            missionaryId: userId,
            missionOpennessRating: ratingData.missionOpennessRating,
            hospitalityRating: ratingData.hospitalityRating,
            missionarySupportCount: ratingData.missionarySupportCount,
            offeringsAmount: ratingData.offeringsAmount,
            churchMembers: ratingData.churchMembers,
            visitDurationMinutes: ratingData.visitDurationMinutes,
            notes: sanitizeInput(ratingData.notes || ''),
            attendeesCount
          }, calculatedRating),
          'create visit rating',
          { visitId, userId, churchId: visit.churchId }
        );

        // Create activity for rating creation with database error handling
        await withDatabaseErrorHandling(
          () => serverlessStorage.createActivity({
            churchId: visit.churchId,
            userId,
            type: 'visit',
            title: 'Visit rated',
            description: sanitizeInput(`Visit rated with ${calculatedRating.starRating} stars`),
            activityDate: new Date(),
          }),
          'create visit rating activity',
          { visitId, userId, churchId: visit.churchId }
        );

        return { newRating, calculatedRating };
      },
      {
        churchId: visit.churchId,
        operationType: 'create',
        visitId,
        userId,
        reason: 'visit rating created'
      }
    );

    // Get updated church rating with database error handling
    const churchRating = await withDatabaseErrorHandling(
      () => serverlessStorage.getChurchStarRating(visit.churchId),
      'get updated church star rating',
      { churchId: visit.churchId, visitId, userId }
    );

    logServerlessFunction('visit-rating-create', 'POST', userId, { 
      visitId,
      starRating: calculatedRating.starRating,
      churchId: visit.churchId
    });

    // Sanitize response data
    const responseData = {
      rating: {
        ...result.newRating,
        notes: sanitizeInput(result.newRating.notes || '')
      },
      calculatedStarRating: Math.max(1, Math.min(5, result.calculatedRating.starRating)),
      churchAverageStars: churchRating ? 
        Math.max(0, Math.min(5, Number(churchRating.averageStars))) : 
        result.calculatedRating.starRating,
      breakdown: {
        missionOpenness: Math.max(1, Math.min(5, result.calculatedRating.breakdown.missionOpenness)),
        hospitality: Math.max(1, Math.min(5, result.calculatedRating.breakdown.hospitality)),
        financial: Math.max(0, Math.min(5, result.calculatedRating.breakdown.financial)),
        missionaryBonus: Math.max(0, result.calculatedRating.breakdown.missionaryBonus)
      },
      autoRecalculationTriggered: true
    };

    return res.status(201).json({
      success: true,
      message: 'Rating created successfully and church rating updated',
      messageRo: 'Evaluarea a fost creată cu succes și evaluarea bisericii a fost actualizată',
      data: responseData
    });

  } catch (error) {
    logServerlessFunction('visit-rating-create', 'POST', userId, { 
      visitId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleRatingError(error, res, {
      operation: 'create-visit-rating',
      visitId,
      userId
    });
  }
}

export default withAuth(handler);