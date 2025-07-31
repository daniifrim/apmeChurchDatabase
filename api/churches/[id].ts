import { withAuth, requireRole } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseNumericParam } from '../../lib/utils';
import { insertChurchSchema } from '@shared/schema';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { Church, InsertChurch } from '@shared/schema';
import { z } from 'zod';

interface ChurchResponse {
  success?: boolean;
  data?: Church;
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchResponse | Church | void>
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
      return handleGetChurch(req, res, userId, churchId);
    case 'PUT':
      return handleUpdateChurch(req, res, userId, churchId);
    case 'DELETE':
      return handleDeleteChurch(req, res, userId, churchId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET, PUT, DELETE` 
      });
  }
}

async function handleGetChurch(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchResponse | Church>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('church-get', 'GET', userId, { churchId });

  try {
    const church = await serverlessStorage.getChurchById(churchId);
    
    if (!church) {
      logServerlessFunction('church-get', 'GET', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    logServerlessFunction('church-get', 'GET', userId, { 
      churchId, 
      churchName: church.name 
    });

    // Return church object directly (matching existing API contract)
    return res.status(200).json(church);

  } catch (error) {
    logServerlessFunction('church-get', 'GET', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleUpdateChurch(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchResponse | Church>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('church-update', 'PUT', userId, { churchId });

  try {
    // Check if church exists
    const existingChurch = await serverlessStorage.getChurchById(churchId);
    if (!existingChurch) {
      logServerlessFunction('church-update', 'PUT', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    // Validate and parse church data (partial update)
    const churchData = validateRequestBody(req.body, insertChurchSchema.partial());
    const updatedChurch = await serverlessStorage.updateChurch(churchId, churchData);

    // Create activity for church update
    await serverlessStorage.createActivity({
      churchId,
      userId,
      type: 'note',
      title: 'Church information updated',
      description: 'Church details were updated',
      activityDate: new Date(),
    });

    logServerlessFunction('church-update', 'PUT', userId, { 
      churchId,
      churchName: updatedChurch.name
    });

    // Return updated church object directly (matching existing API contract)
    return res.status(200).json(updatedChurch);

  } catch (error) {
    logServerlessFunction('church-update', 'PUT', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleDeleteChurch(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchResponse | void>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('church-delete', 'DELETE', userId, { churchId });

  try {
    // Check if user has administrator role
    const user = await serverlessStorage.getUser(userId);
    
    if (user?.role !== 'administrator') {
      logServerlessFunction('church-delete', 'DELETE', userId, { 
        churchId, 
        error: 'Insufficient permissions',
        userRole: user?.role 
      });
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    // Check if church exists
    const existingChurch = await serverlessStorage.getChurchById(churchId);
    if (!existingChurch) {
      logServerlessFunction('church-delete', 'DELETE', userId, { churchId, error: 'Church not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'Church not found' 
      });
    }

    await serverlessStorage.deleteChurch(churchId);

    logServerlessFunction('church-delete', 'DELETE', userId, { 
      churchId,
      churchName: existingChurch.name
    });

    // Return 204 No Content (matching existing API contract)
    return res.status(204).end();

  } catch (error) {
    logServerlessFunction('church-delete', 'DELETE', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);