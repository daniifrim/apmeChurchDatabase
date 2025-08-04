import { withAuth } from '../../lib/auth';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse
) {
  try {
    return res.status(200).json({
      success: true,
      nodeEnv: process.env.NODE_ENV,
      user: req.user,
      method: req.method,
      message: 'Debug endpoint working'
    });
  } catch (error) {
    console.error('Debug test error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

export default withAuth(handler);