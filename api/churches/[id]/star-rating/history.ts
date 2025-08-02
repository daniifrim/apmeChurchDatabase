import { withAuth } from '../../../../lib/auth';
import { serverlessStorage } from '../../../../lib/storage';
import { handleServerlessError } from '../../../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../../../lib/types';
import type { JWTPayload } from '../../../../lib/auth';

interface RatingHistoryResponse {
  success?: boolean;
  data?: any;
  message?: string;
  messageRo?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<RatingHistoryResponse>
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

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} not allowed. Allowed methods: GET` 
    });
  }

  return handleGetChurchRatingHistory(req, res, userId, churchId);
}

async function handleGetChurchRatingHistory(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<RatingHistoryResponse>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('church-rating-history', 'GET', userId, { churchId });

  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify church exists
    const church = await serverlessStorage.getChurchById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        message: 'Church not found',
        messageRo: 'Biserica nu a fost găsită'
      });
    }

    // Get rating history
    const ratingHistory = await serverlessStorage.getChurchRatingHistory(churchId, limit, offset);

    logServerlessFunction('church-rating-history', 'GET', userId, { 
      churchId,
      ratingsCount: ratingHistory.length
    });

    return res.status(200).json({
      success: true,
      data: {
        churchId,
        churchName: church.name,
        ratings: ratingHistory,
        pagination: {
          limit,
          offset,
          hasMore: ratingHistory.length === limit
        }
      }
    });

  } catch (error) {
    logServerlessFunction('church-rating-history', 'GET', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);