import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { createSampleChurches } from '../../lib/sampleData';
import { handleServerlessError, validateMethod } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';
import type { User } from '@shared/schema';

interface UserResponse {
  success?: boolean;
  user?: User;
  message?: string;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<UserResponse | User>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Validate HTTP method
  if (!validateMethod(req, res, ['GET'])) return;

  const userId = req.user.sub;
  logServerlessFunction('user', req.method!, userId);

  try {
    let user = await serverlessStorage.getUser(userId);
    
    // Create dev user if not exists in development mode
    if (!user && process.env.NODE_ENV === 'development') {
      logServerlessFunction('user', 'GET', userId, { action: 'creating_dev_user' });
      
      user = await serverlessStorage.upsertUser({
        id: userId,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        role: 'administrator',
        region: 'Bucharest'
      });
    }
    
    // Add sample churches for development (check every time)
    if (process.env.NODE_ENV === 'development') {
      await createSampleChurches(userId, serverlessStorage);
    }
    
    if (!user) {
      logServerlessFunction('user', 'GET', userId, { error: 'User not found' });
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    logServerlessFunction('user', 'GET', userId, { success: true });
    
    // Return user data directly (matching existing API contract)
    return res.status(200).json(user);

  } catch (error) {
    logServerlessFunction('user', 'GET', userId, { error: error instanceof Error ? error.message : 'Unknown error' });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);