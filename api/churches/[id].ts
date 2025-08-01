import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateRequestBody } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import { insertChurchSchema } from '@shared/schema';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { Church, InsertChurch } from '@shared/schema';

interface ChurchResponse {
  success?: boolean;
  data?: Church;
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchResponse | Church>
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
      return res.status(404).json({
        success: false,
        message: 'Church not found'
      });
    }

    logServerlessFunction('church-get', 'GET', userId, { 
      churchId,
      churchName: church.name
    });

    // Return church object directly
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
      churchId: updatedChurch.id,
      userId,
      type: 'note',
      title: 'Church information updated',
      description: `Church ${updatedChurch.name} information was updated`,
      activityDate: new Date(),
    });

    logServerlessFunction('church-update', 'PUT', userId, { 
      churchId,
      churchName: updatedChurch.name
    });

    // Return updated church object directly
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
  res: NextApiResponse<ChurchResponse>,
  userId: string,
  churchId: number
) {
  logServerlessFunction('church-delete', 'DELETE', userId, { churchId });

  try {
    // Check if church exists
    const existingChurch = await serverlessStorage.getChurchById(churchId);
    if (!existingChurch) {
      return res.status(404).json({
        success: false,
        message: 'Church not found'
      });
    }

    // Check if user has permission to delete (only administrators)
    if (req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete churches'
      });
    }

    await serverlessStorage.deleteChurch(churchId);

    // Create activity for church deletion
    await serverlessStorage.createActivity({
      churchId: existingChurch.id,
      userId,
      type: 'note',
      title: 'Church deactivated',
      description: `Church ${existingChurch.name} was deactivated`,
      activityDate: new Date(),
    });

    logServerlessFunction('church-delete', 'DELETE', userId, { 
      churchId,
      churchName: existingChurch.name
    });

    return res.status(200).json({
      success: true,
      message: 'Church deleted successfully'
    });

  } catch (error) {
    logServerlessFunction('church-delete', 'DELETE', userId, { 
      churchId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);