import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateMethod } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseQueryParam } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { County } from '@shared/schema';

interface CountiesResponse {
  success?: boolean;
  data?: County[];
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<CountiesResponse | County[]>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;

  switch (req.method) {
    case 'GET':
      return handleGetCounties(req, res, userId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET` 
      });
  }
}

async function handleGetCounties(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<CountiesResponse | County[]>,
  userId: string
) {
  logServerlessFunction('counties-get', 'GET', userId);

  try {
    // Parse query parameters
    const regionId = parseQueryParam(req.query.regionId);

    const counties = await serverlessStorage.getCounties({
      regionId: regionId ? parseInt(regionId) : undefined,
    });

    logServerlessFunction('counties-get', 'GET', userId, { 
      count: counties.length,
      filters: { regionId }
    });

    // Return counties array directly
    return res.status(200).json(counties);

  } catch (error) {
    logServerlessFunction('counties-get', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);