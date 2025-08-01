import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseQueryParam } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { Church, County, RccpRegion } from '@shared/schema';

interface SearchResponse {
  success?: boolean;
  data?: {
    churches: Church[];
    counties: County[];
    regions: RccpRegion[];
  };
  message?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<SearchResponse>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;

  switch (req.method) {
    case 'GET':
      return handleSearch(req, res, userId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET` 
      });
  }
}

async function handleSearch(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<SearchResponse>,
  userId: string
) {
  logServerlessFunction('search', 'GET', userId);

  try {
    const query = parseQueryParam(req.query.q);
    const type = parseQueryParam(req.query.type) || 'all'; // all, churches, counties, regions

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const results: {
      churches: Church[];
      counties: County[];
      regions: RccpRegion[];
    } = {
      churches: [],
      counties: [],
      regions: []
    };

    // Search churches
    if (type === 'all' || type === 'churches') {
      results.churches = await serverlessStorage.getChurches({
        search: query
      });
    }

    // Search counties
    if (type === 'all' || type === 'counties') {
      const allCounties = await serverlessStorage.getCounties();
      results.counties = allCounties.filter(county => 
        county.name.toLowerCase().includes(query.toLowerCase()) ||
        county.abbreviation.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Search regions
    if (type === 'all' || type === 'regions') {
      const allRegions = await serverlessStorage.getRccpRegions();
      results.regions = allRegions.filter(region => 
        region.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    logServerlessFunction('search', 'GET', userId, { 
      query,
      type,
      results: {
        churches: results.churches.length,
        counties: results.counties.length,
        regions: results.regions.length
      }
    });

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    logServerlessFunction('search', 'GET', userId, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);