import { supabase } from '../../lib/auth';
import { handleServerlessError, validateMethod } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';

interface LogoutResponse {
  success: boolean;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogoutResponse>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Validate HTTP method
  if (!validateMethod(req, res, ['POST'])) return;

  // Extract user info from token for logging (optional)
  let userId: string | undefined;
  try {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }
  } catch {
    // Ignore errors in user extraction for logging
  }

  logServerlessFunction('logout', req.method!, userId);

  try {
    // For JWT-based auth, we primarily need to sign out from Supabase
    // The client will handle removing the token from localStorage
    
    // Extract token from Authorization header
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Sign out from Supabase (this invalidates the token)
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logServerlessFunction('logout', 'POST', userId, { error: error.message });
        console.error('Supabase logout error:', error);
        // Don't fail the logout if Supabase signout fails
        // The client can still remove the token locally
      }
    }

    logServerlessFunction('logout', 'POST', userId, { success: true });

    // Return success - client should remove token from localStorage
    return res.status(200).json({ 
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logServerlessFunction('logout', 'POST', userId, { error: error instanceof Error ? error.message : 'Unknown error' });
    return handleServerlessError(error, res);
  }
}