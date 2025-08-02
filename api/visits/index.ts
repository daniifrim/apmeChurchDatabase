import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateMethod } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';

interface VisitsResponse {
  success?: boolean;
  data?: any[];
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitsResponse | any[]>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;

  switch (req.method) {
    case 'GET':
      return handleGetAllVisits(req, res, userId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET` 
      });
  }
}

async function handleGetAllVisits(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitsResponse | any[]>,
  userId: string
) {
  logServerlessFunction('visits-get-all', 'GET', userId);

  try {
    // Get all visits with church information
    const visits = await serverlessStorage.getAllVisitsWithChurches();

    logServerlessFunction('visits-get-all', 'GET', userId, { 
      visitCount: visits.length
    });

    // Return visits array directly (matching existing API contract)
    return res.status(200).json(visits);

  } catch (error) {
    logServerlessFunction('visits-get-all', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);