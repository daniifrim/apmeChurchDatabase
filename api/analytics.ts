import { withAuth } from '../lib/auth';
import { serverlessStorage } from '../lib/storage';
import { handleServerlessError, validateMethod } from '../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../lib/types';
import type { JWTPayload } from '../lib/auth';

interface AnalyticsData {
  totalChurches: number;
  activeChurches: number;
  pendingVisits: number;
  newThisMonth: number;
  engagementBreakdown: { level: string; count: number }[];
}

interface AnalyticsResponse {
  success?: boolean;
  data?: AnalyticsData;
  message?: string;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<AnalyticsResponse | AnalyticsData>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Validate HTTP method
  if (!validateMethod(req, res, ['GET'])) return;

  const userId = req.user.sub;
  logServerlessFunction('analytics', req.method!, userId);

  try {
    const analytics = await serverlessStorage.getAnalytics();

    logServerlessFunction('analytics', 'GET', userId, { 
      totalChurches: analytics.totalChurches,
      activeChurches: analytics.activeChurches,
      pendingVisits: analytics.pendingVisits,
      newThisMonth: analytics.newThisMonth
    });

    // Return analytics data directly (matching existing API contract)
    return res.status(200).json(analytics);

  } catch (error) {
    logServerlessFunction('analytics', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);