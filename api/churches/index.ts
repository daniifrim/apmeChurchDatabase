import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseQueryParam } from '../../lib/utils';
import { insertChurchSchema } from '@shared/schema';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { Church, InsertChurch } from '@shared/schema';
import { z } from 'zod';

interface ChurchesResponse {
  success?: boolean;
  data?: Church[] | Church;
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchesResponse | Church[] | Church>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;

  switch (req.method) {
    case 'GET':
      return handleGetChurches(req, res, userId);
    case 'POST':
      return handleCreateChurch(req, res, userId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET, POST` 
      });
  }
}

async function handleGetChurches(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchesResponse | Church[]>,
  userId: string
) {
  logServerlessFunction('churches-get', 'GET', userId);

  try {
    // Parse query parameters
    const search = parseQueryParam(req.query.search);
    const county = parseQueryParam(req.query.county);
    const engagementLevel = parseQueryParam(req.query.engagementLevel);

    const churches = await serverlessStorage.getChurches({
      search,
      county,
      engagementLevel,
    });

    logServerlessFunction('churches-get', 'GET', userId, { 
      count: churches.length,
      filters: { search, county, engagementLevel }
    });

    // Return churches array directly (matching existing API contract)
    return res.status(200).json(churches);

  } catch (error) {
    logServerlessFunction('churches-get', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleCreateChurch(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<ChurchesResponse | Church>,
  userId: string
) {
  logServerlessFunction('churches-create', 'POST', userId);

  try {
    // Validate and parse church data
    const churchData = validateRequestBody({
      ...req.body,
      createdBy: userId,
    }, insertChurchSchema);

    const church = await serverlessStorage.createChurch(churchData);

    // Create activity for church creation
    await serverlessStorage.createActivity({
      churchId: church.id,
      userId,
      type: 'note',
      title: 'Church added to database',
      description: `Church ${church.name} was added to the database`,
      activityDate: new Date(),
    });

    logServerlessFunction('churches-create', 'POST', userId, { 
      churchId: church.id,
      churchName: church.name
    });

    // Return church object directly (matching existing API contract)
    return res.status(201).json(church);

  } catch (error) {
    logServerlessFunction('churches-create', 'POST', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);