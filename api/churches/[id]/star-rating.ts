import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError } from '../../../lib/errorHandler';
import { handleRatingError, withDatabaseErrorHandling, NotFoundRatingError, UnauthorizedRatingError } from '../../../lib/rating-error-handler';
import { churchIdSchema, starRatingQuerySchema, recalculationRequestSchema, validateRequest, sanitizeInput } from '../../../lib/rating-validation';
import { withRateLimit, rateLimiters } from '../../../lib/rate-limiter';
import { handleCors, logServerlessFunction } from '../../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { ChurchStarRating } from '@shared/schema';

interface StarRatingResponse {
  success?: boolean;
  data?: ChurchStarRatingResponse;
  message?: string;
  messageRo?: string;
  errors?: any;
}

// Updated response interface for Version 2.0
interface ChurchStarRatingResponse {
  churchId: number;
  churchName: string;
  hasRatings: boolean;
  averageStars: number;
  missionarySupportCount: number; // Separate church-level metric
  totalVisits: number;
  visitsLast30Days?: number;
  visitsLast90Days?: number;
  ratingBreakdown: {
    missionOpenness: number;
    hospitality: number;
    financialGenerosity: number; // Only financial metric in breakdown
  };
  financialSummary?: {
    totalOfferingsCollected: number;
    avgOfferingsPerVisit: number;
  };
  lastVisitDate?: Date | string;
  lastCalculated?: Date | string;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<StarRatingResponse>
) {
  try {
    // Handle CORS
    if (handleCors(req, res)) return;

    // Validate church ID
    const validatedParams = validateRequest(churchIdSchema, { id: req.query.id }, 'Invalid church ID');
    const churchId = validatedParams.id;
    const userId = req.user.sub;

    // Apply appropriate rate limiting based on method
    let rateLimitResult;
    if (req.method === 'GET') {
      rateLimitResult = rateLimiters.rating.check(req);
    } else if (req.method === 'PUT') {
      rateLimitResult = rateLimiters.recalculation.check(req);
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
        return handleGetChurchStarRating(req, res, userId, churchId);
      case 'PUT':
        return handleRecalculateChurchRating(req, res, userId, churchId);
      default:
        return res.status(405).json({ 
          success: false, 
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${req.method} not allowed. Allowed methods: GET, PUT`,
          messageRo: `Metoda ${req.method} nu este permisă. Metode permise: GET, PUT`
        });
    }
  } catch (error) {
    return handleRatingError(error, res, {
      endpoint: 'star-rating',
      method: req.method,
      churchId: req.query.id,
      userId: req.user?.sub
    });
  }
}

async function handleGetChurchStarRating(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<StarRatingResponse>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('church-star-rating-get', 'GET', userId, { churchId });

  try {
    // Validate query parameters
    const queryParams = validateRequest(
      starRatingQuerySchema,
      req.query,
      'Invalid query parameters'
    );

    // Verify church exists with database error handling
    const church = await withDatabaseErrorHandling(
      () => serverlessStorage.getChurchById(churchId),
      'get church by ID',
      { churchId, userId }
    );
    
    if (!church) {
      throw new NotFoundRatingError('Church', 'Biserica nu a fost găsită');
    }

    // Get church star rating with database error handling
    const starRating = await withDatabaseErrorHandling(
      () => serverlessStorage.getChurchStarRating(churchId),
      'get church star rating',
      { churchId, userId }
    );

    if (!starRating) {
      return res.status(200).json({
        success: true,
        data: {
          churchId,
          churchName: sanitizeInput(church.name),
          hasRatings: false,
          averageStars: 0,
          missionarySupportCount: 0, // Separate church-level attribute
          totalVisits: 0,
          ratingBreakdown: {
            missionOpenness: 0,
            hospitality: 0,
            financialGenerosity: 0,
          }
        } as any
      });
    }

    logServerlessFunction('church-star-rating-get', 'GET', userId, { 
      churchId,
      averageStars: starRating.averageStars
    });

    // Sanitize and validate output data
    const responseData = {
      churchId,
      churchName: sanitizeInput(church.name),
      hasRatings: true,
      averageStars: Math.round(Number(starRating.averageStars || 0) * 10) / 10, // Round to 1 decimal
      totalVisits: Math.max(0, starRating.totalVisits || 0),
      visitsLast30Days: Math.max(0, starRating.visitsLast30Days || 0),
      visitsLast90Days: Math.max(0, starRating.visitsLast90Days || 0),
      missionarySupportCount: Math.max(0, starRating.missionarySupportCount || 0), // Separate church-level attribute
      ratingBreakdown: {
        missionOpenness: Math.round(Number(starRating.avgMissionOpenness || 0) * 100) / 100,
        hospitality: Math.round(Number(starRating.avgHospitality || 0) * 100) / 100,
        financialGenerosity: Math.round(Number(starRating.avgFinancialGenerosity || 0) * 100) / 100,
        // missionarySupport removed from breakdown in v2.0 - now separate
      },
      financialSummary: {
        totalOfferingsCollected: Math.max(0, Number(starRating.totalOfferingsCollected || 0)),
        avgOfferingsPerVisit: Math.round(Number(starRating.avgOfferingsPerVisit || 0) * 100) / 100
      },
      lastVisitDate: starRating.lastVisitDate,
      lastCalculated: starRating.lastCalculated
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logServerlessFunction('church-star-rating-get', 'GET', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleRatingError(error, res, {
      operation: 'get-church-star-rating',
      churchId,
      userId
    });
  }
}

async function handleRecalculateChurchRating(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<StarRatingResponse>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('church-star-rating-recalculate', 'PUT', userId, { churchId });

  try {
    // Validate request body
    const requestData = validateRequest(
      recalculationRequestSchema,
      req.body || {},
      'Invalid recalculation request'
    );

    // Check if user is admin
    if (req.user.role !== 'administrator') {
      throw new UnauthorizedRatingError(
        'Access denied - only administrators can recalculate ratings',
        'Acces interzis - doar administratorii pot recalcula evaluările'
      );
    }

    // Verify church exists with database error handling
    const church = await withDatabaseErrorHandling(
      () => serverlessStorage.getChurchById(churchId),
      'get church by ID for recalculation',
      { churchId, userId }
    );
    
    if (!church) {
      throw new NotFoundRatingError('Church', 'Biserica nu a fost găsită');
    }

    // Trigger recalculation with database error handling
    await withDatabaseErrorHandling(
      () => serverlessStorage.recalculateChurchRating(churchId),
      'recalculate church rating',
      { churchId, userId, forceRecalculation: requestData.forceRecalculation }
    );

    // Get updated rating with database error handling
    const updatedRating = await withDatabaseErrorHandling(
      () => serverlessStorage.getChurchStarRating(churchId),
      'get updated church star rating',
      { churchId, userId }
    );

    // Create activity for recalculation with database error handling
    await withDatabaseErrorHandling(
      () => serverlessStorage.createActivity({
        churchId,
        userId,
        type: 'note',
        title: 'Rating recalculated',
        description: sanitizeInput(`Church star rating was manually recalculated${requestData.forceRecalculation ? ' (forced)' : ''}`),
        activityDate: new Date(),
      }),
      'create recalculation activity',
      { churchId, userId }
    );

    logServerlessFunction('church-star-rating-recalculate', 'PUT', userId, { 
      churchId,
      newAverageStars: updatedRating?.averageStars
    });

    // Sanitize and validate response data
    const responseData = {
      churchId,
      churchName: sanitizeInput(church.name),
      updatedRating: updatedRating ? {
        averageStars: Math.round(Number(updatedRating.averageStars || 0) * 10) / 10,
        totalVisits: Math.max(0, updatedRating.totalVisits || 0),
        lastCalculated: updatedRating.lastCalculated
      } : null
    };

    return res.status(200).json({
      success: true,
      message: 'Church rating recalculated successfully',
      messageRo: 'Evaluarea bisericii a fost recalculată cu succes',
      data: responseData
    });

  } catch (error) {
    logServerlessFunction('church-star-rating-recalculate', 'PUT', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleRatingError(error, res, {
      operation: 'recalculate-church-rating',
      churchId,
      userId
    });
  }
}

export default withAuth(handler);