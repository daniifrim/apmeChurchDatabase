import { withAuth } from '../lib/auth';
import { serverlessStorage } from '../lib/storage';
import { handleServerlessError, validateRequestBody } from '../lib/errorHandler';
import { handleCors, logServerlessFunction, parseNumericParam } from '../lib/utils';
import { insertVisitSchema } from '@shared/schema';
import type { NextApiRequest, NextApiResponse } from '../lib/types';
import type { JWTPayload } from '../lib/auth';
import type { Visit, InsertVisit } from '@shared/schema';

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse
) {
  console.log('=== TEST-VISITS HANDLER ===');
  console.log('Method:', req.method);
  console.log('User:', req.user);
  
  try {
    return res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      method: req.method,
      user: req.user
    });
  } catch (error) {
    console.error('Test visits error:', error);
    return res.status(500).json({
      success: false,
      message: 'Test endpoint error',
      error: String(error)
    });
  }
}

export default withAuth(handler);