import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';



if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const authMiddleware: RequestHandler = async (req: any, res, next) => {
  // Development mode bypass
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      claims: {
        sub: 'dev-user-123',
        email: 'developer@apme.ro',
        first_name: 'Dev',
        last_name: 'User'
      }
    };
    req.isAuthenticated = () => true;
    return next();
  }

  // Check for session-based auth (temporary during migration)
  if (req.session && req.session.user) {
    req.user = req.session.user;
    req.isAuthenticated = () => true;
    return next();
  }

  // Check for Supabase JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }

    // Attach user to request
    req.user = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || ''
      }
    };
    req.isAuthenticated = () => true;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Unauthorized - Auth error' });
  }
};

export { supabase };