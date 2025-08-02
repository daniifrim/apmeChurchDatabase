import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError } from '../../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { ChurchStarRating } from '@shared/schema';

interface StarRatingResponse {
  success?: boolean;
  data?: any;
  message?: string;
  messageRo?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<StarRatingResponse>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;
  const churchId = parseInt(req.query.id as string);

  if (isNaN(churchId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid church ID'
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
        message: `Method ${req.method} not allowed. Allowed methods: GET, PUT` 
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
    // Verify church exists
    const church = await serverlessStorage.getChurchById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        message: 'Church not found',
        messageRo: 'Biserica nu a fost găsită'
      });
    }

    // Get church star rating
    const starRating = await serverlessStorage.getChurchStarRating(churchId);

    if (!starRating) {
      return res.status(200).json({
        success: true,
        data: {
          churchId,
          churchName: church.name,
          hasRatings: false,
          averageStars: 0,
          totalVisits: 0,
          message: 'No ratings available for this church',
          messageRo: 'Nu există evaluări disponibile pentru această biserică'
        }
      });
    }

    logServerlessFunction('church-star-rating-get', 'GET', userId, { 
      churchId,
      averageStars: starRating.averageStars
    });

    return res.status(200).json({
      success: true,
      data: {
        churchId,
        churchName: church.name,
        hasRatings: true,
        averageStars: Number(starRating.averageStars),
        totalVisits: starRating.totalVisits,
        visitsLast30Days: starRating.visitsLast30Days,
        visitsLast90Days: starRating.visitsLast90Days,
        ratingBreakdown: {
          missionOpenness: Number(starRating.avgMissionOpenness),
          hospitality: Number(starRating.avgHospitality),
          financialGenerosity: Number(starRating.avgFinancialGenerosity),
          missionarySupport: Number(starRating.avgMissionarySupport)
        },
        financialSummary: {
          totalOfferingsCollected: Number(starRating.totalOfferingsCollected),
          avgOfferingsPerVisit: Number(starRating.avgOfferingsPerVisit)
        },
        lastVisitDate: starRating.lastVisitDate,
        lastCalculated: starRating.lastCalculated
      }
    });

  } catch (error) {
    logServerlessFunction('church-star-rating-get', 'GET', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
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
    // Check if user is admin
    if (req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        messageRo: 'Acces interzis - doar administratorii pot recalcula evaluările'
      });
    }

    // Verify church exists
    const church = await serverlessStorage.getChurchById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        message: 'Church not found',
        messageRo: 'Biserica nu a fost găsită'
      });
    }

    // Trigger recalculation
    await serverlessStorage.recalculateChurchRating(churchId);

    // Get updated rating
    const updatedRating = await serverlessStorage.getChurchStarRating(churchId);

    // Create activity for recalculation
    await serverlessStorage.createActivity({
      churchId,
      userId,
      type: 'note',
      title: 'Rating recalculated',
      description: `Church star rating was manually recalculated`,
      activityDate: new Date(),
    });

    logServerlessFunction('church-star-rating-recalculate', 'PUT', userId, { 
      churchId,
      newAverageStars: updatedRating?.averageStars
    });

    return res.status(200).json({
      success: true,
      message: 'Church rating recalculated successfully',
      messageRo: 'Evaluarea bisericii a fost recalculată cu succes',
      data: {
        churchId,
        churchName: church.name,
        updatedRating: updatedRating ? {
          averageStars: Number(updatedRating.averageStars),
          totalVisits: updatedRating.totalVisits,
          lastCalculated: updatedRating.lastCalculated
        } : null
      }
    });

  } catch (error) {
    logServerlessFunction('church-star-rating-recalculate', 'PUT', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);