import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';

interface AnalyticsResponse {
  success?: boolean;
  data?: any;
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<AnalyticsResponse>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} not allowed. Allowed methods: GET` 
    });
  }

  const { type } = req.query;

  switch (type) {
    case 'top-churches':
      return handleGetTopRatedChurches(req, res, userId);
    case 'statistics':
      return handleGetRatingStatistics(req, res, userId);
    case 'recent':
      return handleGetRecentlyActiveChurches(req, res, userId);
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid analytics type. Allowed types: top-churches, statistics, recent'
      });
  }
}

async function handleGetTopRatedChurches(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<AnalyticsResponse>,
  userId: string
) {
  logServerlessFunction('ratings-analytics-top', 'GET', userId);

  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const topChurches = await serverlessStorage.getTopRatedChurches(limit, offset);

    logServerlessFunction('ratings-analytics-top', 'GET', userId, { 
      count: topChurches.length,
      limit,
      offset
    });

    return res.status(200).json({
      success: true,
      data: topChurches,
      pagination: {
        limit,
        offset,
        hasMore: topChurches.length === limit
      }
    });

  } catch (error) {
    logServerlessFunction('ratings-analytics-top', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleGetRatingStatistics(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<AnalyticsResponse>,
  userId: string
) {
  logServerlessFunction('ratings-analytics-stats', 'GET', userId);

  try {
    const statistics = await serverlessStorage.getRatingStatistics();

    logServerlessFunction('ratings-analytics-stats', 'GET', userId, { 
      totalRatedChurches: statistics.totalRatedChurches,
      averageRating: statistics.averageRating
    });

    return res.status(200).json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logServerlessFunction('ratings-analytics-stats', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleGetRecentlyActiveChurches(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<AnalyticsResponse>,
  userId: string
) {
  logServerlessFunction('ratings-analytics-recent', 'GET', userId);

  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const recentChurches = await serverlessStorage.getRecentlyActiveChurches(limit);

    logServerlessFunction('ratings-analytics-recent', 'GET', userId, { 
      count: recentChurches.length,
      limit
    });

    return res.status(200).json({
      success: true,
      data: recentChurches
    });

  } catch (error) {
    logServerlessFunction('ratings-analytics-recent', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);