import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseNumericParam } from '../../../lib/utils';
import { insertActivitySchema } from '@shared/schema';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { Activity, InsertActivity } from '@shared/schema';
import { z } from 'zod';

interface ActivitiesResponse {
  success?: boolean;
  data?: Activity[] | Activity;
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ActivitiesResponse | Activity[] | Activity>
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
      return handleGetActivities(req, res, userId, churchId);
    case 'POST':
      return handleCreateActivity(req, res, userId, churchId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET, POST` 
      });
  }
}

async function handleGetActivities(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ActivitiesResponse | Activity[]>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('activities-get', 'GET', userId, { churchId });

  try {
    // Verify church exists
    const church = await serverlessStorage.getChurchById(churchId);
    if (!church) {
      logServerlessFunction('activities-get', 'GET', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    // Parse limit parameter
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const activities = await serverlessStorage.getActivitiesByChurch(churchId, limit);

    logServerlessFunction('activities-get', 'GET', userId, { 
      churchId,
      activityCount: activities.length,
      limit
    });

    // Return activities array directly (matching existing API contract)
    return res.status(200).json(activities);

  } catch (error) {
    logServerlessFunction('activities-get', 'GET', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleCreateActivity(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ActivitiesResponse | Activity>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('activities-create', 'POST', userId, { churchId });

  try {
    // Verify church exists
    const church = await serverlessStorage.getChurchById(churchId);
    if (!church) {
      logServerlessFunction('activities-create', 'POST', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    // Validate and parse activity data
    const activityData = validateRequestBody({
      ...req.body,
      churchId,
      userId,
    }, insertActivitySchema);

    const activity = await serverlessStorage.createActivity(activityData);

    logServerlessFunction('activities-create', 'POST', userId, { 
      churchId,
      activityId: activity.id,
      activityType: activity.type,
      activityTitle: activity.title
    });

    // Return activity object directly (matching existing API contract)
    return res.status(201).json(activity);

  } catch (error) {
    logServerlessFunction('activities-create', 'POST', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);