import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseNumericParam } from '../../../lib/utils';
import { insertVisitSchema } from '@shared/schema';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { Visit, InsertVisit } from '@shared/schema';
import { z } from 'zod';

interface VisitsResponse {
  success?: boolean;
  data?: Visit[] | Visit;
  message?: string;
  errors?: any;
}

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

    // Validate and parse visit data
    const visitData = validateRequestBody({
      ...req.body,
      churchId,
      visitedBy: userId,
    }, insertVisitSchema);

    const visit = await serverlessStorage.createVisit(visitData);

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
      visitDate: visitData.visitDate
    });

    // Return visit object directly (matching existing API contract)
    return res.status(201).json(visit);

  } catch (error) {
    logServerlessFunction('visits-create', 'POST', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);