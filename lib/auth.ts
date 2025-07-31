import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from './types';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  role: 'administrator' | 'missionary' | 'mobilizer';
  region: string;     // User's assigned region
  first_name: string;
  last_name: string;
  iat: number;        // Issued at
  exp: number;        // Expires at
}

/**
 * Validates a JWT token using Supabase auth
 */
export async function validateJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return {
      sub: user.id,
      email: user.email!,
      role: user.user_metadata?.role || 'missionary',
      region: user.user_metadata?.region || 'Romania',
      first_name: user.user_metadata?.first_name || '',
      last_name: user.user_metadata?.last_name || '',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

/**
 * Higher-order function to protect serverless API routes with authentication
 */
export function withAuth<T extends NextApiRequest>(
  handler: (req: T & { user: JWTPayload }, res: NextApiResponse) => Promise<void>
) {
  return async (req: T, res: NextApiResponse) => {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development') {
      (req as any).user = {
        sub: 'dev-user-123',
        email: 'developer@apme.ro',
        role: 'administrator',
        region: 'Romania',
        first_name: 'Dev',
        last_name: 'User',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      };
      return handler(req as T & { user: JWTPayload }, res);
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7);
    const user = await validateJWT(token);
    
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }

    // Attach user to request object
    (req as any).user = user;
    return handler(req as T & { user: JWTPayload }, res);
  };
}

/**
 * Utility function to check if user has required role
 */
export function requireRole(userRole: string, requiredRole: 'administrator' | 'missionary' | 'mobilizer'): boolean {
  const roleHierarchy = {
    'administrator': 3,
    'mobilizer': 2,
    'missionary': 1
  };
  
  return roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];
}

/**
 * Higher-order function to protect routes with role-based access
 */
export function withRole<T extends NextApiRequest>(
  requiredRole: 'administrator' | 'missionary' | 'mobilizer',
  handler: (req: T & { user: JWTPayload }, res: NextApiResponse) => Promise<void>
) {
  return withAuth<T>(async (req: T & { user: JWTPayload }, res: NextApiResponse) => {
    if (!requireRole(req.user.role, requiredRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    return handler(req, res);
  });
}

export { supabase };