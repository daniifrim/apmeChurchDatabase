import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseNumericParam } from '../../../lib/utils';
import { insertVisitSchema } from '@shared/schema';
// import { createRatingRequestSchema } from '@shared/schema';
// import { RatingCalculationService } from '../../../lib/rating-calculation';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { Visit, InsertVisit } from '@shared/schema';
// import type { CreateRatingRequest } from '@shared/schema';
import { z } from 'zod';

interface VisitsResponse {
  success?: boolean;
  data?: Visit[] | Visit | any;
  message?: string;
  errors?: any;
}

// Remove module-level instantiation to avoid import-time errors

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitsResponse | Visit[] | Visit>
) {
  console.log('=== HANDLER START ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('User:', req.user);
  
  try {
    // Handle CORS
    if (handleCors(req, res)) {
      console.log('CORS handled, returning');
      return;
    }

    const userId = req.user.sub;
    const churchId = parseNumericParam(req.query.id);
    
    console.log('Parsed churchId:', churchId);

    if (!churchId) {
      console.log('Invalid churchId, returning 400');
      return res.status(400).json({
        success: false,
        message: 'Invalid church ID'
      });
    }

    console.log('About to switch on method:', req.method);
    
    switch (req.method) {
      case 'GET':
        console.log('Calling handleGetVisits');
        return handleGetVisits(req, res, userId, churchId);
      case 'POST':
        console.log('Calling handleCreateVisit');
        return handleCreateVisit(req, res, userId, churchId);
      default:
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${req.method} not allowed. Allowed methods: GET, POST` 
        });
    }
  } catch (error) {
    console.error('=== ERROR in main handler ===');
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Handler error',
      error: String(error)
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
  console.log('🚀🚀🚀 POST /api/churches/[id]/visits - DETAILED DEBUG 🚀🚀🚀');
  console.log('🚀 Church ID:', churchId, '(type:', typeof churchId, ')');
  console.log('🚀 User ID:', userId, '(type:', typeof userId, ')');
  console.log('🚀 User role:', req.user.role);
  console.log('🚀 Request body RAW:', JSON.stringify(req.body, null, 2));
  console.log('🚀 Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('🚀 Request method:', req.method);
  console.log('🚀 Request query:', JSON.stringify(req.query, null, 2));

  try {
    // Verify church exists
    console.log('🚀 Verifying church exists with ID:', churchId);
    const church = await serverlessStorage.getChurchById(churchId);
    console.log('🚀 Church found:', !!church);
    if (church) {
      console.log('🚀 Church data:', JSON.stringify({ id: church.id, name: church.name }, null, 2));
    }
    
    if (!church) {
      console.log('🚀 ERROR: Church not found for ID:', churchId);
      logServerlessFunction('visits-create', 'POST', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    // Extract rating data if provided
    console.log('🚀 Extracting rating data from body');
    const { rating, ...visitPayload } = req.body;
    console.log('🚀 Rating data:', JSON.stringify(rating, null, 2));
    console.log('🚀 Visit payload:', JSON.stringify(visitPayload, null, 2));
    
    // Validate and parse visit data
    console.log('🚀 About to validate visit data with schema');
    const dataToValidate = {
      ...visitPayload,
      churchId,
      visitedBy: userId,
    };
    console.log('🚀 Data to validate:', JSON.stringify(dataToValidate, null, 2));
    
    const visitData = validateRequestBody(dataToValidate, insertVisitSchema);
    console.log('🚀 Validation SUCCESS - processed visit data:', JSON.stringify(visitData, null, 2));

    // Create the visit
    const visit = await serverlessStorage.createVisit(visitData);

    let calculatedRating = null;

    // If rating data is provided, create the rating
    // TEMPORARILY DISABLED FOR DEBUGGING
    /*
    if (rating && rating.missionOpennessRating > 0 && rating.hospitalityRating > 0) {
      try {
        // Validate rating data
        const ratingData = validateRequestBody(rating, createRatingRequestSchema);
        
        // Calculate the star rating
        const ratingCalculator = new RatingCalculationService();
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
          starRating: ratingResult.starRating,
        });

        // Update visit to mark it as rated
        await serverlessStorage.updateVisit(visit.id, { isRated: true });

        calculatedRating = {
          calculatedStarRating: ratingResult.starRating,
          financialScore: ratingResult.financialScore,
          missionaryBonus: ratingResult.missionaryBonus,
        };

        logServerlessFunction('visits-create', 'POST', userId, { 
          churchId,
          visitId: visit.id,
          starRating: ratingResult.starRating
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
    */

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
    console.log('🚀🚀🚀 FATAL ERROR in POST /api/churches/[id]/visits 🚀🚀🚀');
    console.log('🚀 Error type:', typeof error);
    console.log('🚀 Error instanceof Error:', error instanceof Error);
    console.log('🚀 Error constructor name:', error?.constructor?.name);
    if (error instanceof Error) {
      console.log('🚀 Error message:', error.message);
      console.log('🚀 Error stack:', error.stack);
    } else {
      console.log('🚀 Raw error:', JSON.stringify(error, null, 2));
    }
    console.log('🚀 String representation:', String(error));
    
    logServerlessFunction('visits-create', 'POST', userId, { 
      churchId,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // In development, return detailed error
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        stack: error instanceof Error ? error.stack : undefined,
        fullError: JSON.stringify(error, null, 2)
      });
    }
    
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);