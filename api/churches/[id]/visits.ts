import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseNumericParam } from '../../../lib/utils';
import { insertVisitSchema, createRatingRequestSchema } from '@shared/schema';
import { RatingCalculationService } from '../../../lib/rating-calculation';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { Visit, InsertVisit, CreateRatingRequest } from '@shared/schema';
import { z } from 'zod';

interface VisitsResponse {
  success?: boolean;
  data?: Visit[] | Visit | any;
  message?: string;
  errors?: any;
}

const ratingCalculator = new RatingCalculationService();

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitsResponse | Visit[] | Visit>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;
  const churchId = parseNumericParam(req.query.id);

  if (!churchId) {
    return res.status(400).json({
      success: false,
      message: 'Invalid church ID'
    });
  }

  switch (req.method) {
    case 'GET':
      return handleGetVisits(req, res, userId, churchId);
    case 'POST':
      return handleCreateVisit(req, res, userId, churchId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET, POST` 
      });
  }
}

async function handleGetVisits(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitsResponse | Visit[]>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('visits-get', 'GET', userId, { churchId });

  try {
    // Verify church exists
    const church = await serverlessStorage.getChurchById(churchId);
    if (!church) {
      logServerlessFunction('visits-get', 'GET', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    const visits = await serverlessStorage.getVisitsByChurch(churchId);

    logServerlessFunction('visits-get', 'GET', userId, { 
      churchId,
      visitCount: visits.length
    });

    // Return visits array directly (matching existing API contract)
    return res.status(200).json(visits);

  } catch (error) {
    logServerlessFunction('visits-get', 'GET', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleCreateVisit(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitsResponse | Visit>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('visits-create', 'POST', userId, { churchId });

  try {
    // Verify church exists
    const church = await serverlessStorage.getChurchById(churchId);
    if (!church) {
      logServerlessFunction('visits-create', 'POST', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    // Extract rating data if provided
    const { rating, ...visitPayload } = req.body;
    
    // Validate and parse visit data
    const visitData = validateRequestBody({
      ...visitPayload,
      churchId,
      visitedBy: userId,
    }, insertVisitSchema);

    // Create the visit
    const visit = await serverlessStorage.createVisit(visitData);

    let calculatedRating = null;

    // If rating data is provided, create the rating
    if (rating && rating.missionOpennessRating > 0 && rating.hospitalityRating > 0) {
      try {
        // Validate rating data
        const ratingData = validateRequestBody(rating, createRatingRequestSchema);
        
        // Calculate the star rating
        const ratingResult = ratingCalculator.calculateVisitRating({
          missionOpennessRating: ratingData.missionOpennessRating,
          hospitalityRating: ratingData.hospitalityRating,
          missionarySupportCount: ratingData.missionarySupportCount,
          offeringsAmount: ratingData.offeringsAmount,
          churchMembers: ratingData.churchMembers,
          attendeesCount: ratingData.attendeesCount,
          visitDurationMinutes: ratingData.visitDurationMinutes,
          notes: ratingData.notes,
        });

        // Create the visit rating
        const visitRating = await serverlessStorage.createVisitRating({
          visitId: visit.id,
          missionaryId: userId,
          missionOpennessRating: ratingData.missionOpennessRating,
          hospitalityRating: ratingData.hospitalityRating,
          missionarySupportCount: ratingData.missionarySupportCount,
          offeringsAmount: ratingData.offeringsAmount,
          churchMembers: ratingData.churchMembers,
          attendeesCount: ratingData.attendeesCount,
          visitDurationMinutes: ratingData.visitDurationMinutes,
          notes: ratingData.notes,
        }, {
          financialScore: ratingResult.financialScore,
          missionaryBonus: ratingResult.missionaryBonus,
          starRating: ratingResult.calculatedStarRating,
        });

        // Update visit to mark it as rated
        await serverlessStorage.updateVisit(visit.id, { isRated: true });

        calculatedRating = {
          calculatedStarRating: ratingResult.calculatedStarRating,
          financialScore: ratingResult.financialScore,
          missionaryBonus: ratingResult.missionaryBonus,
        };

        logServerlessFunction('visits-create', 'POST', userId, { 
          churchId,
          visitId: visit.id,
          starRating: ratingResult.calculatedStarRating
        });

      } catch (ratingError) {
        // Log the rating error but don't fail the visit creation
        logServerlessFunction('visits-create', 'POST', userId, { 
          churchId,
          visitId: visit.id,
          ratingError: ratingError instanceof Error ? ratingError.message : 'Unknown rating error'
        });
      }
    }

    // Create activity for visit
    await serverlessStorage.createActivity({
      churchId,
      userId,
      type: 'visit',
      title: 'Church visit completed',
      description: visitData.notes || 'Church visit was completed',
      activityDate: visitData.visitDate,
    });

    logServerlessFunction('visits-create', 'POST', userId, { 
      churchId,
      visitId: visit.id,
      visitDate: visitData.visitDate,
      hasRating: !!calculatedRating
    });

    // Return enhanced response with rating info if available
    const response = {
      ...visit,
      ...(calculatedRating && { rating: calculatedRating })
    };

    return res.status(201).json(response);

  } catch (error) {
    logServerlessFunction('visits-create', 'POST', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);