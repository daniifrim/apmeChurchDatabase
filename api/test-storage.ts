import { withAuth } from '../lib/auth';
import { serverlessStorage } from '../lib/storage';
import type { NextApiRequest, NextApiResponse } from '../lib/types';
import type { JWTPayload } from '../lib/auth';

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse
) {
  console.log('=== TEST-STORAGE HANDLER ===');
  console.log('Method:', req.method);
  
  try {
    // Test a simple storage operation
    const churches = await serverlessStorage.getChurches();
    
    return res.status(200).json({
      success: true,
      message: 'Storage test working',
      churchCount: churches.length
    });
  } catch (error) {
    console.error('Test storage error:', error);
    return res.status(500).json({
      success: false,
      message: 'Storage test error',
      error: String(error)
    });
  }
}

export default withAuth(handler);