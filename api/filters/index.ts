import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { County, RccpRegion } from '@shared/schema';

interface FiltersResponse {
  success?: boolean;
  data?: {
    counties: County[];
    regions: RccpRegion[];
    engagementLevels: string[];
  };
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<FiltersResponse>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;

  switch (req.method) {
    case 'GET':
      return handleGetFilters(req, res, userId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET` 
      });
  }
}

async function handleGetFilters(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<FiltersResponse>,
  userId: string
) {
  logServerlessFunction('filters-get', 'GET', userId);

  try {
    // Get all counties and regions for filter options
    const [counties, regions] = await Promise.all([
      serverlessStorage.getCounties(),
      serverlessStorage.getRccpRegions()
    ]);

    // Define available engagement levels
    const engagementLevels = ['high', 'medium', 'low', 'new'];

    const filterData = {
      counties,
      regions,
      engagementLevels
    };

    logServerlessFunction('filters-get', 'GET', userId, { 
      counties: counties.length,
      regions: regions.length,
      engagementLevels: engagementLevels.length
    });

    return res.status(200).json({
      success: true,
      data: filterData
    });

  } catch (error) {
    logServerlessFunction('filters-get', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);