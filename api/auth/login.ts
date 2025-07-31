import { supabase } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { createSampleChurches } from '../../lib/sampleData';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction, createApiResponse } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import { z } from 'zod';

// Request validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginRequest = z.infer<typeof loginSchema>;

interface LoginResponse {
  success: boolean;
  user?: any;
  session?: any;
  fallback?: boolean;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Validate HTTP method
  if (!validateMethod(req, res, ['POST'])) return;

  logServerlessFunction('login', req.method!, undefined, { email: req.body?.email });

  try {
    // Validate request body
    const { email, password } = validateRequestBody(req.body, loginSchema);

    // Try Supabase auth first
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Fallback to hardcoded credentials during migration
      if (email === 'office@apme.ro' && password === 'admin 1234') {
        logServerlessFunction('login', 'POST', 'admin-user-001', { fallback: true });

        // Create or get admin user in database
        const adminUser = await serverlessStorage.upsertUser({
          id: 'admin-user-001',
          email: 'office@apme.ro',
          firstName: 'APME',
          lastName: 'Admin',
          role: 'administrator',
          region: 'Romania'
        });

        // Create sample churches for admin user
        await createSampleChurches('admin-user-001', serverlessStorage);

        // Return success with fallback flag
        return res.status(200).json({
          success: true,
          fallback: true,
          user: {
            id: 'admin-user-001',
            email: 'office@apme.ro',
            user_metadata: {
              first_name: 'APME',
              last_name: 'Admin',
              role: 'administrator',
            }
          },
          session: {
            access_token: 'fallback-token-admin-user-001',
            user: {
              id: 'admin-user-001',
              email: 'office@apme.ro',
            }
          }
        });
      }

      // Invalid credentials
      logServerlessFunction('login', 'POST', undefined, { error: 'Invalid credentials' });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    if (data.user) {
      logServerlessFunction('login', 'POST', data.user.id, { supabaseAuth: true });

      // Create or update user in our database
      await serverlessStorage.upsertUser({
        id: data.user.id,
        email: data.user.email!,
        firstName: data.user.user_metadata?.first_name || '',
        lastName: data.user.user_metadata?.last_name || '',
        role: 'missionary', // Default role
        region: 'Romania'
      });

      // Create sample churches for development
      if (process.env.NODE_ENV === 'development') {
        await createSampleChurches(data.user.id, serverlessStorage);
      }

      return res.status(200).json({
        success: true,
        user: data.user,
        session: data.session
      });
    }

    // Should not reach here, but handle edge case
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });

  } catch (error) {
    logServerlessFunction('login', 'POST', undefined, { error: error instanceof Error ? error.message : 'Unknown error' });
    return handleServerlessError(error, res);
  }
}