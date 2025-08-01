import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateMethod } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { RccpRegion } from '@shared/schema';

interface RegionsResponse {
  success?: boolean;
  data?: RccpRegion[];
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<RegionsResponse | RccpRegion[]>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;

  switch (req.method) {
    case 'GET':
      return handleGetRegions(req, res, userId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET` 
      });
  }
}

async function handleGetRegions(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<RegionsResponse | RccpRegion[]>,
  userId: string
) {
  logServerlessFunction('regions-get', 'GET', userId);

  try {
    const regions = await serverlessStorage.getRccpRegions();

    logServerlessFunction('regions-get', 'GET', userId, { 
      count: regions.length
    });

    // Return regions array directly
    return res.status(200).json(regions);

  } catch (error) {
    logServerlessFunction('regions-get', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);